"""Asynchronous tasks for repository import and webhooks dispatch."""

import logging
import uuid
from typing import Any, Dict, List, Optional
from celery import shared_task
from django.db import transaction
from apps.common.exceptions import ServiceException
from apps.orchestration.models import ProcessingJob, JobStatus
from apps.orchestration.services import JobService
from apps.repositories.models import Repository, SyncStatus, ArchitectureDecision
from apps.repositories.services import RepositoryService
from apps.repositories.ris_client import RISClient
from apps.graph.services import GraphService
from apps.memory.services import MemoryService

logger = logging.getLogger("apps.repositories")

# Backoff configuration values: 5s, 15s, 45s, 2m, 5m
BACKOFFS = [5, 15, 45, 120, 300]


def persist_decisions(repository: Repository, decisions_data: List[Dict[str, Any]]) -> None:
    """Helper method to parse and sync decision structures to PostgreSQL, Neo4j, and Cognée."""
    graph_srv = GraphService()
    mem_srv = MemoryService()

    for dec_data in decisions_data:
        # Determine deterministic UUID or resolve ID returned by RIS
        decision_id_str = dec_data.get("id") or dec_data.get("decisionId")
        if not decision_id_str:
            decision_id = uuid.uuid4()
        else:
            try:
                decision_id = uuid.UUID(str(decision_id_str))
            except ValueError:
                decision_id = uuid.uuid4()

        title = dec_data.get("title", "Untitled Decision")
        rationale = dec_data.get("rationale", "")
        status = dec_data.get("status", "active")
        module_name = dec_data.get("module", "") or dec_data.get("module_name", "")
        adr_source = dec_data.get("adrSource") or dec_data.get("adr_source") or ""
        developer_name = dec_data.get("developer") or dec_data.get("developer_name") or ""
        commit_hash = dec_data.get("commit") or dec_data.get("commit_hash") or ""
        pr_number = dec_data.get("pullRequest") or dec_data.get("pr_number") or ""
        incident_key = dec_data.get("incident") or dec_data.get("incident_key") or ""

        with transaction.atomic():
            # Check if decision already exists
            decision, created = ArchitectureDecision.objects.update_or_create(
                id=decision_id,
                defaults={
                    "repository": repository,
                    "title": title,
                    "status": status,
                    "rationale": rationale,
                    "module_name": module_name,
                    "adr_source": adr_source,
                    "developer_name": developer_name,
                    "commit_hash": commit_hash,
                    "pr_number": pr_number,
                    "incident_key": incident_key,
                }
            )

            # Sync constraints
            constraints = dec_data.get("constraints", [])
            decision.constraints.all().delete()
            for c_text in constraints:
                decision.constraints.create(constraint_text=c_text)

            # Sync alternatives
            alternatives = dec_data.get("alternatives", [])
            decision.alternatives.all().delete()
            for a_text in alternatives:
                decision.alternatives.create(alternative_text=a_text)

            # Log audit trail history
            action_type = "CREATED" if created else "IMPROVED"
            decision.history.create(
                action_type=action_type,
                description="Synchronized from Repository Intelligence Service.",
            )

        # Mirror decision node and relationships to Neo4j
        graph_srv.sync_decision_to_graph(decision)

        # Index text context in Cognée semantic memory
        decision_text = f"Title: {decision.title}\nRationale: {decision.rationale}\nModule: {decision.module_name}"
        mem_srv.remember_decision(decision_text, dataset_name=f"workspace_{repository.workspace.id}")

    if decisions_data:
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_workspace_members(
                workspace_id=str(repository.workspace.id),
                title=f"Decisions Synced: {repository.name}",
                message=f"A batch of {len(decisions_data)} architecture decisions has been synchronized for {repository.name}.",
                trigger_email=True
            )
        except Exception as exc:
            logger.error("Failed to dispatch workspace notifications: %s", str(exc))


