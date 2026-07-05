"""Views for Phase 10: Analytics & Dashboard APIs."""

import logging
from typing import Any
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.common.views import StandardResponseMixin
from apps.common.exceptions import standard_response
from apps.authentication.models import Workspace
from apps.authentication.permissions import IsWorkspaceViewer
from apps.repositories.models import ArchitectureDecision, DecisionConstraint, DecisionAlternative
from .serializers import (
    WorkspaceAnalyticsSummarySerializer,
    ModuleBreakdownSerializer,
    DeveloperBreakdownSerializer,
    DecisionTrendSerializer,
)

logger = logging.getLogger("apps.analytics")


class WorkspaceAnalyticsSummaryView(StandardResponseMixin, APIView):
    """View compiling workspace decision statistics and overall totals."""

    permission_classes = [IsWorkspaceViewer]

    @extend_schema(
        summary="Workspace Analytics Summary",
        description="Returns overall metrics of decisions, constraints, alternatives, and incidents in a workspace.",
        responses={200: WorkspaceAnalyticsSummarySerializer},
    )
    def get(self, request: Request, workspace_id: Any = None) -> Response:
        """Query and return summary aggregation metrics for a workspace."""
        workspace = get_object_or_404(Workspace, id=workspace_id)
        
        # Phase 12 caching check
        cache_key = f"workspace_analytics_summary_{workspace.id}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            logger.info("Serving workspace analytics summary from cache for %s", workspace.id)
            return standard_response(
                success=True,
                data=cached_data,
                status_code=status.HTTP_200_OK,
            )

        decisions = ArchitectureDecision.objects.filter(repository__workspace_id=workspace.id)
        total_decisions = decisions.count()

        # Aggregate status counts
        status_counts = decisions.values("status").annotate(count=Count("id"))
        status_dist = {"active": 0, "superseded": 0, "deprecated": 0}
        for item in status_counts:
            status_name = item["status"]
            if status_name in status_dist:
                status_dist[status_name] = item["count"]

        # Aggregate constraints & alternatives
        total_constraints = DecisionConstraint.objects.filter(
            decision__repository__workspace_id=workspace.id
        ).count()
        total_alternatives = DecisionAlternative.objects.filter(
            decision__repository__workspace_id=workspace.id
        ).count()

        # Aggregate unique incident keys
        total_incidents = (
            decisions.exclude(incident_key="")
            .values("incident_key")
            .distinct()
            .count()
        )

        data = {
            "total_decisions": total_decisions,
            "status_distribution": status_dist,
            "total_constraints": total_constraints,
            "total_alternatives": total_alternatives,
            "total_incidents_mitigated": total_incidents,
        }

        # Cache analytics summary for 1 hour
        cache.set(cache_key, data, timeout=3600)

        return standard_response(
            success=True,
            data=data,
            status_code=status.HTTP_200_OK,
        )


class WorkspaceAnalyticsModuleBreakdownView(StandardResponseMixin, APIView):
    """View summarizing decision density across codebase modules."""

    permission_classes = [IsWorkspaceViewer]

    @extend_schema(
        summary="Workspace Decisions Module Breakdown",
        description="Returns the counts of decisions grouped by module name, ordered descending.",
        responses={200: ModuleBreakdownSerializer(many=True)},
    )
    def get(self, request: Request, workspace_id: Any = None) -> Response:
        """Query decisions count grouped by module name."""
        workspace = get_object_or_404(Workspace, id=workspace_id)

        decisions = ArchitectureDecision.objects.filter(repository__workspace_id=workspace.id)
        breakdown = (
            decisions.values("module_name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        data = [
            {"module_name": item["module_name"], "count": item["count"]}
            for item in breakdown
        ]

        return standard_response(
            success=True,
            data=data,
            status_code=status.HTTP_200_OK,
        )


class WorkspaceAnalyticsDeveloperBreakdownView(StandardResponseMixin, APIView):
    """View summarizing decision counts grouped by authors/developers."""

    permission_classes = [IsWorkspaceViewer]

    @extend_schema(
        summary="Workspace Decisions Developer Breakdown",
        description="Returns the counts of decisions grouped by developer name, ordered descending.",
        responses={200: DeveloperBreakdownSerializer(many=True)},
    )
    def get(self, request: Request, workspace_id: Any = None) -> Response:
        """Query decisions count grouped by developer."""
        workspace = get_object_or_404(Workspace, id=workspace_id)

        decisions = ArchitectureDecision.objects.filter(repository__workspace_id=workspace.id)
        breakdown = (
            decisions.values("developer_name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        data = [
            {"developer_name": item["developer_name"], "count": item["count"]}
            for item in breakdown
        ]

        return standard_response(
            success=True,
            data=data,
            status_code=status.HTTP_200_OK,
        )


class WorkspaceAnalyticsTrendView(StandardResponseMixin, APIView):
    """View demonstrating decisions historical creation speed."""

    permission_classes = [IsWorkspaceViewer]

    @extend_schema(
        summary="Workspace Decisions Historical Trend",
        description="Returns decision creation count grouped by month.",
        responses={200: DecisionTrendSerializer(many=True)},
    )
    def get(self, request: Request, workspace_id: Any = None) -> Response:
        """Query decision creation velocity timeline."""
        workspace = get_object_or_404(Workspace, id=workspace_id)

        decisions = ArchitectureDecision.objects.filter(repository__workspace_id=workspace.id)
        trends = (
            decisions.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )

        data = []
        for item in trends:
            month_val = item["month"]
            if month_val:
                month_str = month_val.strftime("%Y-%m")
            else:
                month_str = "Unknown"
            data.append({"month": month_str, "count": item["count"]})

        return standard_response(
            success=True,
            data=data,
            status_code=status.HTTP_200_OK,
        )
