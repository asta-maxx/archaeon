"""Database models for GitHub repositories configuration and metadata storage."""

from django.db import models
from apps.common.models import UUIDModel, TimestampModel, SoftDeleteModel
from apps.authentication.models import Workspace
from apps.workspaces.models import Project


class SyncStatus(models.TextChoices):
    """Enumeration of repository metadata synchronization states."""

    PENDING = "pending", "Pending"
    SYNCING = "syncing", "Syncing"
    SYNCED = "synced", "Synced"
    FAILED = "failed", "Failed"


class ProcessingStatus(models.TextChoices):
    """Enumeration of repository analysis/processing states."""

    IDLE = "idle", "Idle"
    QUEUED = "queued", "Queued"
    PROCESSING = "processing", "Processing"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class Repository(UUIDModel, TimestampModel, SoftDeleteModel):
    """Metadata representing linked GitHub repositories within workspaces context."""

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="repositories"
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        related_name="repositories",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    full_name = models.CharField(max_length=255)
    github_id = models.CharField(max_length=100, db_index=True)
    html_url = models.URLField()
    clone_url = models.URLField()
    default_branch = models.CharField(max_length=100, default="main")
    sync_branch = models.CharField(max_length=100, default="main")
    visibility = models.CharField(max_length=50, default="public")
    primary_language = models.CharField(max_length=100, blank=True, default="")
    installation_id = models.CharField(max_length=100, blank=True, default="")
    webhook_secret = models.CharField(max_length=255, blank=True, default="")
    sync_status = models.CharField(
        max_length=50, choices=SyncStatus.choices, default=SyncStatus.PENDING
    )
    processing_status = models.CharField(
        max_length=50, choices=ProcessingStatus.choices, default=ProcessingStatus.IDLE
    )

    class Meta:
        """Meta options."""

        db_table = "repositories"
        verbose_name = "Repository"
        verbose_name_plural = "Repositories"

    def __str__(self) -> str:
        """String representation of the repository."""
        return str(self.full_name)


class ArchitectureDecision(UUIDModel, TimestampModel, SoftDeleteModel):
    """Represents an architecture decision extracted from a repository."""

    repository = models.ForeignKey(
        Repository, on_delete=models.CASCADE, related_name="decisions"
    )
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=50, default="active")
    rationale = models.TextField(blank=True)
    module_name = models.CharField(max_length=255, blank=True, default="")
    adr_source = models.CharField(max_length=255, blank=True, default="")
    developer_name = models.CharField(max_length=255, blank=True, default="")
    commit_hash = models.CharField(max_length=100, blank=True, default="")
    pr_number = models.CharField(max_length=100, blank=True, default="")
    incident_key = models.CharField(max_length=100, blank=True, default="")
    superseded_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="supersedes",
    )

    class Meta:
        db_table = "architecture_decisions"
        verbose_name = "Architecture Decision"
        verbose_name_plural = "Architecture Decisions"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.status})"


class DecisionConstraint(UUIDModel, TimestampModel):
    """Represents constraints associated with an architecture decision."""

    decision = models.ForeignKey(
        ArchitectureDecision, on_delete=models.CASCADE, related_name="constraints"
    )
    constraint_text = models.TextField()

    class Meta:
        db_table = "decision_constraints"
        verbose_name = "Decision Constraint"
        verbose_name_plural = "Decision Constraints"


class DecisionAlternative(UUIDModel, TimestampModel):
    """Represents design alternatives considered for a decision."""

    decision = models.ForeignKey(
        ArchitectureDecision, on_delete=models.CASCADE, related_name="alternatives"
    )
    alternative_text = models.TextField()

    class Meta:
        db_table = "decision_alternatives"
        verbose_name = "Decision Alternative"
        verbose_name_plural = "Decision Alternatives"


class DecisionIncident(UUIDModel, TimestampModel):
    """Represents incidents linked to or mitigated by a decision."""

    decision = models.ForeignKey(
        ArchitectureDecision, on_delete=models.CASCADE, related_name="incidents"
    )
    incident_key = models.CharField(max_length=100)

    class Meta:
        db_table = "decision_incidents"
        verbose_name = "Decision Incident"
        verbose_name_plural = "Decision Incidents"


class DecisionHistory(UUIDModel):
    """Audit trail documenting states evolution for a decision."""

    decision = models.ForeignKey(
        ArchitectureDecision, on_delete=models.CASCADE, related_name="history"
    )
    action_type = models.CharField(max_length=50)  # e.g., CREATED, IMPROVED, SUPERSEDED
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "decision_history"
        verbose_name = "Decision History"
        verbose_name_plural = "Decision Histories"
        ordering = ["-timestamp"]

