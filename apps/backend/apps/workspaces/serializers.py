"""Serializers for Workspace, Project, Invitation, and Membership assets."""

from rest_framework import serializers
from apps.authentication.models import Workspace, Membership
from apps.authentication.serializers import UserSerializer
from apps.workspaces.models import Project, Invitation


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer mapping project workspace parameters."""

    class Meta:
        """Meta options."""

        model = Project
        fields = ("id", "workspace", "name", "description", "created_at", "updated_at")
        read_only_fields = ("id", "workspace", "created_at", "updated_at")


class InvitationSerializer(serializers.ModelSerializer):
    """Serializer mapping workspace invitation details."""

    inviter = UserSerializer(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        """Meta options."""

        model = Invitation
        fields = (
            "id",
            "workspace",
            "inviter",
            "email",
            "role",
            "token",
            "is_accepted",
            "is_expired",
            "expires_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "workspace",
            "inviter",
            "token",
            "is_accepted",
            "expires_at",
            "created_at",
        )


class AcceptInvitationSerializer(serializers.Serializer):
    """Serializer validating invitation accept action."""

    token = serializers.UUIDField(required=True, help_text="The invitation UUID token to accept.")


class MemberSerializer(serializers.ModelSerializer):
    """Serializer mapping workspace membership role details nested with user profile info."""

    user = UserSerializer(read_only=True)

    class Meta:
        """Meta options."""

        model = Membership
        fields = ("id", "user", "role", "created_at")
        read_only_fields = ("id", "user", "created_at")


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    """Serializer validating workspace creation request payload."""

    class Meta:
        """Meta options."""

        model = Workspace
        fields = ("id", "name", "slug", "created_at")
        read_only_fields = ("id", "slug", "created_at")


class OwnershipTransferSerializer(serializers.Serializer):
    """Serializer validating new owner selection on ownership transfer."""

    new_owner_id = serializers.UUIDField(required=True, help_text="The UUID of the workspace member to receive ownership.")
