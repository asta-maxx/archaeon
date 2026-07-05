"""URL routing configurations for the workspaces app."""

from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.workspaces.views import (
    WorkspaceViewSet,
    ProjectViewSet,
    MemberViewSet,
    InvitationViewSet,
    AcceptInvitationView,
)

router = DefaultRouter()
router.register(r"workspaces", WorkspaceViewSet, basename="workspace")

urlpatterns = [
    # Invite accept endpoint
    path("invitations/accept/", AcceptInvitationView.as_view(), name="accept-invitation"),

    # Nested Projects CRUD
    path(
        "workspaces/<uuid:workspace_id>/projects/",
        ProjectViewSet.as_view({"get": "list", "post": "create"}),
        name="workspace-projects-list",
    ),
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:pk>/",
        ProjectViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="workspace-projects-detail",
    ),

    # Nested Members CRUD
    path(
        "workspaces/<uuid:workspace_id>/members/",
        MemberViewSet.as_view({"get": "list"}),
        name="workspace-members-list",
    ),
    path(
        "workspaces/<uuid:workspace_id>/members/<uuid:pk>/",
        MemberViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="workspace-members-detail",
    ),

    # Nested Invitations CRUD
    path(
        "workspaces/<uuid:workspace_id>/invitations/",
        InvitationViewSet.as_view({"get": "list", "post": "create"}),
        name="workspace-invitations-list",
    ),
    path(
        "workspaces/<uuid:workspace_id>/invitations/<uuid:pk>/",
        InvitationViewSet.as_view(
            {"get": "retrieve", "delete": "destroy"}
        ),
        name="workspace-invitations-detail",
    ),
] + router.urls
