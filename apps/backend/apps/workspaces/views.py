"""Views for managing workspaces, projects, memberships, and invitations."""

import logging
from typing import Any
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from apps.common.exceptions import standard_response, ServiceException
from apps.common.views import StandardResponseMixin
from apps.authentication.models import User, Workspace, Membership, RoleChoices
from apps.authentication.services import WorkspaceService, MembershipService
from apps.authentication.permissions import (
    IsWorkspaceOwner,
    IsWorkspaceAdmin,
    IsWorkspaceDeveloper,
    IsWorkspaceViewer,
)
from apps.workspaces.models import Project, Invitation
from apps.workspaces.services import ProjectService, InvitationService, WorkspaceManagerService
from apps.workspaces.serializers import (
    ProjectSerializer,
    InvitationSerializer,
    AcceptInvitationSerializer,
    MemberSerializer,
    WorkspaceCreateSerializer,
    OwnershipTransferSerializer,
)

logger = logging.getLogger("apps.workspaces")


class WorkspaceViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    """ViewSet handling CRUD actions and ownership transfer for Workspace workspaces."""

    permission_classes = [IsAuthenticated]
    queryset = Workspace.objects.all()
    serializer_class = WorkspaceCreateSerializer

    def get_queryset(self) -> Any:
        """Filter workspaces list where authenticated user is an active member."""
        return Workspace.objects.filter(members=self.request.user)

    def get_permissions(self) -> Any:
        """Map roles permissions to actions."""
        if self.action in ["destroy", "transfer_ownership"]:
            return [IsWorkspaceOwner()]
        return [IsAuthenticated()]

    @extend_schema(
        summary="Create Workspace",
        description="Creates a new multi-tenant workspace and registers current user as Owner.",
        request=WorkspaceCreateSerializer,
        responses={201: WorkspaceCreateSerializer},
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Initialize workspace and link current user as OWNER."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data["name"]

        workspace_srv = WorkspaceService()
        workspace = workspace_srv.create_workspace(name=name, owner=request.user)

        return standard_response(
            success=True,
            data=WorkspaceCreateSerializer(workspace).data,
            status_code=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary="Delete Workspace",
        description="Soft deletes the workspace, its projects, and memberships. Requires Owner role.",
        responses={200: dict},
    )
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Soft delete workspace asset."""
        workspace = self.get_object()
        mgr_srv = WorkspaceManagerService()
        mgr_srv.delete_workspace(workspace)
        return standard_response(
            success=True,
            data={"message": "Workspace deleted successfully."},
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Transfer Workspace Ownership",
        description="Transfers the Owner role to another active member. Requires Owner role.",
        request=OwnershipTransferSerializer,
        responses={200: dict},
    )
    @action(detail=True, methods=["post"], url_path="transfer-ownership")
    def transfer_ownership(self, request: Request, pk: Any = None) -> Response:
        """Swap owner role with target member."""
        workspace = self.get_object()
        serializer = OwnershipTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_owner_id = serializer.validated_data["new_owner_id"]

        new_owner = get_object_or_404(User, id=new_owner_id)
        mgr_srv = WorkspaceManagerService()
        mgr_srv.transfer_ownership(workspace, request.user, new_owner)

        return standard_response(
            success=True,
            data={"message": f"Ownership successfully transferred to {new_owner.email}."},
            status_code=status.HTTP_200_OK,
        )


class ProjectViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    """ViewSet handling CRUD actions for Projects within workspace scope."""

    serializer_class = ProjectSerializer

    def get_permissions(self) -> Any:
        """Map role authorization scopes to actions."""
        if self.action in ["list", "retrieve"]:
            return [IsWorkspaceViewer()]
        # Create, Update, Delete require Developer access
        return [IsWorkspaceDeveloper()]

    def get_queryset(self) -> Any:
        """Return projects nested inside the workspace."""
        workspace_id = self.kwargs.get("workspace_id")
        return Project.objects.filter(workspace_id=workspace_id)

    @extend_schema(
        summary="Create Project",
        description="Creates a project inside the designated workspace. Requires Developer role.",
        request=ProjectSerializer,
        responses={201: ProjectSerializer},
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Instantiate project in workspace scope."""
        workspace_id = self.kwargs.get("workspace_id")
        workspace = get_object_or_404(Workspace, id=workspace_id)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data["name"]
        description = serializer.validated_data.get("description", "")

        srv = ProjectService()
        project = srv.create_project(workspace, name, description)

        return standard_response(
            success=True,
            data=ProjectSerializer(project).data,
            status_code=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary="Delete Project",
        description="Soft deletes the project. Requires Developer role.",
        responses={200: dict},
    )
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Soft delete project records."""
        project = self.get_object()
        srv = ProjectService()
        srv.delete_project(project)
        return standard_response(
            success=True,
            data={"message": "Project deleted successfully."},
            status_code=status.HTTP_200_OK,
        )


class MemberViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    """ViewSet listing and editing membership roles within workspace scope."""

    serializer_class = MemberSerializer

    def get_permissions(self) -> Any:
        """Map role authorization scopes to actions."""
        if self.action in ["list", "retrieve"]:
            return [IsWorkspaceViewer()]
        # Changing roles or removing members require Admin role
        return [IsWorkspaceAdmin()]

    def get_queryset(self) -> Any:
        """Return active memberships of the workspace."""
        workspace_id = self.kwargs.get("workspace_id")
        return Membership.objects.filter(workspace_id=workspace_id).select_related("user")

    @extend_schema(
        summary="Update Member Role",
        description="Updates the role of a workspace member. Requires Admin role.",
        request=MemberSerializer,
        responses={200: MemberSerializer},
    )
    def update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Modify membership role properties."""
        membership = self.get_object()
        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data.get("role")

        if role:
            srv = MembershipService()
            srv.update_role(membership, role)

        return standard_response(
            success=True,
            data=MemberSerializer(membership).data,
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Remove Workspace Member",
        description="Removes a member from the workspace. Requires Admin role.",
        responses={200: dict},
    )
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Revoke workspace membership."""
        membership = self.get_object()

        # Admin cannot remove owner unless ownership is transferred
        if membership.role == RoleChoices.OWNER:
            raise ServiceException("Cannot delete the workspace owner. Transfer ownership first.")

        membership.delete()
        return standard_response(
            success=True,
            data={"message": "Member removed successfully."},
            status_code=status.HTTP_200_OK,
        )


class InvitationViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    """ViewSet handling sending, listing, and revoking invitations in workspace scope."""

    serializer_class = InvitationSerializer

    def get_permissions(self) -> Any:
        """Invite management actions require Admin credentials."""
        return [IsWorkspaceAdmin()]

    def get_queryset(self) -> Any:
        """Return pending invitations in the workspace."""
        workspace_id = self.kwargs.get("workspace_id")
        return Invitation.objects.filter(workspace_id=workspace_id, is_accepted=False).select_related("inviter")

    @extend_schema(
        summary="Send Invitation",
        description="Generates an invitation token sent to email address. Requires Admin role.",
        request=InvitationSerializer,
        responses={201: InvitationSerializer},
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Send invitation details."""
        workspace_id = self.kwargs.get("workspace_id")
        workspace = get_object_or_404(Workspace, id=workspace_id)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        role = serializer.validated_data.get("role", RoleChoices.VIEWER)

        srv = InvitationService()
        invitation = srv.create_invitation(workspace, request.user, email, role)

        return standard_response(
            success=True,
            data=InvitationSerializer(invitation).data,
            status_code=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary="Cancel Invitation",
        description="Revokes and deletes a pending workspace invitation. Requires Admin role.",
        responses={200: dict},
    )
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Revoke pending invitation."""
        invitation = self.get_object()
        invitation.delete()
        return standard_response(
            success=True,
            data={"message": "Invitation cancelled successfully."},
            status_code=status.HTTP_200_OK,
        )


class AcceptInvitationView(StandardResponseMixin, APIView):
    """View handling the acceptance of workspace invitations."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Accept Workspace Invitation",
        description="Accepts an invitation using the UUID token and adds user to Workspace.",
        request=AcceptInvitationSerializer,
        responses={200: dict},
    )
    def post(self, request: Request) -> Response:
        """Trade invitation token to join workspace."""
        serializer = AcceptInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]

        srv = InvitationService()
        membership = srv.accept_invitation(token, request.user)

        return standard_response(
            success=True,
            data={
                "message": "Invitation accepted successfully.",
                "workspace_id": str(membership.workspace.id),
                "role": membership.role,
            },
            status_code=status.HTTP_200_OK,
        )