@shared_task(bind=True, max_retries=5)
def process_repository_import(self: Any, job_id: str) -> None:
    """Task executing outbound RIS triggers for repository imports with custom retry backoffs."""
    logger.info("Executing process_repository_import task for job: %s", job_id)

    try:
        job = ProcessingJob.objects.select_related(
            "workspace", "project", "repository", "requested_by"
        ).get(id=job_id)
    except ProcessingJob.DoesNotExist:
        logger.error("ProcessingJob %s not found. Skipping task execution.", job_id)
        return

    job_service = JobService()

    # 1. Idempotency: skip if already processed in SUCCESS state
    if job.status == JobStatus.SUCCESS:
        logger.info("Job %s already processed successfully. Skipping execution.", job_id)
        return

    # Update job to RUNNING state
    job_service.mark_running(job, celery_task_id=str(self.request.id))

    repository = job.repository
    if not repository:
        logger.error("Job %s has no repository linked. Terminating job.", job_id)
        job_service.mark_failed(job, error_message="No repository associated with this job.")
        return

    # Update repository to syncing state
    repository.sync_status = SyncStatus.SYNCING
    repository.save(update_fields=["sync_status", "updated_at"])

    try:
        # Update progress before call
        job_service.update_progress(job, progress=30)

        # Parse owner and name from repository coordinates
        parts = repository.full_name.split("/")
        owner = parts[0] if len(parts) > 0 else ""
        name = parts[1] if len(parts) > 1 else repository.name

        # Outbound call to RIS Client
        client = RISClient()
        data = client.analyze_repository(
            job_id=str(job.id),
            repo_owner=owner,
            repo_name=name,
            ref=repository.sync_branch,
            installation_id=repository.installation_id,
        )

        # Update progress before persistence
        job_service.update_progress(job, progress=60)

        # Persist analysis results
        decisions_data = data.get("decisions", [])
        persist_decisions(repository, decisions_data)

        # Update progress after persistence
        job_service.update_progress(job, progress=90)

        with transaction.atomic():
            repository.sync_status = SyncStatus.SYNCED
            repository.save(update_fields=["sync_status", "updated_at"])
            job_service.mark_success(job)

        logger.info("Successfully completed repository import for job: %s", job_id)

    except ServiceException as exc:
        # Check retry count limits
        retries = self.request.retries
        if retries < self.max_retries:
            countdown = BACKOFFS[min(retries, len(BACKOFFS) - 1)]
            logger.warning(
                "Transient error during import for job %s. Retrying in %d seconds (attempt %d/%d). Error: %s",
                job_id, countdown, retries + 1, self.max_retries, exc
            )
            # Record retry counter status
            job.retry_count = retries + 1
            job.save(update_fields=["retry_count", "updated_at"])

            self.retry(exc=exc, countdown=countdown)
        else:
            logger.error("Max retries exceeded for repository import job %s", job_id, exc_info=True)
            with transaction.atomic():
                repository.sync_status = SyncStatus.FAILED
                repository.save(update_fields=["sync_status", "updated_at"])
                job_service.mark_failed(job, error_message=f"Max retries exceeded. Error: {exc}")


@shared_task(bind=True)
def process_github_webhook(self: Any, event_type: str, payload: dict, job_id: Optional[str] = None) -> None:
    """Task wrapping background GitHub webhook event payload processing and updates."""
    logger.info("Executing process_github_webhook task for event: %s (job: %s)", event_type, job_id)

    job_service = JobService()
    job = None
    if job_id:
        try:
            job = ProcessingJob.objects.get(id=job_id)
            job_service.mark_running(job, celery_task_id=str(self.request.id))
        except ProcessingJob.DoesNotExist:
            logger.warning("ProcessingJob %s not found in webhook task.", job_id)

    srv = RepositoryService()
    try:
        if job:
            job_service.update_progress(job, progress=20)

        # Trigger metadata and repository updates
        srv.handle_webhook_payload(event_type, payload)

        if job:
            job_service.update_progress(job, progress=50)

        # Forward push events to RIS for analysis updates
        if event_type == "push":
            repo_id = str(payload.get("repository", {}).get("id") or "")
            installation_id = str(payload.get("installation", {}).get("id") or "")
            
            # Resolve target repository record
            repositories = Repository.objects.filter(github_id=repo_id)
            client = RISClient()
            
            # For each registered matching repository, trigger webhook update in RIS
            for repo in repositories:
                ris_result = client.forward_webhook(
                    job_id=job_id or str(uuid.uuid4()),
                    github_event=payload,
                    installation_id=installation_id,
                )
                
                # Persist decisions returned by RIS
                decisions_data = ris_result.get("decisions", [])
                persist_decisions(repo, decisions_data)

        if job:
            job_service.update_progress(job, progress=90)
            job_service.mark_success(job)

    except Exception as exc:
        logger.exception("Failed to process GitHub webhook task for event: %s", event_type)
        if job:
            job_service.mark_failed(job, error_message=str(exc))
        raise exc

