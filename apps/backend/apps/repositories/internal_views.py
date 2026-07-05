"""Internal views exposing endpoints for secure service-to-service communication."""

import logging
from typing import Any
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.common.exceptions import standard_response
from apps.common.views import StandardResponseMixin
from apps.repositories.permissions import IsInternalServiceClient

logger = logging.getLogger("apps.repositories")


class InternalRepositoryProcessView(StandardResponseMixin, APIView):
    """Internal API view allowing RIS to update repository processing statuses."""

    authentication_classes: list[Any] = []
    permission_classes = [IsInternalServiceClient]

    @extend_schema(
        summary="Internal Repository Sync Callback",
        description="Private endpoint for the Repository Intelligence Service to trigger processing syncs.",
        request=None,
        responses={200: dict},
    )
    def post(self, request: Request) -> Response:
        """Handle incoming callback payloads from RIS."""
        logger.info("Received internal repository processing callback.")
        # Simulates successful status update
        return standard_response(
            success=True,
            data={"message": "Processing status update received successfully."},
            status_code=status.HTTP_200_OK,
        )
