"""Routing configurations for the memory app."""

from django.urls import path
from apps.memory.views import WorkspaceDecisionViewSet

urlpatterns = [
    path(
        "workspaces/<uuid:workspace_id>/decisions/",
        WorkspaceDecisionViewSet.as_view({"get": "list", "post": "create"}),
        name="workspace-decisions-list",
    ),
    path(
        "workspaces/<uuid:workspace_id>/decisions/superseded/",
        WorkspaceDecisionViewSet.as_view({"get": "superseded"}),
        name="workspace-decisions-superseded",
    ),
    path(
        "workspaces/<uuid:workspace_id>/decisions/timeline/",
        WorkspaceDecisionViewSet.as_view({"get": "timeline"}),
        name="workspace-decisions-timeline",
    ),
    path(
        "workspaces/<uuid:workspace_id>/decisions/<uuid:pk>/",
        WorkspaceDecisionViewSet.as_view({"get": "retrieve", "put": "update"}),
        name="workspace-decisions-detail",
    ),
    path(
        "workspaces/<uuid:workspace_id>/decisions/<uuid:pk>/forget/",
        WorkspaceDecisionViewSet.as_view({"post": "forget"}),
        name="workspace-decisions-forget",
    ),
    path(
        "workspaces/<uuid:workspace_id>/decisions/<uuid:pk>/history/",
        WorkspaceDecisionViewSet.as_view({"get": "history"}),
        name="workspace-decisions-history",
    ),
    path(
        "workspaces/<uuid:workspace_id>/decisions/<uuid:pk>/supersession-chain/",
        WorkspaceDecisionViewSet.as_view({"get": "supersession_chain"}),
        name="workspace-decisions-supersession-chain",
    ),
    path(
        "workspaces/<uuid:workspace_id>/decisions/module/<str:module_name>/",
        WorkspaceDecisionViewSet.as_view({"get": "module_decisions"}),
        name="workspace-decisions-module",
    ),
    path(
        "workspaces/<uuid:workspace_id>/decisions/adr/<str:adr_number>/constraints/",
        WorkspaceDecisionViewSet.as_view({"get": "adr_constraints"}),
        name="workspace-decisions-adr-constraints",
    ),
]
