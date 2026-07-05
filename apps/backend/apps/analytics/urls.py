"""URL routing configuration for Phase 10: Analytics & Dashboard APIs."""

from django.urls import path
from .views import (
    WorkspaceAnalyticsSummaryView,
    WorkspaceAnalyticsModuleBreakdownView,
    WorkspaceAnalyticsDeveloperBreakdownView,
    WorkspaceAnalyticsTrendView,
)

urlpatterns = [
    path(
        "workspaces/<uuid:workspace_id>/analytics/summary/",
        WorkspaceAnalyticsSummaryView.as_view(),
        name="workspace-analytics-summary",
    ),
    path(
        "workspaces/<uuid:workspace_id>/analytics/modules/",
        WorkspaceAnalyticsModuleBreakdownView.as_view(),
        name="workspace-analytics-modules",
    ),
    path(
        "workspaces/<uuid:workspace_id>/analytics/developers/",
        WorkspaceAnalyticsDeveloperBreakdownView.as_view(),
        name="workspace-analytics-developers",
    ),
    path(
        "workspaces/<uuid:workspace_id>/analytics/trends/",
        WorkspaceAnalyticsTrendView.as_view(),
        name="workspace-analytics-trends",
    ),
]
