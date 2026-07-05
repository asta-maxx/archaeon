"""Tests for the authentication and role-based access control (RBAC) module."""

import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from django.db.utils import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.authentication.models import User, Workspace, Membership, RoleChoices
from apps.common.exceptions import ServiceException, AuthenticationException
from apps.authentication.services import (
    UserService,
    WorkspaceService,
    MembershipService,
    GitHubOAuthService,
    JWTService,
    AuthenticationService,
)
from apps.authentication.permissions import (
    IsWorkspaceOwner,
    IsWorkspaceAdmin,
    IsWorkspaceDeveloper,
    IsWorkspaceViewer,
)


@pytest.fixture
def base_user() -> User:
    """Fixture to create a base user."""
    return User.objects.create_user(email="user@example.com", password="password123", name="Base User")


@pytest.fixture
def other_user() -> User:
    """Fixture to create a second user."""
    return User.objects.create_user(email="other@example.com", password="password123", name="Other User")


@pytest.fixture
def base_workspace(base_user: User) -> Workspace:
    """Fixture to create a base workspace owned by base_user."""
    workspace_srv = WorkspaceService()
    return workspace_srv.create_workspace("Acme Corp", base_user)


# ==========================================
# 1. Model Tests
# ==========================================

@pytest.mark.django_db
def test_user_creation() -> None:
    """Verify custom User model properties and constraints."""
    user = User.objects.create_user(email="test@example.com", password="secure_password")
    assert user.email == "test@example.com"
    assert user.is_active is True
    assert user.is_staff is False
    assert user.is_superuser is False
    assert str(user) == "test@example.com"


@pytest.mark.django_db
def test_create_superuser() -> None:
    """Verify superuser creation and flags assertions."""
    admin = User.objects.create_superuser(email="admin@example.com", password="admin_password")
    assert admin.is_staff is True
    assert admin.is_superuser is True

    with pytest.raises(ValueError):
        User.objects.create_superuser(email="bad@example.com", password="pw", is_staff=False)

    with pytest.raises(ValueError):
        User.objects.create_superuser(email="bad2@example.com", password="pw", is_superuser=False)


@pytest.mark.django_db
def test_workspace_uniqueness() -> None:
    """Verify workspace slugs are unique."""
    org1 = Workspace.objects.create(name="Acme", slug="acme")
    assert org1.name == "Acme"

    with pytest.raises(IntegrityError):
        Workspace.objects.create(name="Acme Duplicate", slug="acme")


# ==========================================
# 2. Service Layer Tests
# ==========================================

@pytest.mark.django_db
def test_user_service() -> None:
    """Verify UserService database operations."""
    srv = UserService()
    assert srv.get_by_email("nonexistent@example.com") is None

    user = srv.create_oauth_user(
        email="oauth@example.com",
        name="Oauth User",
        github_id="12345",
        github_username="oauth_user",
        avatar_url="https://avatar.com/u"
    )
    assert user.email == "oauth@example.com"
    assert srv.get_by_github_id("12345") == user

    updated = srv.update_oauth_user(user, "New Name", "new_user", "https://new.com/u")
    assert updated.name == "New Name"
    assert updated.github_username == "new_user"


@pytest.mark.django_db
def test_workspace_service_slug_handling(base_user: User) -> None:
    """Verify WorkspaceService handles slug collisions correctly."""
    srv = WorkspaceService()
    org1 = srv.create_workspace("Acme Corp", base_user)
    assert org1.slug == "acme-corp"

    org2 = srv.create_workspace("Acme Corp", base_user)
    assert org2.slug == "acme-corp-1"


@pytest.mark.django_db
def test_membership_service(base_user: User, other_user: User, base_workspace: Workspace) -> None:
    """Verify membership role updates and validation rules."""
    srv = MembershipService()

    # Check duplicate prevention
    with pytest.raises(ServiceException):
        srv.add_member(base_user, base_workspace, "developer")

    # Add other user
    membership = srv.add_member(other_user, base_workspace, "viewer")
    assert membership.role == "viewer"

    # Update role
    srv.update_role(membership, "developer")
    assert membership.role == "developer"


@pytest.mark.django_db
def test_membership_service_owner_constraint(base_user: User, base_workspace: Workspace) -> None:
    """Verify workspace cannot be left without an owner."""
    srv = MembershipService()
    membership = Membership.objects.get(user=base_user, workspace=base_workspace)

    with pytest.raises(ServiceException):
        srv.update_role(membership, "admin")


def test_github_oauth_service_url() -> None:
    """Verify GitHub auth redirect URL is constructed correctly."""
    srv = GitHubOAuthService()
    url = srv.get_authorization_url()
    assert "https://github.com/login/oauth/authorize" in url
    assert "client_id=" in url
    assert "scope=user:email" in url


@patch("apps.authentication.services.requests.post")
def test_github_oauth_token_exchange(mock_post: MagicMock) -> None:
    """Verify exchange code for access token API call."""
    mock_response = MagicMock()
    mock_response.json.return_value = {"access_token": "mocked_github_token"}
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response

    srv = GitHubOAuthService()
    token = srv.exchange_code_for_token("test_code")
    assert token == "mocked_github_token"


