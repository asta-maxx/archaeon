"""Tests for the Workspaces, Projects, and Invitations platform (Phase 3)."""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User, Workspace, Membership, RoleChoices
from apps.common.exceptions import ServiceException
from apps.workspaces.models import Project
from apps.workspaces.services import ProjectService, InvitationService, WorkspaceManagerService


@pytest.fixture
def auth_owner() -> User:
    """Fixture returning the workspace owner User."""
    return User.objects.create_user(email="owner@example.com", password="password123", name="Owner User")


@pytest.fixture
def auth_admin() -> User:
    """Fixture returning a workspace Admin User."""
    return User.objects.create_user(email="admin@example.com", password="password123", name="Admin User")


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
    """Fixture creating a Workspace workspace owned by auth_owner."""
    workspace = Workspace.objects.create(name="Stark Industries", slug="stark-industries")
    Membership.objects.create(user=auth_owner, workspace=workspace, role=RoleChoices.OWNER)
    return workspace  # type: ignore[no-any-return]


@pytest.fixture
def workspace_with_team(
    workspace: Workspace, auth_admin: User, auth_dev: User, auth_viewer: User
) -> Workspace:
    """Fixture establishing a complete team inside the workspace."""
    Membership.objects.create(user=auth_admin, workspace=workspace, role=RoleChoices.ADMIN)
    Membership.objects.create(user=auth_dev, workspace=workspace, role=RoleChoices.DEVELOPER)
    Membership.objects.create(user=auth_viewer, workspace=workspace, role=RoleChoices.VIEWER)
    return workspace


# ==========================================
# 1. Models & Services Tests
# ==========================================

@pytest.mark.django_db
def test_project_lifecycle(workspace: Workspace) -> None:
    """Verify Project creation, update, and soft delete."""
    srv = ProjectService()
    project = srv.create_project(workspace, "Arc Reactor", "Clean energy source")
    assert project.name == "Arc Reactor"
    assert project.workspace == workspace

    srv.update_project(project, "Arc Reactor MK II", "Vibranium core")
    assert project.name == "Arc Reactor MK II"

    srv.delete_project(project)
    assert Project.objects.filter(id=project.id).count() == 0  # Soft deleted (removed from default queryset)


@pytest.mark.django_db
def test_invitation_lifecycle(workspace: Workspace, auth_owner: User, auth_viewer: User) -> None:
    """Verify Invitation generation and acceptance."""
    srv = InvitationService()
    inv = srv.create_invitation(workspace, auth_owner, "spider@stark.com", "developer")
    assert inv.email == "spider@stark.com"
    assert inv.role == "developer"
    assert inv.is_expired is False

    # Accept
    user = User.objects.create_user(email="spider@stark.com", password="password123")
    membership = srv.accept_invitation(inv.token, user)
    assert membership.workspace == workspace
    assert membership.role == "developer"
    assert Membership.objects.filter(user=user, workspace=workspace).exists()


@pytest.mark.django_db
def test_workspace_manager_ownership_transfer(workspace_with_team: Workspace, auth_owner: User, auth_dev: User) -> None:
    """Verify transferring owner credentials checks rules."""
    srv = WorkspaceManagerService()
    srv.transfer_ownership(workspace_with_team, auth_owner, auth_dev)

    assert Membership.objects.get(user=auth_dev, workspace=workspace_with_team).role == RoleChoices.OWNER
    assert Membership.objects.get(user=auth_owner, workspace=workspace_with_team).role == RoleChoices.ADMIN


# ==========================================
# 2. Viewsets & Permissions Integration Tests
# ==========================================

@pytest.mark.django_db
def test_workspace_api_crud(api_client: APIClient, auth_owner: User) -> None:
    """Verify workspace creation and retrieval endpoints."""
    api_client.force_authenticate(user=auth_owner)

    # 1. Create Workspace
    url = reverse("workspace-list")
    response = api_client.post(url, data={"name": "S.H.I.E.L.D."})
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["success"] is True
    slug = response.json()["data"]["slug"]
    assert slug == "shield"

    # 2. List Workspaces
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()["data"]["results"]) == 1


@pytest.mark.django_db
def test_workspace_ownership_transfer_api(
    api_client: APIClient, workspace_with_team: Workspace, auth_owner: User, auth_dev: User
) -> None:
    """Verify API POST ownership transfers correctly updates database."""
    api_client.force_authenticate(user=auth_owner)
    url = reverse("workspace-transfer-ownership", kwargs={"pk": str(workspace_with_team.id)})

    response = api_client.post(url, data={"new_owner_id": str(auth_dev.id)})
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True

    assert Membership.objects.get(user=auth_dev, workspace=workspace_with_team).role == RoleChoices.OWNER


@pytest.mark.django_db
def test_project_api_permissions(
    api_client: APIClient, workspace_with_team: Workspace, auth_dev: User, auth_viewer: User
) -> None:
    """Verify RBAC permissions block Viewer role from creating projects."""
    # 1. Authenticate as Developer -> Can create projects
    api_client.force_authenticate(user=auth_dev)
    url = reverse("workspace-projects-list", kwargs={"workspace_id": str(workspace_with_team.id)})
    response = api_client.post(url, data={"name": "Iron Legion"})
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["data"]["id"] is not None

    # 2. Authenticate as Viewer -> Cannot create projects (raises 403 Forbidden)
    api_client.force_authenticate(user=auth_viewer)
    response = api_client.post(url, data={"name": "Goliath"})
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # 3. Viewer can view/list projects
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()["data"]["results"]) == 1


