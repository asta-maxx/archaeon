from django.db import models
from django.contrib.auth import get_user_model
from apps.common.models import UUIDModel, TimestampModel
from apps.authentication.models import Workspace

User = get_user_model()


class Notification(UUIDModel, TimestampModel):
    """Notification structure storing user alerts in workspace boundaries."""

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="notifications"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)

    class Meta:
        """Meta options."""

        db_table = "notifications"
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self) -> str:
        """String representation of the notification."""
        return f"Notification for {self.user.email} in {self.workspace.name}: {self.title}"
