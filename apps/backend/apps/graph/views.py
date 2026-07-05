"""Views for visualizing architecture decisions as knowledge graphs in Neo4j."""

import logging
from typing import Any
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.common.views import StandardResponseMixin
from apps.common.exceptions import standard_response
from apps.authentication.models import Workspace
from apps.authentication.permissions import IsWorkspaceViewer
from apps.graph.services import GraphService

logger = logging.getLogger("apps.graph")


class WorkspaceGraphView(StandardResponseMixin, APIView):
    """View exposing the complete React Flow graph schema for decisions context inside a workspace."""

    permission_classes = [IsWorkspaceViewer]

    @extend_schema(
        summary="Retrieve Workspace Decisions Graph",
        description="Returns a React Flow nodes & edges snapshot representation of decisions in the workspace.",
        responses={200: dict},
    )
    def get(self, request: Request, workspace_id: Any = None) -> Response:
        """Fetch workspace repo node dependencies from Neo4j."""
        workspace = get_object_or_404(Workspace, id=workspace_id)
        
        # Phase 12 caching check
        from django.core.cache import cache
        cache_key = f"workspace_graph_{workspace.id}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            logger.info("Serving workspace decisions graph from cache for %s", workspace.id)
            return standard_response(
                success=True,
                data=cached_data,
                status_code=status.HTTP_200_OK,
            )

        srv = GraphService()
        graph_data = srv.get_full_graph(str(workspace.id))
        
        # Cache visual graph configuration snapshot for 1 hour
        cache.set(cache_key, graph_data, timeout=3600)
        
        return standard_response(
            success=True,
            data=graph_data,
            status_code=status.HTTP_200_OK,
        )

