"""Views for Phase 11: Notifications & Alerts."""

import logging
from typing import Any
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.common.views import StandardResponseMixin
from apps.common.exceptions import standard_response
from apps.authentication.permissions import IsWorkspaceViewer
from .models import Notification
from .serializers import NotificationSerializer

logger = logging.getLogger("apps.notifications")


class WorkspaceNotificationViewSet(StandardResponseMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet displaying and marking read persistent alerts for authenticated workspace members."""

    serializer_class = NotificationSerializer
    permission_classes = [IsWorkspaceViewer]

    def get_queryset(self) -> Any:
        """Filter notifications for the workspace and current active authenticated user."""
        workspace_id = self.kwargs.get("workspace_id")
        return Notification.objects.filter(
            workspace_id=workspace_id,
            user=self.request.user
        )

    @extend_schema(
        summary="List Workspace Notifications",
        description="Returns list of alerts for the user inside the specified workspace.",
    )
    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Query standard model queryset representation."""
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Retrieve Workspace Notification Details",
        description="Returns notification detail fields for a single workspace notification.",
    )
    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Query standard single detail resource."""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Mark Notification as Read",
        description="Updates the is_read status field to true for the specified notification.",
        responses={200: NotificationSerializer},
    )
    @action(detail=True, methods=["post"], url_path="read")
    def mark_as_read(
        self, request: Request, workspace_id: Any = None, pk: Any = None
    ) -> Response:
        """Mark individual alert instance read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        
        serializer = self.get_serializer(notification)
        return standard_response(
            success=True,
            data=serializer.data,
        )

    @extend_schema(
        summary="Mark All Notifications as Read",
        description="Updates is_read field status values to true for all unread alerts of the current user.",
        responses={200: dict},
    )
    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_as_read(self, request: Request, workspace_id: Any = None) -> Response:
        """Batch update notifications status flag."""
        queryset = self.get_queryset().filter(is_read=False)
        count = queryset.update(is_read=True)

        return standard_response(
            success=True,
            data={"count": count, "message": f"Successfully marked {count} workspace notifications as read."},
            status_code=status.HTTP_200_OK,
        )


