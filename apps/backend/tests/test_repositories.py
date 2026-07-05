"""Tests for the Repository Management platform (Phase 4)."""

import pytest
import hmac
import hashlib
from django.urls import reverse
from django.conf import settings
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User, Workspace, Membership, RoleChoices
from apps.repositories.models import Repository, SyncStatus, ProcessingStatus
from apps.repositories.services import RepositoryService
from apps.common.exceptions import ServiceException


@pytest.fixture
def auth_owner() -> User:
    """Fixture returning the workspace owner User."""
    return User.objects.create_user(email="owner@example.com", password="password123", name="Owner User")


@pytest.fixture
def auth_dev() -> User:
    """Fixture returning a workspace Developer User."""
    return User.objects.create_user(email="dev@example.com", password="password123", name="Dev User")


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
def workspace_with_team(
    workspace: Workspace, auth_dev: User, auth_viewer: User
) -> Workspace:
    """Fixture establishing a team inside the workspace."""
    Membership.objects.create(user=auth_dev, workspace=workspace, role=RoleChoices.DEVELOPER)
    Membership.objects.create(user=auth_viewer, workspace=workspace, role=RoleChoices.VIEWER)
    return workspace


@pytest.fixture
def base_repo(workspace: Workspace) -> Repository:  # type: ignore[no-any-return]
    """Fixture creating a base linked repository metadata record."""
    return Repository.objects.create(  # type: ignore[no-any-return]
        workspace=workspace,
        name="arc-reactor",
        full_name="tony/arc-reactor",
        github_id="123456",
        html_url="https://github.com/tony/arc-reactor",
        clone_url="https://github.com/tony/arc-reactor.git",
        visibility="public",
        sync_status=SyncStatus.PENDING,
        processing_status=ProcessingStatus.IDLE,
    )  # type: ignore[no-any-return]


# ==========================================
# 1. Models & Services Tests
# ==========================================

@pytest.mark.django_db
def test_import_repository_service(workspace: Workspace) -> None:
    """Verify repository service handles imports and blocks duplicates."""
    srv = RepositoryService()
    import_data = {
        "name": "jarvis",
        "full_name": "tony/jarvis",
        "github_id": "789012",
        "html_url": "https://github.com/tony/jarvis",
        "clone_url": "https://github.com/tony/jarvis.git",
        "visibility": "private",
        "default_branch": "main",
        "sync_branch": "main",
        "primary_language": "Python",
        "installation_id": "inst_100",
    }

    # Successful import
    repo = srv.import_repository(workspace, import_data)
    assert repo.name == "jarvis"
    assert repo.workspace == workspace
    assert repo.visibility == "private"
    assert repo.sync_status == SyncStatus.PENDING

    # Attempting duplicate import raises ServiceException
    with pytest.raises(ServiceException):
        srv.import_repository(workspace, import_data)

    # Missing ID raises exception
    with pytest.raises(ServiceException):
        srv.import_repository(workspace, {"name": "invalid"})


@pytest.mark.django_db
def test_refresh_repository_metadata_service(base_repo: Repository) -> None:
    """Verify metadata refresh triggers sync checks."""
    srv = RepositoryService()
    assert base_repo.sync_status == SyncStatus.PENDING

    srv.refresh_repository_metadata(base_repo)
    assert base_repo.sync_status == SyncStatus.SYNCED


@pytest.mark.django_db
def test_verify_webhook_signature_service() -> None:
    """Verify hmac payload checking logic against configured secrets."""
    srv = RepositoryService()
    body = b'{"ref": "refs/heads/main"}'

    # Setup expected signature
    secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", None) or "dummy_webhook_secret"
    h = hmac.new(secret.encode("utf-8"), body, hashlib.sha256)
    valid_sig = f"sha256={h.hexdigest()}"

    assert srv.verify_webhook_signature(valid_sig, body) is True
    assert srv.verify_webhook_signature("sha256=invalidhash", body) is False
    assert srv.verify_webhook_signature("", body) is False


