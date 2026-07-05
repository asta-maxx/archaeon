"""Tests for the Orchestration Foundation module (Phase 5.5)."""

import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User, Workspace, Membership, RoleChoices
from apps.orchestration.models import ProcessingJob, JobStatus, JobType
from apps.orchestration.services import JobService
from apps.orchestration.dispatcher import JobDispatcher
from apps.common.exceptions import ServiceException


@pytest.fixture
def auth_owner() -> User:
    """Fixture returning the workspace owner User."""
    return User.objects.create_user(email="owner@example.com", password="password123", name="Owner User")


@pytest.fixture
def auth_viewer() -> User:
    """Fixture returning a workspace Viewer User."""
    return User.objects.create_user(email="viewer@example.com", password="password123", name="Viewer User")


@pytest.fixture
def workspace(auth_owner: User) -> Workspace:
    """Fixture creating a Workspace owned by auth_owner."""
    workspace = Workspace.objects.create(name="Stark Industries", slug="stark-industries")
    Membership.objects.create(user=auth_owner, workspace=workspace, role=RoleChoices.OWNER)
    return workspace  # type: ignore[no-any-return]


@pytest.fixture
def workspace_with_team(workspace: Workspace, auth_viewer: User) -> Workspace:
    """Fixture establishing a team inside the workspace."""
    Membership.objects.create(user=auth_viewer, workspace=workspace, role=RoleChoices.VIEWER)
    return workspace


@pytest.fixture
def base_job(workspace: Workspace, auth_owner: User) -> ProcessingJob:
    """Fixture creating a ProcessingJob tracker record."""
    return ProcessingJob.objects.create(  # type: ignore[no-any-return]
        workspace=workspace,
        job_type=JobType.REPOSITORY_IMPORT,
        status=JobStatus.PENDING,
        progress=0,
        requested_by=auth_owner,
    )


# ==========================================
# 1. JobService Unit Tests
# ==========================================

@pytest.mark.django_db
def test_job_service_creation_and_lifecycle(workspace: Workspace, auth_owner: User) -> None:
    """Verify JobService orchestrates status changes and state invariants."""
    srv = JobService()

    # 1. Create job
    job = srv.create_job(
        workspace=workspace,
        job_type=str(JobType.REPOSITORY_IMPORT),
        user=auth_owner,
        metadata={"repo_name": "mark-5"},
    )
    assert job.status == JobStatus.PENDING
    assert job.progress == 0
    assert job.metadata["repo_name"] == "mark-5"

    # 2. Mark running
    srv.mark_running(job, celery_task_id="celery_task_123")
    assert job.status == JobStatus.RUNNING
    assert job.celery_task_id == "celery_task_123"
    assert job.started_at is not None
    assert job.progress == 10  # default running progress start

    # 3. Update progress checks
    srv.update_progress(job, progress=45)
    assert job.progress == 45

    # 4. Mark success
    srv.mark_success(job)
    assert job.status == JobStatus.SUCCESS
    assert job.progress == 100
    assert job.completed_at is not None

    # 5. Prevent terminal status transition changes
    with pytest.raises(ServiceException) as excinfo:
        srv.update_progress(job, progress=50)
    assert "Cannot update state for completed job" in str(excinfo.value)


@pytest.mark.django_db
def test_job_service_validation_errors(base_job: ProcessingJob) -> None:
    """Verify JobService checks range percentage boundaries."""
    srv = JobService()

    # Progress out of limits raises ServiceException
    with pytest.raises(ServiceException):
        srv.update_progress(base_job, progress=110)

    with pytest.raises(ServiceException):
        srv.update_progress(base_job, progress=-5)


# ==========================================
# 2. JobDispatcher Wrapper Tests
# ==========================================

@pytest.mark.django_db
@patch("apps.repositories.tasks.process_repository_import.delay")
def test_job_dispatcher_repository_import(mock_delay: MagicMock, base_job: ProcessingJob) -> None:
    """Verify dispatcher queues Celery tasks and captures delay IDs."""
    # Setup mock delay return
    mock_result = MagicMock()
    mock_result.id = "mock_celery_task_id_999"
    mock_delay.return_value = mock_result

    dispatcher = JobDispatcher()
    dispatcher.dispatch_repository_import(base_job)

    # Verify job status bumped to QUEUED and celery ID captured
    base_job.refresh_from_db()
    assert base_job.status == JobStatus.QUEUED
    assert base_job.celery_task_id == "mock_celery_task_id_999"
    assert base_job.progress == 5

    # Verify Celery delay triggered with correct task arguments
    mock_delay.assert_called_once_with(str(base_job.id))


# ==========================================
# 3. Viewset API Integration Tests
# ==========================================

@pytest.mark.django_db
def test_processing_job_api_queries(
    api_client: APIClient, workspace_with_team: Workspace, base_job: ProcessingJob, auth_viewer: User
) -> None:
    """Verify read-only endpoints display background jobs logs."""
    api_client.force_authenticate(user=auth_viewer)

    # 1. List jobs
    url = reverse("workspace-jobs-list", kwargs={"workspace_id": str(workspace_with_team.id)})
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True
    assert len(response.json()["data"]["results"]) == 1
    assert response.json()["data"]["results"][0]["id"] == str(base_job.id)

    # 2. Detail retrieve job
    detail_url = reverse(
        "workspace-jobs-detail",
        kwargs={"workspace_id": str(workspace_with_team.id), "pk": str(base_job.id)},
    )
    response = api_client.get(detail_url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["data"]["status"] == JobStatus.PENDING
