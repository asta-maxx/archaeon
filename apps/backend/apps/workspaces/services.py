"""Services for managing projects, invitations, and workspace lifecycles."""

import logging
import uuid
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from apps.common.services import BaseService
from apps.common.exceptions import ServiceException
from apps.authentication.models import User, Workspace, Membership, RoleChoices
from apps.authentication.services import MembershipService
from apps.workspaces.models import Project, Invitation

logger = logging.getLogger("apps.workspaces")


class ProjectService(BaseService[Project]):
    """Service handling lifecycle operations for Project records."""

    def create_project(self, workspace: Workspace, name: str, description: str = "") -> Project:
        """Create a new Project within the given Workspace."""
        project = Project.objects.create(
            workspace=workspace,
            name=name,
            description=description
        )  # type: ignore[no-any-return]
        self.log_info("Created project %s in workspace %s", name, workspace.name)
        return project  # type: ignore[no-any-return]

    def update_project(self, project: Project, name: str, description: str = "") -> Project:
        """Update properties of an existing project."""
        project.name = name
        project.description = description
        project.save(update_fields=["name", "description", "updated_at"])
        self.log_info("Updated project %s properties", project.name)
        return project

    def delete_project(self, project: Project) -> None:
        """Perform soft deletion on a project."""
        project.delete()
        self.log_info("Soft deleted project: %s", project.name)


class InvitationService(BaseService[Invitation]):
    """Service handling the lifecycle of workspace invitations."""

    def create_invitation(self, workspace: Workspace, inviter: User, email: str, role: str) -> Invitation:
        """Generate a workspace invitation link token active for 48 hours."""
        if role not in RoleChoices.values:
            raise ServiceException(f"Invalid invitation role: '{role}'")

        # Verify target is not already a member
        if Membership.objects.filter(user__email=email, workspace=workspace).exists():
            raise ServiceException(f"User with email '{email}' is already a member of workspace '{workspace.name}'")

        # Deactivate any previous pending invitation for this email in this workspace
        Invitation.objects.filter(workspace=workspace, email=email, is_accepted=False).delete()

        expires_at = timezone.now() + timedelta(hours=48)
        invitation = Invitation.objects.create(
            workspace=workspace,
            inviter=inviter,
            email=email,
            role=role,
            expires_at=expires_at
        )  # type: ignore[no-any-return]

        self.log_info("Invited email %s to workspace %s as %s", email, workspace.name, role)
        return invitation  # type: ignore[no-any-return]

    def accept_invitation(self, token: uuid.UUID, user: User) -> Membership:
        """Validate invitation token and add user to the Workspace."""
        try:
            invitation = Invitation.objects.get(token=token, is_accepted=False)
        except Invitation.DoesNotExist:
            raise ServiceException("Invitation token is invalid or has already been accepted.")

        if invitation.is_expired:
            raise ServiceException("Invitation has expired.")

        # Accept invitation and add user as a member
        with transaction.atomic():
            membership_service = MembershipService()
            membership = membership_service.add_member(
                user=user,
                workspace=invitation.workspace,
                role=invitation.role
            )

            invitation.is_accepted = True
            invitation.save(update_fields=["is_accepted", "updated_at"])

        self.log_info("User %s accepted invitation and joined workspace %s", user.email, invitation.workspace.name)
        return membership


class WorkspaceManagerService(BaseService[Workspace]):
    """Service handling workspace deletions and owner transfers."""

    def delete_workspace(self, workspace: Workspace) -> None:
        """Soft delete a workspace and all nested projects."""
        # Clean up nested projects
        Project.objects.filter(workspace=workspace).delete()
        # Clean up memberships
        Membership.objects.filter(workspace=workspace).delete()

        workspace.delete()
        self.log_info("Soft deleted workspace and its memberships: %s", workspace.name)

    def transfer_ownership(self, workspace: Workspace, current_owner: User, new_owner: User) -> None:
        """Transfer workspace Ownership role from current_owner to new_owner."""
        # 1. Verify current_owner is the owner
        try:
            current_membership = Membership.objects.get(
                user=current_owner, workspace=workspace, role=RoleChoices.OWNER
            )
        except Membership.DoesNotExist:
            raise ServiceException("The provided owner is not the current owner of this workspace.")

        # 2. Verify new_owner is already a member
        try:
            new_membership = Membership.objects.get(user=new_owner, workspace=workspace)
        except Membership.DoesNotExist:
            raise ServiceException("The target user must be an active member of the workspace before receiving ownership.")

        if new_membership.role == RoleChoices.OWNER:
            raise ServiceException("Target user is already the owner.")

        # 3. Swap roles
        with transaction.atomic():
            new_membership.role = RoleChoices.OWNER
            new_membership.save(update_fields=["role", "updated_at"])

            current_membership.role = RoleChoices.ADMIN
            current_membership.save(update_fields=["role", "updated_at"])

        self.log_info(
            "Transferred ownership of workspace %s from %s to %s",
            workspace.name,
            current_owner.email,
            new_owner.email
        )
