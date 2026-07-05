"""Serializers for authentication payloads and memberships representation."""

from rest_framework import serializers
from apps.authentication.models import User, Workspace, Membership


class WorkspaceSerializer(serializers.ModelSerializer):
    """Serializer mapping workspace properties."""

    class Meta:
        """Meta options."""

        model = Workspace
        fields = ("id", "name", "slug", "created_at")
        read_only_fields = ("id", "slug", "created_at")


class MembershipSerializer(serializers.ModelSerializer):
    """Serializer mapping user memberships within workspaces, including nested workspace details."""

    workspace = WorkspaceSerializer(read_only=True)

    class Meta:
        """Meta options."""

        model = Membership
        fields = ("id", "role", "workspace", "created_at")
        read_only_fields = ("id", "workspace", "created_at")


class UserSerializer(serializers.ModelSerializer):
    """Serializer representing user account profile data."""

    class Meta:
        """Meta options."""

        model = User
        fields = (
            "id",
            "email",
            "name",
            "github_username",
            "avatar_url",
            "created_at",
        )
        read_only_fields = ("id", "email", "created_at")


class CurrentUserSerializer(serializers.ModelSerializer):
    """Serializer mapping the authenticated user alongside list of workspaces."""

    memberships = MembershipSerializer(many=True, read_only=True)

    class Meta:
        """Meta options."""

        model = User
        fields = (
            "id",
            "email",
            "name",
            "github_username",
            "avatar_url",
            "is_staff",
            "is_superuser",
            "memberships",
            "created_at",
        )
        read_only_fields = (
            "id",
            "email",
            "is_staff",
            "is_superuser",
            "memberships",
            "created_at",
        )


class GitHubLoginSerializer(serializers.Serializer):
    """Serializer validating GitHub auth code query params sent by the frontend."""

    code = serializers.CharField(
        required=True,
        help_text="The code returned by GitHub OAuth authorize callback.",
    )
    state = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional state validation token matching GitHub OAuth query.",
    )


class LogoutSerializer(serializers.Serializer):
    """Serializer validating logout token request payload."""

    refresh = serializers.CharField(
        required=True,
        help_text="The refresh token string to invalidate and blacklist.",
    )


class TokenResponseSerializer(serializers.Serializer):
    """Serializer mapping successful access and refresh tokens response."""

    access = serializers.CharField()
    refresh = serializers.CharField()
