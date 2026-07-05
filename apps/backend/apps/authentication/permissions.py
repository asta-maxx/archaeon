"""Workspace role-based access control (RBAC) permission classes for DRF views."""

from typing import Any, Optional
from rest_framework import permissions
from rest_framework.request import Request
from apps.authentication.models import Membership, RoleChoices


class BaseWorkspacePermission(permissions.BasePermission):
    """Base class for workspace role-based authorization check."""

    def get_workspace_id(self, request: Request, view: Any) -> Optional[str]:
        """Extract the workspace UUID from URL path, query string, or headers."""
        # 1. URL Path parameters
        workspace_id = view.kwargs.get("workspace_id") or view.kwargs.get("org_id") or view.kwargs.get("organization_id") or view.kwargs.get("pk")
        if workspace_id:
            return str(workspace_id)

        # 2. Query Parameters
        workspace_id = request.query_params.get("workspace_id") or request.query_params.get("org_id") or request.query_params.get("organization_id")
        if workspace_id:
            return str(workspace_id)

        # 3. Request Header
        workspace_id = request.headers.get("X-Workspace-ID") or request.headers.get("X-Organization-ID")
        if workspace_id:
            return str(workspace_id)

        return None

    def has_permission(self, request: Request, view: Any) -> bool:
        """Verify user has active session and is authenticated."""
        return bool(request.user and request.user.is_authenticated)


class IsWorkspaceOwner(BaseWorkspacePermission):
    """Allows access only to workspace Owner users."""

    def has_permission(self, request: Request, view: Any) -> bool:
        """Check if authenticated user is the Owner of the target workspace."""
        if not super().has_permission(request, view):
            return False

        if request.user.is_superuser:
            return True

        workspace_id = self.get_workspace_id(request, view)
        if not workspace_id:
            return False

        return bool(Membership.objects.filter(
            user=request.user,
            workspace_id=workspace_id,
            role=RoleChoices.OWNER
        ).exists())


class IsWorkspaceAdmin(BaseWorkspacePermission):
    """Allows access to workspace Owners or Admins."""

    def has_permission(self, request: Request, view: Any) -> bool:
        """Check if user has Owner or Admin membership role."""
        if not super().has_permission(request, view):
            return False

        if request.user.is_superuser:
            return True

        workspace_id = self.get_workspace_id(request, view)
        if not workspace_id:
            return False

        return bool(Membership.objects.filter(
            user=request.user,
            workspace_id=workspace_id,
            role__in=[RoleChoices.OWNER, RoleChoices.ADMIN]
        ).exists())


class IsWorkspaceDeveloper(BaseWorkspacePermission):
    """Allows access to workspace Owners, Admins, or Developers."""

    def has_permission(self, request: Request, view: Any) -> bool:
        """Check if user has Owner, Admin, or Developer membership role."""
        if not super().has_permission(request, view):
            return False

        if request.user.is_superuser:
            return True

        workspace_id = self.get_workspace_id(request, view)
        if not workspace_id:
            return False

        return bool(Membership.objects.filter(
            user=request.user,
            workspace_id=workspace_id,
            role__in=[RoleChoices.OWNER, RoleChoices.ADMIN, RoleChoices.DEVELOPER]
        ).exists())


class IsWorkspaceViewer(BaseWorkspacePermission):
    """Allows access to any valid member of the workspace (Owner, Admin, Dev, or Viewer)."""

    def has_permission(self, request: Request, view: Any) -> bool:
        """Check if user is a member of the workspace."""
        if not super().has_permission(request, view):
            return False

        if request.user.is_superuser:
            return True

        workspace_id = self.get_workspace_id(request, view)
        if not workspace_id:
            return False

        return bool(Membership.objects.filter(
            user=request.user,
            workspace_id=workspace_id
        ).exists())
