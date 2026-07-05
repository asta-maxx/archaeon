"""Services for managing authentication, GitHub OAuth, users, and organizations."""

import logging
import requests
from typing import Any, Optional, Tuple, Dict, cast
from django.conf import settings
from django.utils.text import slugify
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from apps.common.services import BaseService
from apps.common.exceptions import AuthenticationException, ServiceException
from apps.authentication.models import User, Workspace, Membership, RoleChoices

logger = logging.getLogger("apps.authentication")


class UserService(BaseService[User]):
    """Service handling lifecycle operations for User records."""

    def get_by_email(self, email: str) -> Optional[User]:
        """Retrieve user record by email address."""
        try:
            return User.objects.get(email=email)  # type: ignore[no-any-return]
        except User.DoesNotExist:
            return None

    def get_by_github_id(self, github_id: str) -> Optional[User]:
        """Retrieve user record by GitHub ID."""
        try:
            return User.objects.get(github_id=github_id)  # type: ignore[no-any-return]
        except User.DoesNotExist:
            return None

    def create_oauth_user(self, email: str, name: str, github_id: str, github_username: str, avatar_url: str) -> User:
        """Instantiate and persist a user authenticated via GitHub OAuth."""
        user = User.objects.create_user(
            email=email,
            name=name,
            github_id=github_id,
            github_username=github_username,
            avatar_url=avatar_url,
        )
        self.log_info("Created new GitHub OAuth user: %s", email)
        return user

    def update_oauth_user(self, user: User, name: str, github_username: str, avatar_url: str) -> User:
        """Update GitHub profile details for an existing user."""
        user.name = name
        user.github_username = github_username
        user.avatar_url = avatar_url
        user.save(update_fields=["name", "github_username", "avatar_url", "updated_at"])
        self.log_info("Updated GitHub profile info for user: %s", user.email)
        return user


class WorkspaceService(BaseService[Workspace]):
    """Service handling Workspace records."""

    def create_workspace(self, name: str, owner: User) -> Workspace:
        """Create a new Workspace and assign the owner."""
        base_slug = slugify(name)
        slug = base_slug
        counter = 1

        # Keep checking for slug uniqueness
        while Workspace.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        with transaction.atomic():
            workspace = Workspace.objects.create(name=name, slug=slug)  # type: ignore[no-any-return]

            # Link owner via Membership
            Membership.objects.create(
                user=owner,
                workspace=workspace,
                role=RoleChoices.OWNER
            )
        self.log_info("Created workspace: %s (slug: %s) for user: %s", name, slug, owner.email)
        return workspace  # type: ignore[no-any-return]


class MembershipService(BaseService[Membership]):
    """Service handling role memberships within workspaces."""

    def add_member(self, user: User, workspace: Workspace, role: str) -> Membership:
        """Add a user to a workspace with a specific role."""
        if role not in RoleChoices.values:
            raise ServiceException(f"Invalid role configuration: '{role}'")

        if Membership.objects.filter(user=user, workspace=workspace).exists():
            raise ServiceException(f"User is already a member of workspace: {workspace.name}")

        membership = Membership.objects.create(
            user=user,
            workspace=workspace,
            role=role
        )  # type: ignore[no-any-return]
        self.log_info("Added user %s to workspace %s with role %s", user.email, workspace.name, role)
        return membership  # type: ignore[no-any-return]

    def update_role(self, membership: Membership, role: str) -> Membership:
        """Update the role of an existing membership."""
        if role not in RoleChoices.values:
            raise ServiceException(f"Invalid role configuration: '{role}'")

        # Check that we do not leave a workspace without an owner
        if membership.role == RoleChoices.OWNER and role != RoleChoices.OWNER:
            owners_count = Membership.objects.filter(
                workspace=membership.workspace,
                role=RoleChoices.OWNER
            ).count()
            if owners_count <= 1:
                raise ServiceException("A workspace must have at least one owner.")

        membership.role = role
        membership.save(update_fields=["role", "updated_at"])
        self.log_info("Updated membership role for %s to %s", membership.user.email, role)
        return membership


