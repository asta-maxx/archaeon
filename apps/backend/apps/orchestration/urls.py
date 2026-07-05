"""URL routing configurations for the orchestration app."""

from django.urls import path
from apps.orchestration.views import ProcessingJobViewSet

urlpatterns = [
    # Workspace nested jobs lookup
    path(
        "workspaces/<uuid:workspace_id>/jobs/",
        ProcessingJobViewSet.as_view({"get": "list"}),
        name="workspace-jobs-list",
    ),
    path(
        "workspaces/<uuid:workspace_id>/jobs/<uuid:pk>/",
        ProcessingJobViewSet.as_view({"get": "retrieve"}),
        name="workspace-jobs-detail",
    ),
]
