"""URL routing configurations for the repositories app."""

from django.urls import path
from apps.repositories.views import RepositoryViewSet, GitHubWebhookView
from apps.repositories.internal_views import InternalRepositoryProcessView

urlpatterns = [
    # Internal service-to-service endpoints
    path("internal/repository/process/", InternalRepositoryProcessView.as_view(), name="internal-repository-process"),

    # GitHub webhooks ingestion path
    path("webhooks/github/", GitHubWebhookView.as_view(), name="github-webhook"),

    # Nested Repositories CRUD inside workspace scope
    path(
        "workspaces/<uuid:workspace_id>/repositories/",
        RepositoryViewSet.as_view({"get": "list", "post": "create"}),
        name="workspace-repositories-list",
    ),
    path(
        "workspaces/<uuid:workspace_id>/repositories/<uuid:pk>/",
        RepositoryViewSet.as_view(
            {
                "get": "retrieve",
                "delete": "destroy",
            }
        ),
        name="workspace-repositories-detail",
    ),
    path(
        "workspaces/<uuid:workspace_id>/repositories/<uuid:pk>/refresh/",
        RepositoryViewSet.as_view({"post": "refresh"}),
        name="workspace-repositories-refresh",
    ),
]
