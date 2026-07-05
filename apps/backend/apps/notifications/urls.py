from django.urls import path
from .views import WorkspaceNotificationViewSet

urlpatterns = [
    path(
        "workspaces/<uuid:workspace_id>/notifications/",
        WorkspaceNotificationViewSet.as_view({"get": "list"}),
        name="workspace-notifications-list",
    ),
    path(
        "workspaces/<uuid:workspace_id>/notifications/<uuid:pk>/",
        WorkspaceNotificationViewSet.as_view({"get": "retrieve"}),
        name="workspace-notifications-detail",
    ),
    path(
        "workspaces/<uuid:workspace_id>/notifications/<uuid:pk>/read/",
        WorkspaceNotificationViewSet.as_view({"post": "mark_as_read"}),
        name="workspace-notifications-mark-as-read",
    ),
    path(
        "workspaces/<uuid:workspace_id>/notifications/read-all/",
        WorkspaceNotificationViewSet.as_view({"post": "mark_all_as_read"}),
        name="workspace-notifications-mark-all-as-read",
    ),
]

