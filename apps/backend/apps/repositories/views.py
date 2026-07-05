"""Views for importing, syncing, and receiving webhooks for repositories."""

import logging
from typing import Any
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from apps.common.exceptions import standard_response
from apps.common.views import StandardResponseMixin
from apps.authentication.models import User, Workspace
from apps.workspaces.models import Project
from apps.authentication.permissions import IsWorkspaceDeveloper, IsWorkspaceViewer
from apps.repositories.models import Repository
from apps.repositories.services import RepositoryService
from apps.repositories.serializers import RepositorySerializer, RepositoryImportSerializer
from apps.orchestration.models import JobType
from apps.orchestration.services import JobService
from apps.orchestration.dispatcher import JobDispatcher
from apps.orchestration.serializers import ProcessingJobSerializer

logger = logging.getLogger("apps.repositories")


class RepositoryViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    """ViewSet handling CRUD actions and metadata sync checks for Workspace repositories."""

    serializer_class = RepositorySerializer

    def get_permissions(self) -> Any:
        """Map roles permissions to actions."""
        if self.action in ["list", "retrieve"]:
            return [IsWorkspaceViewer()]
        # Import, delete (unlink), and refresh metadata require Developer role
        return [IsWorkspaceDeveloper()]

    def get_queryset(self) -> Any:
        """Filter repositories belonging to the target workspace."""
        workspace_id = self.kwargs.get("workspace_id")
        return Repository.objects.filter(workspace_id=workspace_id).select_related("project")

    @extend_schema(
        summary="Import GitHub Repository",
        description="Imports and links a GitHub repository to the Workspace. Requires Developer role.",
        request=RepositoryImportSerializer,
        responses={202: ProcessingJobSerializer},
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Link repository metadata and trigger background sync job."""
        workspace_id = self.kwargs.get("workspace_id")
        workspace = get_object_or_404(Workspace, id=workspace_id)

        serializer = RepositoryImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # If project_id is provided, resolve and verify project inside workspace
        project_id = data.pop("project_id", None)
        project = None
        if project_id:
            project = get_object_or_404(Project, id=project_id, workspace=workspace)

        data["project"] = project
        srv = RepositoryService()
        repo = srv.import_repository(workspace, data)

        # Create background ProcessingJob
        job_service = JobService()
        job = job_service.create_job(
            workspace=workspace,
            job_type=str(JobType.REPOSITORY_IMPORT),
            project=project,
            repository=repo,
            user=request.user if isinstance(request.user, User) else None,
        )

        # Dispatch task asynchronously
        dispatcher = JobDispatcher()
        dispatcher.dispatch_repository_import(job)

        return standard_response(
            success=True,
            data=ProcessingJobSerializer(job).data,
            status_code=status.HTTP_202_ACCEPTED,
        )

    @extend_schema(
        summary="Delete Repository Link",
        description="Soft deletes/unlinks the repository from the workspace. Requires Developer role.",
        responses={200: dict},
    )
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Perform soft delete on repository metadata configuration."""
        repo = self.get_object()
        repo.delete()
        logger.info("Soft deleted repository relation: %s", repo.full_name)
        return standard_response(
            success=True,
            data={"message": "Repository successfully unlinked."},
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Refresh Repository Metadata",
        description="Triggers synchronization check to refresh branch and visibility. Requires Developer role.",
        responses={200: RepositorySerializer},
    )
    @action(detail=True, methods=["post"])
    def refresh(self, request: Request, workspace_id: Any = None, pk: Any = None) -> Response:
        """Refresh current synchronization tracking identifiers."""
        repo = self.get_object()
        srv = RepositoryService()
        repo = srv.refresh_repository_metadata(repo)
        return standard_response(
            success=True,
            data=RepositorySerializer(repo).data,
            status_code=status.HTTP_200_OK,
        )


class GitHubWebhookView(APIView):
    """Public endpoint to receive and verify incoming GitHub App Webhooks."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Ingest GitHub Webhook",
        description="Receives GitHub webhook updates, verifying payload authenticity with HMAC-SHA256 signature.",
        request=None,
        responses={200: dict},
    )
    def post(self, request: Request) -> Response:
        """Intercept, verify signatures, and queue webhook event dispatch."""
        signature = request.headers.get("X-Hub-Signature-256") or ""
        body_bytes = request.body

        srv = RepositoryService()
        if not srv.verify_webhook_signature(signature, body_bytes):
            logger.warning("Rejected invalid GitHub App webhook signature request.")
            return Response(
                {"success": False, "error": "Invalid payload HMAC signature header verification failed."},
                status=status.HTTP_403_FORBIDDEN,
            )

        event_type = request.headers.get("X-GitHub-Event") or "ping"
        repo_id = str(request.data.get("repository", {}).get("id") or "")

        if repo_id and event_type != "ping":
            repositories = Repository.objects.filter(github_id=repo_id).select_related("workspace")
            job_service = JobService()
            dispatcher = JobDispatcher()

            for repo in repositories:
                job = job_service.create_job(
                    workspace=repo.workspace,
                    job_type=str(JobType.WEBHOOK),
                    project=repo.project,
                    repository=repo,
                    metadata={"event_type": event_type, "payload": request.data},
                )
                dispatcher.dispatch_webhook(job, event_type, request.data)
        else:
            srv.handle_webhook_payload(event_type, request.data)

        return Response(
            {"success": True, "message": "Event payload accepted and queued successfully."},
            status=status.HTTP_200_OK,
        )