@pytest.mark.django_db
def test_invitation_api_flow(
    api_client: APIClient, workspace_with_team: Workspace, auth_admin: User, auth_dev: User
) -> None:
    """Verify sending invitations via API and accepting it."""
    # 1. Admin can invite members
    api_client.force_authenticate(user=auth_admin)
    url = reverse("workspace-invitations-list", kwargs={"workspace_id": str(workspace_with_team.id)})
    response = api_client.post(url, data={"email": "hawkeye@shield.com", "role": "viewer"})
    assert response.status_code == status.HTTP_201_CREATED
    token = response.json()["data"]["token"]

    # 2. Developer cannot invite members (403 Forbidden)
    api_client.force_authenticate(user=auth_dev)
    response = api_client.post(url, data={"email": "blackwidow@shield.com", "role": "viewer"})
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # 3. Accept invitation
    new_user = User.objects.create_user(email="hawkeye@shield.com", password="password123")
    api_client.force_authenticate(user=new_user)
    accept_url = reverse("accept-invitation")
    response = api_client.post(accept_url, data={"token": token})
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True

    # Check database membership
    assert Membership.objects.filter(user=new_user, workspace=workspace_with_team).exists()


@pytest.mark.django_db
def test_member_role_update_api(
    api_client: APIClient, workspace_with_team: Workspace, auth_admin: User, auth_viewer: User
) -> None:
    """Verify workspace admins can adjust member roles."""
    api_client.force_authenticate(user=auth_admin)
    membership = Membership.objects.get(user=auth_viewer, workspace=workspace_with_team)

    url = reverse(
        "workspace-members-detail",
        kwargs={"workspace_id": str(workspace_with_team.id), "pk": str(membership.id)},
    )
    response = api_client.patch(url, data={"role": RoleChoices.DEVELOPER})
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["data"]["role"] == RoleChoices.DEVELOPER


@pytest.mark.django_db
def test_invitation_exceptions(workspace: Workspace, auth_owner: User) -> None:
    """Verify invitation exceptions are raised for invalid inputs."""
    srv = InvitationService()

    # 1. Invalid role
    with pytest.raises(ServiceException):
        srv.create_invitation(workspace, auth_owner, "spider@stark.com", "invalid_role")

    # 2. Member already exists
    with pytest.raises(ServiceException):
        srv.create_invitation(workspace, auth_owner, auth_owner.email, "developer")

    # 3. Invalid token accept
    import uuid
    with pytest.raises(ServiceException):
        srv.accept_invitation(uuid.uuid4(), auth_owner)


@pytest.mark.django_db
def test_ownership_transfer_exceptions(workspace_with_team: Workspace, auth_owner: User, auth_dev: User) -> None:
    """Verify ownership transfer checks validation rules."""
    srv = WorkspaceManagerService()

    # 1. Owner transferring to someone who is not member
    non_member = User.objects.create_user(email="nonmember@example.com", password="password123")
    with pytest.raises(ServiceException):
        srv.transfer_ownership(workspace_with_team, auth_owner, non_member)

    # 2. Non-owner attempting to transfer
    with pytest.raises(ServiceException):
        srv.transfer_ownership(workspace_with_team, auth_dev, auth_owner)


@pytest.mark.django_db
def test_workspace_api_detail_actions(
    api_client: APIClient,
    workspace_with_team: Workspace,
    auth_owner: User,
    auth_admin: User,
    auth_dev: User,
) -> None:
    """Verify delete workspace, delete projects, and invitation cancellations."""
    # 1. Create a project to test soft delete
    srv = ProjectService()
    proj = srv.create_project(workspace_with_team, "Thane", "Thanos tracker")

    # Delete project via API
    api_client.force_authenticate(user=auth_dev)
    proj_url = reverse(
        "workspace-projects-detail",
        kwargs={"workspace_id": str(workspace_with_team.id), "pk": str(proj.id)},
    )
    response = api_client.delete(proj_url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True

    # 2. Invite Hawkeye and then cancel it
    api_client.force_authenticate(user=auth_admin)
    inv_srv = InvitationService()
    inv = inv_srv.create_invitation(workspace_with_team, auth_owner, "hawkeye@shield.com", "viewer")
    inv_url = reverse(
        "workspace-invitations-detail",
        kwargs={"workspace_id": str(workspace_with_team.id), "pk": str(inv.id)},
    )
    response = api_client.delete(inv_url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True

    # 3. Try deleting workspace owner (should fail with exception in view)
    owner_membership = Membership.objects.get(user=auth_owner, workspace=workspace_with_team)
    member_url = reverse(
        "workspace-members-detail",
        kwargs={"workspace_id": str(workspace_with_team.id), "pk": str(owner_membership.id)},
    )
    response = api_client.delete(member_url)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["success"] is False
    assert "owner" in response.json()["error"]["message"]

    # 4. Delete Workspace via API (Owner only)
    api_client.force_authenticate(user=auth_owner)
    url = reverse("workspace-detail", kwargs={"pk": str(workspace_with_team.id)})
    response = api_client.delete(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True
