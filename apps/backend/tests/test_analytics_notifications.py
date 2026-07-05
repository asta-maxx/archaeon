"""Integration tests for Phase 10: Analytics, Phase 11: Notifications, and Phase 12: Caching."""

import pytest
from typing import Any, cast
from unittest.mock import patch
from django.urls import reverse
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import User, Workspace, Membership, RoleChoices
from apps.repositories.models import Repository, ArchitectureDecision
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService


@pytest.fixture
def auth_owner() -> User:
    """Fixture returning workspace owner User."""
    return User.objects.create_user(email="owner@example.com", password="password123", name="Owner User")


@pytest.fixture
def auth_viewer() -> User:
    """Fixture returning workspace viewer User."""
    return User.objects.create_user(email="viewer@example.com", password="password123", name="Viewer User")


@pytest.fixture
def other_user() -> User:
    """Fixture returning another User not associated with the workspace."""
    return User.objects.create_user(email="other@example.com", password="password123", name="Other User")


@pytest.fixture
def workspace(auth_owner: User, auth_viewer: User) -> Workspace:
    """Fixture creating Workspace and membership allocations."""
    workspace = Workspace.objects.create(name="Stark Industries", slug="stark-ind")
    Membership.objects.create(user=auth_owner, workspace=workspace, role=RoleChoices.OWNER)
    Membership.objects.create(user=auth_viewer, workspace=workspace, role=RoleChoices.VIEWER)
    return cast(Workspace, workspace)


@pytest.fixture
def repository(workspace: Workspace) -> Repository:
    """Fixture creating a Repository."""
    repo = Repository.objects.create(
        workspace=workspace,
        name="jarvis-core",
        full_name="tony/jarvis-core",
        github_id="88888",
        html_url="https://github.com/tony/jarvis-core",
        clone_url="https://github.com/tony/jarvis-core.git",
        visibility="private",
    )
    return cast(Repository, repo)


@pytest.fixture
def decision(repository: Repository) -> ArchitectureDecision:
    """Fixture creating an Architecture Decision."""
    dec = ArchitectureDecision.objects.create(
        repository=repository,
        title="Use clean architecture for backend services",
        status="active",
        rationale="Maintainability and high testability guidelines.",
        module_name="Backend",
        adr_source="docs/adr/0001-clean-arch.md",
        developer_name="Tony Stark",
        commit_hash="cba123",
        pr_number="42",
        incident_key="INC-1",
    )
    dec.constraints.create(constraint_text="Must compile with Python 3.11+")
    dec.alternatives.create(alternative_text="Monolithic architecture")
    dec.history.create(action_type="CREATED", description="Initial creation log.")
    return cast(ArchitectureDecision, dec)


