"""Periodic cleanup tasks for system assets and expired model records."""

import logging
from celery import shared_task
from django.utils import timezone
from apps.workspaces.models import Invitation

logger = logging.getLogger("apps.common")


@shared_task
def cleanup_system_assets() -> None:
    """Scan and purge expired workspace invitations and transient metadata assets."""
    logger.info("Executing cleanup_system_assets periodic task...")
    now = timezone.now()

    # Purge unaccepted expired invitations
    deleted_count, _ = Invitation.objects.filter(
        expires_at__lt=now,
        is_accepted=False
    ).delete()

    logger.info("Successfully cleaned up %d expired workspace invitations.", deleted_count)