@patch("apps.authentication.services.requests.get")
def test_github_oauth_fetch_profile(mock_get: MagicMock) -> None:
    """Verify retrieving user profile and email listing fallback."""
    mock_profile_resp = MagicMock()
    mock_profile_resp.json.return_value = {
        "id": 999,
        "login": "octocat",
        "name": "The Cat",
        "avatar_url": "https://octo.com/avatar",
        "email": None,  # Private email simulation
    }
    mock_profile_resp.raise_for_status.return_value = None

    mock_emails_resp = MagicMock()
    mock_emails_resp.json.return_value = [
        {"email": "octocat@github.com", "primary": True, "verified": True}
    ]
    mock_emails_resp.raise_for_status.return_value = None

    mock_get.side_effect = [mock_profile_resp, mock_emails_resp]

    srv = GitHubOAuthService()
    profile = srv.fetch_github_profile("dummy_token")
    assert profile["email"] == "octocat@github.com"
    assert profile["login"] == "octocat"
    assert profile["id"] == 999


@pytest.mark.django_db
def test_jwt_service(base_user: User) -> None:
    """Verify JWTService generates tokens and blacklists successfully."""
    srv = JWTService()
    tokens = srv.get_tokens_for_user(base_user)
    assert "access" in tokens
    assert "refresh" in tokens

    # Test blacklisting
    srv.blacklist_token(tokens["refresh"])


# ==========================================
# 3. RBAC Permissions Tests
# ==========================================

@pytest.mark.django_db
def test_rbac_permission_classes(base_user: User, other_user: User, base_workspace: Workspace) -> None:
    """Verify role checks match RBAC workspace authorization scopes."""
    # Base user is the OWNER of base_workspace
    # Create request and view mocks
    request_owner = MagicMock()
    request_owner.user = base_user

    request_guest = MagicMock()
    request_guest.user = other_user

    view = MagicMock()
    view.kwargs = {"workspace_id": str(base_workspace.id)}

    # Perm checks
    assert IsWorkspaceOwner().has_permission(request_owner, view) is True
    assert IsWorkspaceOwner().has_permission(request_guest, view) is False

    assert IsWorkspaceAdmin().has_permission(request_owner, view) is True
    assert IsWorkspaceAdmin().has_permission(request_guest, view) is False

    # Add other user as Developer
    MembershipService().add_member(other_user, base_workspace, "developer")
    assert IsWorkspaceDeveloper().has_permission(request_guest, view) is True
    assert IsWorkspaceOwner().has_permission(request_guest, view) is False
    assert IsWorkspaceViewer().has_permission(request_guest, view) is True

    # Verify superuser overrides
    superuser = User.objects.create_superuser(email="super@example.com", password="password123")
    request_superuser = MagicMock()
    request_superuser.user = superuser
    assert IsWorkspaceOwner().has_permission(request_superuser, view) is True


# ==========================================
# 4. View / API Endpoint Integration Tests
# ==========================================

@pytest.mark.django_db
def test_github_login_url_endpoint(api_client: APIClient) -> None:
    """Verify GET GitHub OAuth URL returns login link."""
    url = reverse("github-login")
    response = api_client.post(url)

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True
    assert "authorization_url" in response.json()["data"]


@pytest.mark.django_db
@patch("apps.authentication.services.GitHubOAuthService.exchange_code_for_token")
@patch("apps.authentication.services.GitHubOAuthService.fetch_github_profile")
def test_github_callback_login_success(
    mock_profile: MagicMock, mock_exchange: MagicMock, api_client: APIClient
) -> None:
    """Verify callback exchanges authorize code for application JWT tokens."""
    mock_exchange.return_value = "github_user_access_token"
    mock_profile.return_value = {
        "id": 888,
        "login": "test_github_user",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar_url": "https://john.com/avatar",
    }

    url = reverse("github-callback")
    response = api_client.post(url, data={"code": "dummy_callback_code"})

    assert response.status_code == status.HTTP_200_OK
    res_data = response.json()
    assert res_data["success"] is True
    assert "tokens" in res_data["data"]
    assert "access" in res_data["data"]["tokens"]
    assert "refresh" in res_data["data"]["tokens"]
    assert res_data["data"]["email"] == "john@example.com"
    assert res_data["data"]["is_new"] is True

    # Verify that default workspace workspace was automatically created
    user = User.objects.get(email="john@example.com")
    assert Workspace.objects.filter(members=user).count() == 1


@pytest.mark.django_db
def test_logout_endpoint(api_client: APIClient, base_user: User) -> None:
    """Verify POST logout blacklists refresh token."""
    refresh = RefreshToken.for_user(base_user)
    api_client.force_authenticate(user=base_user)

    url = reverse("logout")
    response = api_client.post(url, data={"refresh": str(refresh)})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True
    assert response.json()["data"]["message"] == "Successfully logged out."


