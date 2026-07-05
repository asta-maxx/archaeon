"""Integration tests for Celery orchestration queues and tasks execution (Phase 6)."""

import pytest
import uuid
from typing import Any
from unittest.mock import patch, MagicMock
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from apps.common.exceptions import ServiceException
from apps.authentication.models import User, Workspace, Membership, RoleChoices
from apps.workspaces.models import Invitation
from apps.repositories.models import Repository, SyncStatus
from apps.orchestration.models import ProcessingJob, JobStatus, JobType
from apps.repositories.tasks import process_repository_import
from apps.common.tasks import cleanup_system_assets


@pytest.fixture
def auth_owner() -> User:
    """Fixture returning the workspace owner User."""
    return User.objects.create_user(email="owner@example.com", password="password123", name="Owner User")


@pytest.fixture
def auth_dev() -> User:
    """Fixture returning a workspace Developer User."""
    return User.objects.create_user(email="dev@example.com", password="password123", name="Dev User")


@pytest.fixture
def workspace(auth_owner: User) -> Workspace:
    """Fixture creating a Workspace owned by auth_owner."""
    workspace = Workspace.objects.create(name="Stark Industries", slug="stark-industries")
    Membership.objects.create(user=auth_owner, workspace=workspace, role=RoleChoices.OWNER)
    return workspace  # type: ignore[no-any-return]


@pytest.fixture
def workspace_with_team(workspace: Workspace, auth_dev: User) -> Workspace:
    """Fixture establishing a team inside the workspace."""
    Membership.objects.create(user=auth_dev, workspace=workspace, role=RoleChoices.DEVELOPER)
    return workspace


@pytest.fixture
def repository(workspace: Workspace) -> Repository:
    """Fixture creating a Repository metadata record."""
    return Repository.objects.create(  # type: ignore[no-any-return]
        workspace=workspace,
        name="mark-85",
        full_name="tony/mark-85",
        github_id="858585",
        html_url="https://github.com/tony/mark-85",
        clone_url="https://github.com/tony/mark-85.git",
        visibility="private",
    )


@pytest.fixture
def base_job(workspace: Workspace, repository: Repository, auth_owner: User) -> ProcessingJob:
    """Fixture creating a ProcessingJob tracker record."""
    return ProcessingJob.objects.create(  # type: ignore[no-any-return]
        workspace=workspace,
        repository=repository,
        job_type=str(JobType.REPOSITORY_IMPORT),
        status=JobStatus.PENDING,
        progress=0,
        requested_by=auth_owner,
    )


@pytest.fixture(autouse=True)
def mock_persistence_services() -> Any:
    """Mock GraphService and MemoryService to prevent database leaks in celery tests."""
    with patch("apps.graph.services.GraphService.sync_decision_to_graph") as mock_sync, \
         patch("apps.memory.services.MemoryService.remember_decision") as mock_remember, \
         patch("apps.memory.services.MemoryService.improve_dataset") as mock_improve:
        yield {"sync": mock_sync, "remember": mock_remember, "improve": mock_improve}


# ==========================================
# 1. Asynchronous Tasks & Lifecycles
# ==========================================

@pytest.mark.django_db
@patch("apps.repositories.tasks.RISClient.analyze_repository")
@patch("apps.repositories.tasks.RISClient.trigger_repository_processing")
def test_process_repository_import_task_success(
    mock_trigger: MagicMock, mock_analyze: MagicMock, base_job: ProcessingJob, settings: Any
) -> None:
    """Verify process_repository_import execution transitions state to SUCCESS."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    mock_analyze.return_value = {"status": "completed", "decisions": []}

    # Execute eager task execution
    process_repository_import(str(base_job.id))

    # Verify task successfully completed
    base_job.refresh_from_db()
    assert base_job.status == JobStatus.SUCCESS
    assert base_job.progress == 100
    assert base_job.completed_at is not None

    # Verify repository sync status updated
    repository = base_job.repository
    assert repository is not None
    assert repository.sync_status == SyncStatus.SYNCED
    mock_analyze.assert_called_once()


@pytest.mark.django_db
@patch("apps.repositories.tasks.RISClient.analyze_repository")
@patch("apps.repositories.tasks.RISClient.trigger_repository_processing")
@patch("apps.repositories.tasks.process_repository_import.retry")
def test_process_repository_import_task_retries(
    mock_retry: MagicMock, mock_trigger: MagicMock, mock_analyze: MagicMock, base_job: ProcessingJob, settings: Any
) -> None:
    """Verify task retry scheduling hooks up custom backoff list configs."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    # RIS client triggers failure to prompt retry
    mock_analyze.side_effect = ServiceException("RIS Service Timeout")

    # Mock retry to prevent inf loops
    mock_retry.side_effect = Exception("Retry Triggered")

    with pytest.raises(Exception) as exc:
        process_repository_import(str(base_job.id))

    assert "Retry Triggered" in str(exc.value)

    # Verify job retry counter incremented
    base_job.refresh_from_db()
    assert base_job.retry_count == 1

    # Verify Celery retry scheduled with 5s countdown
    args, kwargs = mock_retry.call_args
    assert kwargs["countdown"] == 5


# ==========================================
# 2. View Integration & Decoupling
# ==========================================

@pytest.mark.django_db
@patch("apps.repositories.tasks.RISClient.analyze_repository")
@patch("apps.repositories.tasks.RISClient.trigger_repository_processing")
def test_decoupled_repository_import_api(
    mock_trigger: MagicMock, mock_analyze: MagicMock, api_client: APIClient, workspace_with_team: Workspace, auth_dev: User, settings: Any
) -> None:
    """Verify import route registers jobs and returns 202 Accepted payload."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    api_client.force_authenticate(user=auth_dev)
    mock_analyze.return_value = {"status": "completed", "decisions": []}

    url = reverse("workspace-repositories-list", kwargs={"workspace_id": str(workspace_with_team.id)})
    import_data = {
        "name": "friday",
        "full_name": "tony/friday",
        "github_id": "999888",
        "html_url": "https://github.com/tony/friday",
        "clone_url": "https://github.com/tony/friday.git",
        "visibility": "public",
    }

    # API returns 202 ACCEPTED with the tracking ProcessingJob payload representation
    response = api_client.post(url, data=import_data)
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.json()["success"] is True
    assert "id" in response.json()["data"]
    assert response.json()["data"]["status"] == JobStatus.QUEUED


# ==========================================
# 3. Periodic Cleanup Tasks
# ==========================================

@pytest.mark.django_db
def test_cleanup_expired_invitations_task(workspace: Workspace, auth_owner: User) -> None:
    """Verify cleanup beat task deletes only invitations past expiration deadlines."""
    now = timezone.now()

    # Expired invitation
    inv1 = Invitation.objects.create(
        workspace=workspace,
        email="guest1@example.com",
        role=RoleChoices.VIEWER,
        inviter=auth_owner,
        token=str(uuid.uuid4()),
        expires_at=now - timezone.timedelta(hours=1),
        is_accepted=False,
    )

    # Active valid invitation
    inv2 = Invitation.objects.create(
        workspace=workspace,
        email="guest2@example.com",
        role=RoleChoices.VIEWER,
        inviter=auth_owner,
        token=str(uuid.uuid4()),
        expires_at=now + timezone.timedelta(hours=24),
        is_accepted=False,
    )

    cleanup_system_assets()

    # Verify expired invitation removed, active invitation retained
    assert Invitation.objects.filter(id=inv1.id).count() == 0
    assert Invitation.objects.filter(id=inv2.id).count() == 1
