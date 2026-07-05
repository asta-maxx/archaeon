"""Views exposing APIs for workspace architecture decisions memory, audit trails, and lineages."""

import logging
from typing import Any
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.common.views import StandardResponseMixin
from apps.common.exceptions import standard_response
from apps.authentication.models import Workspace
from apps.authentication.permissions import IsWorkspaceViewer, IsWorkspaceDeveloper
from apps.repositories.models import Repository, ArchitectureDecision, DecisionHistory
from apps.repositories.serializers import (
    ArchitectureDecisionSerializer,
    DecisionHistorySerializer,
)
from apps.graph.services import GraphService
from apps.memory.services import MemoryService

logger = logging.getLogger("apps.memory")


class WorkspaceDecisionViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    """ViewSet managing architecture decisions retrieval, lifecycles, and audit trails."""

    serializer_class = ArchitectureDecisionSerializer

    def get_permissions(self) -> Any:
        """Map access permissions based on role action."""
        if self.action in ["list", "retrieve", "superseded", "history", "supersession_chain", "module_decisions", "adr_constraints", "timeline"]:
            return [IsWorkspaceViewer()]
        return [IsWorkspaceDeveloper()]

    def get_queryset(self) -> Any:
        """Filter decisions belonging to repositories inside the workspace context."""
        workspace_id = self.kwargs.get("workspace_id")
        return ArchitectureDecision.objects.filter(
            repository__workspace_id=workspace_id
        ).prefetch_related("constraints", "alternatives", "history")

    @extend_schema(
        summary="List Active Decisions",
        description="Returns all active/non-superseded architecture decisions in the workspace.",
        responses={200: ArchitectureDecisionSerializer(many=True)},
    )
    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """List active architecture decisions."""
        queryset = self.get_queryset().filter(status="active")
        serializer = self.get_serializer(queryset, many=True)
        return standard_response(
            success=True,
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Create/Remember Decision",
        description="Creates a new architecture decision, logging the creation audit, syncing to Neo4j graph and indexing in Cognée.",
        responses={201: ArchitectureDecisionSerializer},
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Create a new decision (remember lifecycle)."""
        workspace_id = self.kwargs.get("workspace_id")
        workspace = get_object_or_404(Workspace, id=workspace_id)
        
        repository_id = request.data.get("repository_id")
        repository = get_object_or_404(Repository, id=repository_id, workspace=workspace)

        with transaction.atomic():
            decision = ArchitectureDecision.objects.create(
                repository=repository,
                title=request.data.get("title", ""),
                status="active",
                rationale=request.data.get("rationale", ""),
                module_name=request.data.get("module_name", ""),
                adr_source=request.data.get("adr_source", ""),
                developer_name=request.data.get("developer_name", ""),
                commit_hash=request.data.get("commit_hash", ""),
                pr_number=request.data.get("pr_number", ""),
                incident_key=request.data.get("incident_key", ""),
            )
            
            # Create constraints if provided
            constraints_list = request.data.get("constraints", [])
            for c_text in constraints_list:
                decision.constraints.create(constraint_text=c_text)

            # Create alternatives if provided
            alternatives_list = request.data.get("alternatives", [])
            for a_text in alternatives_list:
                decision.alternatives.create(alternative_text=a_text)

            # Log audit trail
            decision.history.create(
                action_type="CREATED",
                description=f"Decision created by user {request.user.email if request.user else 'system'}.",
            )

        # Sync to Neo4j Graph
        graph_srv = GraphService()
        graph_srv.sync_decision_to_graph(decision)

        # Index in Cognée Memory
        mem_srv = MemoryService()
        decision_text = f"Title: {decision.title}\nRationale: {decision.rationale}\nModule: {decision.module_name}"
        mem_srv.remember_decision(decision_text, dataset_name=f"workspace_{workspace.id}")

        # Broadcast in-app and email alert notification
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_workspace_members(
                workspace_id=str(workspace.id),
                title=f"New Decision Recorded: {decision.title}",
                message=f"Decision '{decision.title}' has been manually recorded in module '{decision.module_name}' by user '{request.user.email if request.user else 'system'}'.",
                trigger_email=True
            )
        except Exception as exc:
            logger.error("Failed to broadcast creation notifications: %s", str(exc))

        serializer = self.get_serializer(decision)
        return standard_response(
            success=True,
            data=serializer.data,
            status_code=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary="Improve/Update Decision",
        description="Updates an existing decision record, creating an audit log trail, syncing update to Neo4j and improve dataset in Cognée.",
        responses={200: ArchitectureDecisionSerializer},
    )
    def update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Update a decision in place (improve lifecycle)."""
        decision = self.get_object()
        
        with transaction.atomic():
            decision.title = request.data.get("title", decision.title)
            decision.rationale = request.data.get("rationale", decision.rationale)
            decision.status = request.data.get("status", decision.status)
            decision.module_name = request.data.get("module_name", decision.module_name)
            decision.adr_source = request.data.get("adr_source", decision.adr_source)
            decision.developer_name = request.data.get("developer_name", decision.developer_name)
            decision.commit_hash = request.data.get("commit_hash", decision.commit_hash)
            decision.pr_number = request.data.get("pr_number", decision.pr_number)
            decision.incident_key = request.data.get("incident_key", decision.incident_key)
            
            superseded_by_id = request.data.get("superseded_by_id")
            if superseded_by_id:
                superseded_by = get_object_or_404(ArchitectureDecision, id=superseded_by_id, repository__workspace_id=self.kwargs.get("workspace_id"))
                decision.superseded_by = superseded_by
                decision.status = "superseded"
                
            decision.save()

            # Record history
            decision.history.create(
                action_type="IMPROVED",
                description=f"Decision improved. Status set to: {decision.status}.",
            )

        # Sync update to Neo4j Graph
        graph_srv = GraphService()
        graph_srv.sync_decision_to_graph(decision)

        # Run Cognée Improve
        mem_srv = MemoryService()
        mem_srv.improve_dataset(dataset_name=f"workspace_{self.kwargs.get('workspace_id')}")

        # Broadcast in-app and email alert notification
        workspace_id = self.kwargs.get("workspace_id")
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_workspace_members(
                workspace_id=str(workspace_id),
                title=f"Decision Improved: {decision.title}",
                message=f"Decision '{decision.title}' has been modified and updated to status '{decision.status}'.",
                trigger_email=True
            )
        except Exception as exc:
            logger.error("Failed to broadcast update notifications: %s", str(exc))

        serializer = self.get_serializer(decision)
        return standard_response(
            success=True,
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="List Superseded Decisions",
        description="Returns decisions that have been forgotten/superseded in the workspace.",
        responses={200: ArchitectureDecisionSerializer(many=True)},
    )
    @action(detail=False, methods=["get"])
    def superseded(self, request: Request, workspace_id: Any = None) -> Response:
        """List superseded decisions."""
        queryset = self.get_queryset().filter(status="superseded")
        serializer = self.get_serializer(queryset, many=True)
        return standard_response(
            success=True,
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Forget/Supersede Decision",
        description="Flags a decision as superseded (forces status forgotten) and logs action history.",
        responses={200: dict},
    )
    @action(detail=True, methods=["post"])
    def forget(self, request: Request, workspace_id: Any = None, pk: Any = None) -> Response:
        """Mark a decision as superseded/forgotten."""
        decision = self.get_object()
        
        with transaction.atomic():
            decision.status = "superseded"
            decision.save()
            
            decision.history.create(
                action_type="SUPERSEDED",
                description="Decision marked superseded/forgotten.",
            )

        # Sync to Neo4j Graph
        graph_srv = GraphService()
        graph_srv.sync_decision_to_graph(decision)

        # Forget from Cognée dataset
        mem_srv = MemoryService()
        mem_srv.forget_dataset(dataset_name=f"workspace_{workspace_id}")

        # Broadcast in-app and email alert notification
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_workspace_members(
                workspace_id=str(workspace_id),
                title=f"Decision Archived: {decision.title}",
                message=f"Decision '{decision.title}' has been marked superseded and forgotten.",
                trigger_email=True
            )
        except Exception as exc:
            logger.error("Failed to broadcast forget notifications: %s", str(exc))

        return standard_response(
            success=True,
            data={"message": "Decision successfully marked superseded and archived."},
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Get Decision Audit History",
        description="Returns chronological log trail tracking state changes for this decision.",
        responses={200: DecisionHistorySerializer(many=True)},
    )
    @action(detail=True, methods=["get"])
    def history(self, request: Request, workspace_id: Any = None, pk: Any = None) -> Response:
        """Fetch audit log history for a specific decision."""
        decision = self.get_object()
        serializer = DecisionHistorySerializer(decision.history.all(), many=True)
        return standard_response(
            success=True,
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Get Decision Supersession Chain",
        description="Returns the supersession hierarchy showing decisions lineage.",
        responses={200: dict},
    )
    @action(detail=True, methods=["get"], url_path="supersession-chain")
    def supersession_chain(self, request: Request, workspace_id: Any = None, pk: Any = None) -> Response:
        """Retrieve replacement decision lineage tree."""
        decision = self.get_object()
        chain = []
        current = decision
        while current:
            chain.append({
                "id": str(current.id),
                "title": current.title,
                "status": current.status,
                "superseded_by": str(current.superseded_by.id) if current.superseded_by else None,
            })
            current = current.superseded_by

        return standard_response(
            success=True,
            data={"supersession_chain": chain},
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Get Decisions by Module",
        description="Filter workspace decisions affecting a specific component module.",
        responses={200: ArchitectureDecisionSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="module/(?P<module_name>[^/.]+)")
    def module_decisions(self, request: Request, workspace_id: Any = None, module_name: Any = None) -> Response:
        """Retrieve workspace decisions affecting a specific module."""
        queryset = self.get_queryset().filter(module_name__iexact=module_name)
        serializer = self.get_serializer(queryset, many=True)
        return standard_response(
            success=True,
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Get ADR Constraints",
        description="Returns constraints introduced in an ADR source identifier.",
        responses={200: dict},
    )
    @action(detail=False, methods=["get"], url_path="adr/(?P<adr_number>[^/.]+)/constraints")
    def adr_constraints(self, request: Request, workspace_id: Any = None, adr_number: Any = None) -> Response:
        """Fetch constraints introduced in a given ADR file/number."""
        # Find decisions matching the adr source identifier
        queryset = self.get_queryset().filter(adr_source__icontains=adr_number)
        
        constraints = []
        for dec in queryset:
            for constraint in dec.constraints.all():
                constraints.append({
                    "decision_id": str(dec.id),
                    "decision_title": dec.title,
                    "constraint": constraint.constraint_text,
                })

        return standard_response(
            success=True,
            data={"adr_number": adr_number, "constraints": constraints},
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Retrieve Workspace Timeline",
        description="Returns a global chronological event feed tracking decision updates and creation timelines.",
        responses={200: DecisionHistorySerializer(many=True)},
    )
    @action(detail=False, methods=["get"])
    def timeline(self, request: Request, workspace_id: Any = None) -> Response:
        """Returns chronological list of all audit events across workspace decisions."""
        events = DecisionHistory.objects.filter(
            decision__repository__workspace_id=workspace_id
        ).select_related("decision").order_by("-timestamp")
        
        # Format events nicely
        data = []
        for event in events:
            data.append({
                "id": str(event.id),
                "decision_id": str(event.decision.id),
                "decision_title": event.decision.title,
                "action_type": event.action_type,
                "description": event.description,
                "timestamp": event.timestamp,
            })
            
        return standard_response(
            success=True,
            data=data,
            status_code=status.HTTP_200_OK,
        )
