"""Client interface for communicating with the Repository Intelligence Service (RIS)."""

import logging
from typing import Any, Dict, Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
from django.conf import settings
from apps.common.exceptions import ServiceException
from apps.authentication.models import User
from apps.repositories.models import Repository

logger = logging.getLogger("apps.repositories")


class RISClient:
    """HTTP client communicating with the Repository Intelligence Service endpoints."""

    def __init__(self) -> None:
        """Initialize session adapter with retry parameters."""
        self.session = requests.Session()
        # Setup 3 retries with backoff factor
        retries = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
            raise_on_status=False,
        )
        self.session.mount("http://", HTTPAdapter(max_retries=retries))
        self.session.mount("https://", HTTPAdapter(max_retries=retries))

    def trigger_repository_processing(
        self, repository: Repository, user: Optional[User] = None, webhook_type: str = "import"
    ) -> Dict[str, Any]:
        """Legacy trigger method maintaining backward compatibility for existing tests."""
        base_url = getattr(settings, "INTELLIGENCE_SERVICE_URL", "http://localhost:8001")
        url = f"{base_url.rstrip('/')}/internal/repository/process"

        payload = {
            "repository": {
                "id": str(repository.id),
                "github_id": repository.github_id,
                "name": repository.name,
                "full_name": repository.full_name,
                "clone_url": repository.clone_url,
                "sync_branch": repository.sync_branch,
                "visibility": repository.visibility,
                "primary_language": repository.primary_language,
            },
            "workspace": {
                "id": str(repository.workspace.id),
                "name": repository.workspace.name,
                "slug": repository.workspace.slug,
            },
            "project": {
                "id": str(repository.project.id) if repository.project else None,
                "name": repository.project.name if repository.project else None,
            },
            "user": {
                "id": str(user.id) if user else None,
                "email": user.email if user else None,
            },
            "webhook_type": webhook_type,
        }

        api_key = getattr(settings, "INTERNAL_API_KEY", "")
        headers = {
            "X-Internal-API-Key": api_key,
            "Content-Type": "application/json",
        }

        logger.info(
            "Triggering RIS processing for repo %s (URL: %s)", repository.full_name, url
        )

        try:
            response = self.session.post(url, json=payload, headers=headers, timeout=10.0)

            if response.status_code != 200:
                logger.error(
                    "RIS service returned error code %d: %s", response.status_code, response.text
                )
                raise ServiceException(
                    f"Intelligence Service process trigger failed with code {response.status_code}."
                )

            data = response.json()
            logger.info("Successfully triggered RIS process for repo %s", repository.full_name)
            return data  # type: ignore[no-any-return]

        except requests.RequestException as exc:
            logger.exception("Failed to connect to RIS service at %s", url)
            raise ServiceException(f"Failed to communicate with Intelligence Service: {exc}")

    def analyze_repository(
        self, job_id: str, repo_owner: str, repo_name: str, ref: str = "main", installation_id: str = ""
    ) -> Dict[str, Any]:
        """Trigger code parsing and architecture analysis on the RIS service (v1/analyze)."""
        base_url = getattr(settings, "INTELLIGENCE_SERVICE_URL", "http://localhost:8001")
        url = f"{base_url.rstrip('/')}/internal/v1/analyze"

        payload = {
            "jobId": job_id,
            "repository": {
                "owner": repo_owner,
                "name": repo_name,
                "ref": ref,
                "installationId": installation_id,
            }
        }

        api_key = getattr(settings, "INTERNAL_API_KEY", "")
        headers = {
            "X-Internal-API-Key": api_key,
            "Content-Type": "application/json",
        }

        logger.info("Triggering RIS analyze for job %s (URL: %s)", job_id, url)

        try:
            response = self.session.post(url, json=payload, headers=headers, timeout=10.0)

            if response.status_code != 200:
                logger.error("RIS analyze returned error code %d: %s", response.status_code, response.text)
                raise ServiceException(f"RIS analyze failed with code {response.status_code}.")

            data = response.json()
            logger.info("Successfully triggered RIS analyze for job %s", job_id)
            return data  # type: ignore[no-any-return]
        except requests.RequestException as exc:
            logger.exception("Failed to connect to RIS service at %s", url)
            raise ServiceException(f"Failed to communicate with Intelligence Service: {exc}")

    def forward_webhook(
        self, job_id: str, github_event: Dict[str, Any], installation_id: str = ""
    ) -> Dict[str, Any]:
        """Forward a GitHub webhook event payload to the RIS service (v1/webhook)."""
        base_url = getattr(settings, "INTELLIGENCE_SERVICE_URL", "http://localhost:8001")
        url = f"{base_url.rstrip('/')}/internal/v1/webhook"

        payload = {
            "jobId": job_id,
            "githubEvent": github_event,
            "installationId": installation_id,
        }

        api_key = getattr(settings, "INTERNAL_API_KEY", "")
        headers = {
            "X-Internal-API-Key": api_key,
            "Content-Type": "application/json",
        }

        logger.info("Triggering RIS webhook forward for job %s (URL: %s)", job_id, url)

        try:
            response = self.session.post(url, json=payload, headers=headers, timeout=10.0)

            if response.status_code != 200:
                logger.error("RIS webhook returned error code %d: %s", response.status_code, response.text)
                raise ServiceException(f"RIS webhook failed with code {response.status_code}.")

            data = response.json()
            logger.info("Successfully triggered RIS webhook for job %s", job_id)
            return data  # type: ignore[no-any-return]
        except requests.RequestException as exc:
            logger.exception("Failed to connect to RIS service at %s", url)
            raise ServiceException(f"Failed to communicate with Intelligence Service: {exc}")

