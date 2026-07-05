"""Routing configurations for the graph app."""

from django.urls import path
from apps.graph.views import WorkspaceGraphView

urlpatterns = [
    path(
        "workspaces/<uuid:workspace_id>/decisions/graph/",
        WorkspaceGraphView.as_view(),
        name="workspace-decisions-graph",
    ),
]
