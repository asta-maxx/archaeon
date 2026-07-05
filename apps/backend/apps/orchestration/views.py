"""Views for querying background processing job tasks execution and progress logs."""

from typing import Any
from rest_framework import viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.common.exceptions import standard_response
from apps.common.views import StandardResponseMixin
from apps.authentication.permissions import IsWorkspaceViewer
from apps.orchestration.models import ProcessingJob
from apps.orchestration.serializers import ProcessingJobSerializer


class ProcessingJobViewSet(StandardResponseMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet displaying execution status tracks and logs for background processing jobs."""

    serializer_class = ProcessingJobSerializer
    permission_classes = [IsWorkspaceViewer]

    def get_queryset(self) -> Any:
        """Filter processing jobs belonging to the target workspace."""
        workspace_id = self.kwargs.get("workspace_id")
        return ProcessingJob.objects.filter(workspace_id=workspace_id).select_related(
            "workspace", "project", "repository", "requested_by"
        )

    @extend_schema(
        summary="List Processing Jobs",
        description="Returns list of all background orchestration jobs within target workspace. Requires Viewer role.",
        responses={200: ProcessingJobSerializer(many=True)},
    )
    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Fetch listings of workspace processing jobs."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return standard_response(success=True, data=serializer.data)

    @extend_schema(
        summary="Retrieve Processing Job Detail",
        description="Returns status details and progress percentage for a background job. Requires Viewer role.",
        responses={200: ProcessingJobSerializer},
    )
    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Retrieve single processing job logs."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return standard_response(success=True, data=serializer.data)
