"""Dispatcher wrapper centralizing Celery delays executions and task track IDs recording."""

import logging
from apps.orchestration.models import ProcessingJob, JobStatus
from apps.orchestration.services import JobService

# Celery tasks imports
from apps.repositories.tasks import process_repository_import, process_github_webhook
from apps.graph.tasks import update_graph_timeline

logger = logging.getLogger("apps.orchestration")


class JobDispatcher:
    """Central manager delegating processing job actions to targeted Celery workers."""

    def __init__(self) -> None:
        """Initialize job manager helper."""
        self.job_service = JobService()

    def dispatch_repository_import(self, job: ProcessingJob) -> None:
        """Queue the repository metadata import analysis background task."""
        self.job_service.update_progress(job, progress=5, status=str(JobStatus.QUEUED))

        # Trigger Celery delay call
        result = process_repository_import.delay(str(job.id))

        # Record task identifier
        job.celery_task_id = result.id
        job.save(update_fields=["celery_task_id", "updated_at"])
        logger.info("Dispatched repository import task %s for job %s", result.id, job.id)

    def dispatch_webhook(self, job: ProcessingJob, event_type: str, payload: dict) -> None:
        """Queue the incoming webhook payload asynchronous handling task."""
        self.job_service.update_progress(job, progress=5, status=str(JobStatus.QUEUED))

        result = process_github_webhook.delay(event_type, payload, job_id=str(job.id))

        job.celery_task_id = result.id
        job.save(update_fields=["celery_task_id", "updated_at"])
        logger.info("Dispatched webhook process task %s for job %s", result.id, job.id)

    def dispatch_graph_update(self, job: ProcessingJob, repository_id: str) -> None:
        """Queue the background timeline relationships neo4j update task."""
        self.job_service.update_progress(job, progress=5, status=str(JobStatus.QUEUED))

        result = update_graph_timeline.delay(repository_id)

        job.celery_task_id = result.id
        job.save(update_fields=["celery_task_id", "updated_at"])
        logger.info("Dispatched graph updates task %s for job %s", result.id, job.id)