@pytest.fixture(autouse=True)
def clean_cache() -> Any:
    """Fixture to ensure the cache is cleared before and after each test."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def mock_external_services() -> Any:
    """Mock external graph and memory syncing to prevent API side effects during tests."""
    with patch("apps.graph.services.GraphService.sync_decision_to_graph") as mock_graph_sync, \
         patch("apps.memory.services.MemoryService.remember_decision") as mock_memory_remember, \
         patch("apps.memory.services.MemoryService.forget_dataset") as mock_memory_forget, \
         patch("apps.memory.services.MemoryService.improve_dataset") as mock_memory_improve:
        yield {
            "graph_sync": mock_graph_sync,
            "memory_remember": mock_memory_remember,
            "memory_forget": mock_memory_forget,
            "memory_improve": mock_memory_improve,
        }


# =====================================================================
# 1. Phase 10: Analytics & Dashboard APIs
# =====================================================================

@pytest.mark.django_db
def test_workspace_analytics_summary(
    api_client: APIClient, workspace: Workspace, decision: ArchitectureDecision, auth_viewer: User
) -> None:
    """Verify summary analytics endpoint counts and keys are correct."""
    api_client.force_authenticate(user=auth_viewer)
    url = reverse("workspace-analytics-summary", kwargs={"workspace_id": workspace.id})

    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True

    data = response.json()["data"]
    assert data["total_decisions"] == 1
    assert data["status_distribution"]["active"] == 1
    assert data["total_constraints"] == 1
    assert data["total_alternatives"] == 1
    assert data["total_incidents_mitigated"] == 1


@pytest.mark.django_db
def test_workspace_analytics_breakdowns_and_trends(
    api_client: APIClient, workspace: Workspace, decision: ArchitectureDecision, auth_viewer: User
) -> None:
    """Verify module, developer breakdown and trends endpoints return structured data."""
    api_client.force_authenticate(user=auth_viewer)

    # 1. Modules breakdown
    modules_url = reverse("workspace-analytics-modules", kwargs={"workspace_id": workspace.id})
    resp = api_client.get(modules_url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["data"][0]["module_name"] == "Backend"
    assert resp.json()["data"][0]["count"] == 1

    # 2. Developers breakdown
    devs_url = reverse("workspace-analytics-developers", kwargs={"workspace_id": workspace.id})
    resp = api_client.get(devs_url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["data"][0]["developer_name"] == "Tony Stark"
    assert resp.json()["data"][0]["count"] == 1

    # 3. Trends
    trends_url = reverse("workspace-analytics-trends", kwargs={"workspace_id": workspace.id})
    resp = api_client.get(trends_url)
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.json()["data"]) == 1


@pytest.mark.django_db
def test_workspace_analytics_permissions(
    api_client: APIClient, workspace: Workspace, other_user: User
) -> None:
    """Verify non-members are blocked from requesting analytics summary metrics."""
    api_client.force_authenticate(user=other_user)
    url = reverse("workspace-analytics-summary", kwargs={"workspace_id": workspace.id})

    response = api_client.get(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN


# =====================================================================
# 2. Phase 11: Notifications & Alerts
# =====================================================================

@pytest.mark.django_db
@patch("apps.notifications.tasks.dispatch_notification.delay")
def test_notifications_broadcast_and_service(
    mock_dispatch: Any, workspace: Workspace, auth_viewer: User, auth_owner: User
) -> None:
    """Verify notification service broadcasts alerts and enqueues Celery task."""
    NotificationService.notify_workspace_members(
        workspace_id=str(workspace.id),
        title="Test Notification Title",
        message="Test alert description.",
        trigger_email=True,
    )

    # In-app persistent records check
    assert Notification.objects.count() == 2  # Owner + Viewer
    viewer_notif = Notification.objects.filter(user=auth_viewer).first()
    assert viewer_notif is not None
    assert viewer_notif.title == "Test Notification Title"
    assert viewer_notif.message == "Test alert description."
    assert viewer_notif.is_read is False

    # Offloaded email task enqueuing check
    assert mock_dispatch.call_count == 2
    mock_dispatch.assert_any_call(
        recipient_email=auth_viewer.email,
        subject="Test Notification Title",
        body="Test alert description.",
    )


@pytest.mark.django_db
def test_notifications_list_and_read_actions(
    api_client: APIClient, workspace: Workspace, auth_viewer: User
) -> None:
    """Verify retrieving list, marking single read, and bulk marking read endpoints."""
    # Setup notifications manually
    Notification.objects.create(
        workspace=workspace,
        user=auth_viewer,
        title="Alert 1",
        message="Desc 1",
        is_read=False,
    )
    notif2 = Notification.objects.create(
        workspace=workspace,
        user=auth_viewer,
        title="Alert 2",
        message="Desc 2",
        is_read=False,
    )

    api_client.force_authenticate(user=auth_viewer)

    # 1. Get list
    url = reverse("workspace-notifications-list", kwargs={"workspace_id": workspace.id})
    resp = api_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.json()["data"]["results"]) == 2

    # 2. Mark single read
    read_url = reverse("workspace-notifications-mark-as-read", kwargs={"workspace_id": workspace.id, "pk": notif2.id})
    resp = api_client.post(read_url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["data"]["is_read"] is True
    
    # Verify in DB
    notif2.refresh_from_db()
    assert notif2.is_read is True

    # 3. Mark all read
    read_all_url = reverse("workspace-notifications-mark-all-as-read", kwargs={"workspace_id": workspace.id})
    resp = api_client.post(read_all_url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["data"]["count"] == 1  # 1 unread left originally

    assert Notification.objects.filter(workspace=workspace, user=auth_viewer, is_read=False).count() == 0


# =====================================================================
# 3. Phase 12: Caching & Invalidation
# =====================================================================

@pytest.mark.django_db
def test_analytics_summary_caching_and_invalidation(
    api_client: APIClient, workspace: Workspace, repository: Repository, auth_owner: User
) -> None:
    """Verify endpoint values are cached in Redis and invalidated on writes."""
    api_client.force_authenticate(user=auth_owner)
    summary_url = reverse("workspace-analytics-summary", kwargs={"workspace_id": workspace.id})
    
    # 1. Fetch summary to warm up cache
    resp1 = api_client.get(summary_url)
    assert resp1.status_code == status.HTTP_200_OK
    cache_key = f"workspace_analytics_summary_{workspace.id}"
    assert cache.get(cache_key) is not None

    # 2. Create decision to trigger invalidation
    create_url = reverse("workspace-decisions-list", kwargs={"workspace_id": workspace.id})
    payload = {
        "repository_id": str(repository.id),
        "title": "Use PostgreSQL for tests",
        "rationale": "High isolation consistency verification.",
        "module_name": "DB",
        "constraints": [],
        "alternatives": [],
    }
    resp2 = api_client.post(create_url, data=payload, format="json")
    assert resp2.status_code == status.HTTP_201_CREATED

    # 3. Cache must be cleared
    assert cache.get(cache_key) is None