class GitHubOAuthService(BaseService[Any]):
    """Service coordinating handshake requests with the GitHub OAuth API."""

    def get_authorization_url(self) -> str:
        """Generate the authorize URL redirect endpoint for GitHub login flow."""
        client_id = settings.GITHUB_CLIENT_ID
        redirect_uri = settings.GITHUB_REDIRECT_URI
        scope = "user:email"
        return (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={scope}"
        )

    def exchange_code_for_token(self, code: str) -> str:
        """Request GitHub access token in exchange for authorize code callback string."""
        url = "https://github.com/login/oauth/access_token"
        headers = {"Accept": "application/json"}
        data = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
        }

        try:
            response = requests.post(url, headers=headers, data=data, timeout=10)
            response.raise_for_status()
            res_data = response.json()
        except Exception as exc:
            self.log_error("GitHub access token exchange request failed: %s", str(exc))
            raise AuthenticationException("Could not connect to GitHub OAuth server.")

        if "error" in res_data:
            self.log_error("GitHub token exchange returned error: %s", res_data.get("error_description"))
            raise AuthenticationException(res_data.get("error_description", "GitHub code verification failed."))

        token = res_data.get("access_token")
        if not token:
            raise AuthenticationException("Access token not found in GitHub response.")
        return str(token)

    def fetch_github_profile(self, access_token: str) -> Dict[str, Any]:
        """Fetch authenticated user profile details from the GitHub REST API API."""
        url = "https://api.github.com/user"
        headers = {
            "Authorization": f"token {access_token}",
            "Accept": "application/json",
        }

        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            profile = cast(Dict[str, Any], response.json())
        except Exception as exc:
            self.log_error("GitHub profile request failed: %s", str(exc))
            raise AuthenticationException("Could not retrieve user profile from GitHub.")

        # Ensure we have email details, if email is private query list of emails
        if not profile.get("email"):
            profile["email"] = self._fetch_primary_github_email(access_token)

        return profile

    def _fetch_primary_github_email(self, access_token: str) -> str:
        """Fetch verified primary email addresses if default email visibility is private."""
        url = "https://api.github.com/user/emails"
        headers = {
            "Authorization": f"token {access_token}",
            "Accept": "application/json",
        }

        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            emails = response.json()
        except Exception as exc:
            self.log_error("GitHub emails list request failed: %s", str(exc))
            raise AuthenticationException("Could not fetch user emails from GitHub.")

        for email_info in emails:
            if email_info.get("primary") and email_info.get("verified"):
                return str(email_info.get("email"))

        # Fallback to any email if primary/verified not flagged
        if emails:
            return str(emails[0].get("email"))
        raise AuthenticationException("No email addresses associated with GitHub account.")


class JWTService(BaseService[Any]):
    """Service wrapping SimpleJWT token generation and blacklisting."""

    def get_tokens_for_user(self, user: User) -> Dict[str, str]:
        """Generate Access and Refresh JWT tokens for a given user."""
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),  # type: ignore[attr-defined]
            "refresh": str(refresh),
        }

    def blacklist_token(self, refresh_token: str) -> None:
        """Invalidate the refresh token by adding it to the token blacklist."""
        try:
            token = RefreshToken(refresh_token)  # type: ignore[arg-type]
            token.blacklist()
            self.log_info("Successfully blacklisted refresh token.")
        except TokenError as exc:
            self.log_error("Failed to blacklist refresh token: %s", str(exc))
            raise AuthenticationException("Invalid or expired refresh token.")


class AuthenticationService(BaseService[Any]):
    """Orchestrates standard login callback handshakes, User registrations, and token issuance."""

    def __init__(self) -> None:
        """Initialize required domain subservices."""
        super().__init__()
        self.user_service = UserService()
        self.workspace_service = WorkspaceService()
        self.oauth_service = GitHubOAuthService()
        self.jwt_service = JWTService()

    def process_github_login(self, code: str) -> Tuple[User, Dict[str, str], bool]:
        """Coordinate authorization callback flow, creating records and issuing tokens.

        Returns a tuple of (User, tokens, is_new_user).
        """
        # 1. Trade code for access token
        access_token = self.oauth_service.exchange_code_for_token(code)

        # 2. Retrieve user profile
        profile = self.oauth_service.fetch_github_profile(access_token)

        email = profile.get("email")
        github_id = str(profile.get("id") or "")
        github_username = str(profile.get("login") or "")
        name = str(profile.get("name") or github_username or "")
        avatar_url = str(profile.get("avatar_url") or "")

        if not email:
            raise AuthenticationException("GitHub profile must have a valid email address.")

        # 3. Resolve user record
        is_new_user = False
        user = self.user_service.get_by_github_id(github_id)

        if not user:
            # Fallback check by email (in case they previously registered)
            user = self.user_service.get_by_email(email)
            if user:
                # Link GitHub details
                user.github_id = github_id
                user.github_username = github_username
                user.avatar_url = avatar_url
                user.save(update_fields=["github_id", "github_username", "avatar_url", "updated_at"])
            else:
                # Create user
                user = self.user_service.create_oauth_user(
                    email=email,
                    name=name,
                    github_id=github_id,
                    github_username=github_username,
                    avatar_url=avatar_url
                )
                is_new_user = True

                # Generate default organization workspace for new user
                org_name = f"{name}'s Workspace"
                self.workspace_service.create_workspace(org_name, user)
        else:
            # Sync user updates
            user = self.user_service.update_oauth_user(user, name, github_username, avatar_url)

        # 4. Generate access tokens
        tokens = self.jwt_service.get_tokens_for_user(user)
        return user, tokens, is_new_user
