"""Database models for background task execution tracking and orchestration status."""

from django.db import models
from apps.common.models import UUIDModel, TimestampModel, SoftDeleteModel
from apps.authentication.models import User, Workspace
from apps.workspaces.models import Project
from apps.repositories.models import Repository


class JobStatus(models.TextChoices):
    """Execution status states for a processing job."""

    PENDING = "pending", "Pending"
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    SUCCESS = "success", "Success"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class JobType(models.TextChoices):
    """Categorized type triggers of orchestration processing tasks."""

    REPOSITORY_IMPORT = "repository_import", "Repository Import"
    WEBHOOK = "webhook", "Webhook Dispatch"
    GRAPH_UPDATE = "graph_update", "Graph Timeline Update"
    MEMORY_UPDATE = "memory_update", "Memory Graph Sync"
    NOTIFICATION = "notification", "Notification Dispatch"


class ProcessingJob(UUIDModel, TimestampModel, SoftDeleteModel):
    """Orchestration metadata representing asynchronous job lifecycles and diagnostics."""

    job_type = models.CharField(max_length=50, choices=JobType.choices)
    status = models.CharField(max_length=50, choices=JobStatus.choices, default=JobStatus.PENDING)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="processing_jobs"
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        related_name="processing_jobs",
        null=True,
        blank=True,
    )
    repository = models.ForeignKey(
        Repository,
        on_delete=models.SET_NULL,
        related_name="processing_jobs",
        null=True,
        blank=True,
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="processing_jobs",
        null=True,
        blank=True,
    )
    celery_task_id = models.CharField(max_length=255, blank=True, default="")
    progress = models.IntegerField(default=0)  # 0 to 100
    retry_count = models.IntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        """Meta options."""

        db_table = "processing_jobs"
        verbose_name = "Processing Job"
        verbose_name_plural = "Processing Jobs"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        """String representation of the processing job."""
        return f"{self.job_type} - {self.status} ({self.progress}%)"
