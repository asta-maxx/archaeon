"""Permissions to restrict access to internal service-to-service endpoints."""

from typing import Any
from django.conf import settings
from rest_framework import permissions
from rest_framework.request import Request


class IsInternalServiceClient(permissions.BasePermission):
    """Allows access only to requests containing a valid internal API key."""

    def has_permission(self, request: Request, view: Any) -> bool:
        """Check if request contains valid API Key header or query param."""
        api_key = request.headers.get("X-Internal-API-Key") or request.query_params.get("internal_api_key")
        expected_key = getattr(settings, "INTERNAL_API_KEY", None)

        if not expected_key:
            return False

        return bool(api_key == expected_key)
