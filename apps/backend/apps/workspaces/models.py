"""Database models for Projects and Workspace Invitations."""

import uuid
from django.db import models
from django.utils import timezone
from apps.common.models import UUIDModel, TimestampModel, SoftDeleteModel
from apps.authentication.models import User, Workspace, RoleChoices


class Project(UUIDModel, TimestampModel, SoftDeleteModel):
    """Logical grouping of repositories and timelines inside a workspace."""

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="projects"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        """Meta options."""

        db_table = "projects"
        verbose_name = "Project"
        verbose_name_plural = "Projects"

    def __str__(self) -> str:
        """String representation of the project."""
        return str(self.name)


class Invitation(UUIDModel, TimestampModel):
    """Invitation sent to email addresses to join workspace organization."""

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="invitations"
    )
    inviter = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_invitations"
    )
    email = models.EmailField()
    role = models.CharField(
        max_length=50, choices=RoleChoices.choices, default=RoleChoices.VIEWER
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    is_accepted = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    class Meta:
        """Meta options."""

        db_table = "invitations"
        verbose_name = "Invitation"
        verbose_name_plural = "Invitations"

    def __str__(self) -> str:
        """String representation of the invitation."""
        return f"Invite for {self.email} to {self.workspace.name} as {self.role}"

    @property
    def is_expired(self) -> bool:
        """Check if invitation expiry datetime has passed."""
        return bool(timezone.now() > self.expires_at)
