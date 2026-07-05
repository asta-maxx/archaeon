"""Services for managing background processing job lifecycles and state transitions."""

import logging
from typing import Any, Dict, Optional
from django.utils import timezone
from django.db import transaction
from apps.common.services import BaseService
from apps.common.exceptions import ServiceException
from apps.authentication.models import User, Workspace
from apps.workspaces.models import Project
from apps.repositories.models import Repository
from apps.orchestration.models import ProcessingJob, JobStatus

logger = logging.getLogger("apps.orchestration")


class JobService(BaseService[ProcessingJob]):
    """Service governing ProcessingJob creation, execution progress tracking, and transitions safety."""

    def create_job(
        self,
        workspace: Workspace,
        job_type: str,
        project: Optional[Project] = None,
        repository: Optional[Repository] = None,
        user: Optional[User] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ProcessingJob:
        """Create a new job tracker record in PENDING state."""
        with transaction.atomic():
            job = ProcessingJob.objects.create(
                workspace=workspace,
                job_type=job_type,
                project=project,
                repository=repository,
                requested_by=user,
                status=JobStatus.PENDING,
                progress=0,
                metadata=metadata or {},
            )

        self.log_info(
            "Created %s ProcessingJob %s for workspace %s", job_type, job.id, workspace.name
        )
        return job  # type: ignore[no-any-return]

    def _verify_active_job(self, job: ProcessingJob) -> None:
        """Verify that the target job is not in a terminal state."""
        if job.status in [JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.CANCELLED]:
            raise ServiceException(
                f"Cannot update state for completed job {job.id} (current status: {job.status})."
            )

    def update_progress(
        self,
        job: ProcessingJob,
        progress: int,
        status: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> ProcessingJob:
        """Incrementally update job percentage completion and status indicators."""
        self._verify_active_job(job)

        if not (0 <= progress <= 100):
            raise ServiceException("Progress percentage must be between 0 and 100.")

        job.progress = progress
        update_fields = ["progress", "updated_at"]

        if status:
            job.status = status
            update_fields.append("status")
            if status in [JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.CANCELLED]:
                job.completed_at = timezone.now()
                update_fields.append("completed_at")

        if error_message is not None:
            job.error_message = error_message
            update_fields.append("error_message")

        job.save(update_fields=update_fields)
        self.log_info("Updated job %s progress to %d%% (status: %s)", job.id, progress, job.status)
        return job  # type: ignore[no-any-return]

    def mark_running(self, job: ProcessingJob, celery_task_id: str = "") -> ProcessingJob:
        """Transition job state to RUNNING and record execution identifier."""
        self._verify_active_job(job)

        job.status = JobStatus.RUNNING
        job.celery_task_id = celery_task_id
        job.started_at = timezone.now()
        job.progress = max(job.progress, 10)  # progress bump to indicate execution started

        job.save(update_fields=["status", "celery_task_id", "started_at", "progress", "updated_at"])
        self.log_info("Job %s is now running (task ID: %s)", job.id, celery_task_id)
        return job  # type: ignore[no-any-return]

    def mark_success(self, job: ProcessingJob) -> ProcessingJob:
        """Successfully terminate the processing job."""
        self._verify_active_job(job)

        job.status = JobStatus.SUCCESS
        job.progress = 100
        job.completed_at = timezone.now()

        job.save(update_fields=["status", "progress", "completed_at", "updated_at"])
        self.log_info("Job %s completed successfully", job.id)
        return job  # type: ignore[no-any-return]

    def mark_failed(self, job: ProcessingJob, error_message: str) -> ProcessingJob:
        """Mark processing job execution failed and record message diagnostics."""
        self._verify_active_job(job)

        job.status = JobStatus.FAILED
        job.error_message = error_message
        job.completed_at = timezone.now()

        job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
        logger.warning("Job %s failed with error: %s", job.id, error_message)
        return job  # type: ignore[no-any-return]

    def mark_cancelled(self, job: ProcessingJob) -> ProcessingJob:
        """Cancel the current processing job track execution."""
        self._verify_active_job(job)

        job.status = JobStatus.CANCELLED
        job.completed_at = timezone.now()

        job.save(update_fields=["status", "completed_at", "updated_at"])
        self.log_info("Job %s was cancelled", job.id)
        return job  # type: ignore[no-any-return]
