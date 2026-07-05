"""Service classes for Phase 11: Notifications & Alerts."""

import logging
from typing import cast
from django.contrib.auth import get_user_model
from apps.common.services import BaseService
from apps.authentication.models import Membership
from .models import Notification
from .tasks import dispatch_notification

User = get_user_model()
logger = logging.getLogger("apps.notifications")


class NotificationService(BaseService[Notification]):
    """Service handling in-app persistent alerts creation and email workers."""

    @staticmethod
    def create_notification(
        workspace_id: str, user_id: str, title: str, message: str
    ) -> Notification:
        """Create and save an in-app user notification in PostgreSQL."""
        notification = Notification.objects.create(
            workspace_id=workspace_id,
            user_id=user_id,
            title=title,
            message=message,
        )
        return cast(Notification, notification)

    @classmethod
    def notify_workspace_members(
        cls, workspace_id: str, title: str, message: str, trigger_email: bool = True
    ) -> None:
        """Create notifications for all active members and enqueue email tasks."""
        # Retrieve active workspace memberships
        memberships = Membership.objects.filter(
            workspace_id=workspace_id, deleted_at__isnull=True
        ).select_related("user")

        logger.info(
            "Broadcasting notification to %d members in workspace %s: %s",
            memberships.count(),
            workspace_id,
            title,
        )

        for membership in memberships:
            user = membership.user
            # In-app persistent alert record
            cls.create_notification(workspace_id, str(user.id), title, message)
            
            # Offload email alerting to background workers
            if trigger_email and user.email:
                dispatch_notification.delay(
                    recipient_email=user.email,
                    subject=title,
                    body=message,
                )
                logger.debug(
                    "Enqueued background notification email for %s.", user.email
                )
        
        # Phase 12: Invalidate workspace analytics cache (notification summary count or feeds)
        from apps.common.caching import CacheInvalidator
        CacheInvalidator.invalidate_workspace_cache(workspace_id)