@pytest.mark.django_db
def test_current_user_profile_endpoint(api_client: APIClient, base_user: User, base_workspace: Workspace) -> None:
    """Verify GET profile me details return account attributes and workspaces memberships."""
    api_client.force_authenticate(user=base_user)

    url = reverse("current-user")
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["data"]["email"] == base_user.email
    assert len(res_data["data"]["memberships"]) == 1
    assert res_data["data"]["memberships"][0]["workspace"]["name"] == base_workspace.name
    assert res_data["data"]["memberships"][0]["role"] == RoleChoices.OWNER


@pytest.mark.django_db
def test_rbac_permission_headers_and_missing(base_user: User, base_workspace: Workspace) -> None:
    """Verify permissions can extract workspace ID from query params, headers, and fail on missing ID."""
    view = MagicMock()
    view.kwargs = {}  # Empty URL kwargs

    # Test Header extraction
    req_header = MagicMock()
    req_header.user = base_user
    req_header.query_params.get.return_value = None
    req_header.headers = {"X-Workspace-ID": str(base_workspace.id)}
    assert IsWorkspaceOwner().has_permission(req_header, view) is True

    # Test Query Param extraction
    req_query = MagicMock()
    req_query.user = base_user
    req_query.query_params.get.side_effect = (
        lambda key, default=None: str(base_workspace.id)
        if key in ["workspace_id", "workspace_id"]
        else None
    )
    assert IsWorkspaceOwner().has_permission(req_query, view) is True

    # Test Missing Org ID fails
    req_missing = MagicMock()
    req_missing.user = base_user
    req_missing.query_params.get.return_value = None
    req_missing.headers = {}
    assert IsWorkspaceOwner().has_permission(req_missing, view) is False


@pytest.mark.django_db
def test_invalid_role_failures(base_user: User, other_user: User, base_workspace: Workspace) -> None:
    """Verify ServiceException is raised when invalid roles are specified."""
    srv = MembershipService()

    with pytest.raises(ServiceException):
        srv.add_member(other_user, base_workspace, "invalid-role")

    # Add valid first
    membership = srv.add_member(other_user, base_workspace, "viewer")

    with pytest.raises(ServiceException):
        srv.update_role(membership, "invalid-role")


@patch("apps.authentication.services.requests.post")
def test_oauth_service_failures(mock_post: MagicMock) -> None:
    """Verify OAuth connection exceptions raise AuthenticationException."""
    mock_post.side_effect = Exception("Network timeout")

    srv = GitHubOAuthService()
    with pytest.raises(AuthenticationException):
        srv.exchange_code_for_token("any-code")


@pytest.mark.django_db
@patch("apps.authentication.services.GitHubOAuthService.exchange_code_for_token")
@patch("apps.authentication.services.GitHubOAuthService.fetch_github_profile")
def test_process_login_existing_email(
    mock_profile: MagicMock, mock_exchange: MagicMock, base_user: User
) -> None:
    """Verify OAuth associates GitHub ID with existing user of same email."""
    mock_exchange.return_value = "token"
    mock_profile.return_value = {
        "id": 1122,
        "login": "john_doe",
        "email": base_user.email,
        "avatar_url": "https://avatar.com",
    }

    auth_srv = AuthenticationService()
    user, tokens, is_new = auth_srv.process_github_login("code")

    assert user == base_user
    assert user.github_id == "1122"
    assert is_new is False


@pytest.mark.django_db
@patch("apps.authentication.services.GitHubOAuthService.exchange_code_for_token")
@patch("apps.authentication.services.GitHubOAuthService.fetch_github_profile")
def test_github_callback_get_login(
    mock_profile: MagicMock, mock_exchange: MagicMock, api_client: APIClient
) -> None:
    """Verify callback fallback GET handler successfully logs in user."""
    mock_exchange.return_value = "token"
    mock_profile.return_value = {
        "id": 991,
        "login": "get_user",
        "email": "get@example.com",
        "avatar_url": "",
    }

    url = reverse("github-callback")
    response = api_client.get(f"{url}?code=dummy_code")

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True
    assert "tokens" in response.json()["data"]


@pytest.mark.django_db
def test_token_refresh_view(api_client: APIClient, base_user: User) -> None:
    """Verify CustomTokenRefreshView returns access tokens in standard format."""
    refresh = RefreshToken.for_user(base_user)

    url = reverse("token-refresh")
    response = api_client.post(url, data={"refresh": str(refresh)})

    assert response.status_code == status.HTTP_200_OK
    res_data = response.json()
    assert res_data["success"] is True
    assert "access" in res_data["data"]


@pytest.mark.django_db
def test_invalid_logout_error(api_client: APIClient, base_user: User) -> None:
    """Verify invalid/missing refresh token returns 401 standard response."""
    api_client.force_authenticate(user=base_user)
    url = reverse("logout")
    response = api_client.post(url, data={"refresh": "invalid-token"})

    # SimpleJWT returns 401/400 validation error
    assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]
