"""Services for managing GitHub repositories linking, sync flows, and webhook verification."""

import logging
import hmac
import hashlib
from typing import Any, Dict
from django.conf import settings
from django.db import transaction
from apps.common.services import BaseService
from apps.common.exceptions import ServiceException
from apps.authentication.models import Workspace
from apps.repositories.models import Repository, SyncStatus, ProcessingStatus

logger = logging.getLogger("apps.repositories")


class RepositoryService(BaseService[Repository]):
    """Service class handling metadata synchronization, webhooks, and repository imports."""

    def import_repository(self, workspace: Workspace, data: Dict[str, Any]) -> Repository:
        """Link a new GitHub repository to the given Workspace."""
        github_id = str(data.get("github_id") or "")
        if not github_id:
            raise ServiceException("GitHub Repository ID is required.")

        # Prevent duplicate imports within the same workspace
        if Repository.objects.filter(workspace=workspace, github_id=github_id).exists():
            raise ServiceException("Repository is already linked to this workspace.")

        with transaction.atomic():
            repo = Repository.objects.create(
                workspace=workspace,
                project=data.get("project"),
                name=data.get("name", ""),
                full_name=data.get("full_name", ""),
                github_id=github_id,
                html_url=data.get("html_url", ""),
                clone_url=data.get("clone_url", ""),
                default_branch=data.get("default_branch", "main"),
                sync_branch=data.get("sync_branch", "main"),
                visibility=data.get("visibility", "public"),
                primary_language=data.get("primary_language", ""),
                installation_id=data.get("installation_id", ""),
                webhook_secret=data.get("webhook_secret", ""),
                sync_status=SyncStatus.PENDING,
                processing_status=ProcessingStatus.IDLE,
            )  # type: ignore[no-any-return]

        self.log_info("Successfully imported repository %s in workspace %s", repo.full_name, workspace.name)
        return repo  # type: ignore[no-any-return]

    def refresh_repository_metadata(self, repository: Repository) -> Repository:
        """Call external interfaces to refresh repository status indicators."""
        repository.sync_status = SyncStatus.SYNCING
        repository.save(update_fields=["sync_status", "updated_at"])

        # Simulate metadata refresh handshake (which will eventually be asynchronous)
        repository.sync_status = SyncStatus.SYNCED
        repository.save(update_fields=["sync_status", "updated_at"])

        self.log_info("Successfully synced metadata sync status for repository: %s", repository.full_name)
        return repository  # type: ignore[no-any-return]

    def verify_webhook_signature(self, signature_header: str, body_bytes: bytes) -> bool:
        """Validate request payload HMAC signature sent from GitHub."""
        if not signature_header or not signature_header.startswith("sha256="):
            return False

        webhook_secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", None) or "dummy_webhook_secret"
        received_sig = signature_header.split("sha256=")[-1]
        expected_sig = hmac.new(
            key=webhook_secret.encode("utf-8"),
            msg=body_bytes,
            digestmod=hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(received_sig, expected_sig)

    def handle_webhook_payload(self, event_type: str, payload: Dict[str, Any]) -> None:
        """Route and process webhook payload payloads sent from GitHub App."""
        self.log_info("Received GitHub App webhook event: %s", event_type)

        if event_type == "ping":
            return

        if event_type == "push":
            repo_id = str(payload.get("repository", {}).get("id") or "")
            if repo_id:
                # Triggers repo state update
                repositories = Repository.objects.filter(github_id=repo_id)
                for repo in repositories:
                    repo.processing_status = ProcessingStatus.QUEUED
                    repo.save(update_fields=["processing_status", "updated_at"])
                    self.log_info("Queued repository %s for re-analysis via push event", repo.full_name)