@pytest.mark.django_db
def test_handle_webhook_payload_service(base_repo: Repository) -> None:
    """Verify webhook ingestion routes push commits events to queue updates."""
    srv = RepositoryService()
    assert base_repo.processing_status == ProcessingStatus.IDLE

    # Push webhook simulation
    payload = {
        "repository": {
            "id": int(base_repo.github_id)
        }
    }
    srv.handle_webhook_payload("push", payload)

    base_repo.refresh_from_db()
    assert base_repo.processing_status == ProcessingStatus.QUEUED


# ==========================================
# 2. Viewsets & Webhooks API Integration Tests
# ==========================================

@pytest.mark.django_db
def test_repository_api_crud(api_client: APIClient, workspace_with_team: Workspace, auth_dev: User) -> None:
    """Verify standard repository import and detail queries."""
    api_client.force_authenticate(user=auth_dev)
    url = reverse("workspace-repositories-list", kwargs={"workspace_id": str(workspace_with_team.id)})

    # 1. Create (Import) Repo
    import_data = {
        "name": "friday",
        "full_name": "tony/friday",
        "github_id": "999888",
        "html_url": "https://github.com/tony/friday",
        "clone_url": "https://github.com/tony/friday.git",
        "visibility": "public",
    }
    response = api_client.post(url, data=import_data)
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.json()["success"] is True
    repo_id = response.json()["data"]["repository"]

    # 2. List Repositories
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()["data"]["results"]) == 1

    # 3. Refresh metadata
    refresh_url = reverse(
        "workspace-repositories-refresh",
        kwargs={"workspace_id": str(workspace_with_team.id), "pk": str(repo_id)},
    )
    response = api_client.post(refresh_url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["data"]["sync_status"] == SyncStatus.SYNCED

    # 4. Unlink (delete)
    detail_url = reverse(
        "workspace-repositories-detail",
        kwargs={"workspace_id": str(workspace_with_team.id), "pk": str(repo_id)},
    )
    response = api_client.delete(detail_url)
    assert response.status_code == status.HTTP_200_OK
    assert Repository.objects.filter(id=repo_id).count() == 0  # Soft deleted


@pytest.mark.django_db
def test_repository_api_permissions(
    api_client: APIClient, workspace_with_team: Workspace, base_repo: Repository, auth_viewer: User
) -> None:
    """Verify RBAC workspace viewer is blocked from destructive sync metadata modifications."""
    api_client.force_authenticate(user=auth_viewer)

    # 1. Block Import
    url = reverse("workspace-repositories-list", kwargs={"workspace_id": str(workspace_with_team.id)})
    response = api_client.post(url, data={"name": "hulkbuster"})
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # 2. Block Refresh
    refresh_url = reverse(
        "workspace-repositories-refresh",
        kwargs={"workspace_id": str(workspace_with_team.id), "pk": str(base_repo.id)},
    )
    response = api_client.post(refresh_url)
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # 3. Block Delete
    detail_url = reverse(
        "workspace-repositories-detail",
        kwargs={"workspace_id": str(workspace_with_team.id), "pk": str(base_repo.id)},
    )
    response = api_client.delete(detail_url)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_github_webhook_view(api_client: APIClient) -> None:
    """Verify GitHub webhook HTTP interface signature checking."""
    url = reverse("github-webhook")
    body = b'{"ref": "refs/heads/main"}'

    # 1. Invalid signature returns 403
    headers = {"HTTP_X_Hub_Signature_256": "sha256=invalid"}
    response = api_client.post(url, data=body, content_type="application/json", **headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["success"] is False

    # 2. Valid signature returns 200
    secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", None) or "dummy_webhook_secret"
    h = hmac.new(secret.encode("utf-8"), body, hashlib.sha256)
    valid_sig = f"sha256={h.hexdigest()}"
    headers = {"HTTP_X_Hub_Signature_256": valid_sig, "HTTP_X_GitHub_Event": "ping"}

    response = api_client.post(url, data=body, content_type="application/json", **headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True
