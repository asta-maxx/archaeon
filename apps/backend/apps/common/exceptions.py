"""Custom exception handling and REST response helpers for Django REST Framework.

Provides standard JSON formats for all API exceptions.
"""

from typing import Any, Optional
import logging
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException, ValidationError as DRFValidationError
from rest_framework.response import Response

logger = logging.getLogger("apps.common")


class BaseAPIException(APIException):
    """Base API Exception for Archaeon services."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = "An unexpected error occurred."
    default_code = "server_error"

    def __init__(
        self,
        detail: Optional[Any] = None,
        code: Optional[str] = None,
        status_code: Optional[int] = None,
    ) -> None:
        """Override initialization to support dynamic status codes."""
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail, code)


class ServiceException(BaseAPIException):
    """Exception raised within Service Layer logic."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Failed to execute service operation."
    default_code = "service_error"


class RepositoryException(BaseAPIException):
    """Exception raised within Repository Layer logic."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = "Database repository error."
    default_code = "repository_error"


class NotFoundException(BaseAPIException):
    """Exception when a database record or resource is missing."""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Requested resource not found."
    default_code = "not_found"


class AuthenticationException(BaseAPIException):
    """Exception for user authentication failures."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Authentication details invalid or expired."
    default_code = "authentication_failed"


class PermissionDeniedException(BaseAPIException):
    """Exception for resource authorization failures."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You do not have permission to access this resource."
    default_code = "permission_denied"


def standard_response(
    success: bool,
    data: Optional[Any] = None,
    error: Optional[dict[str, Any]] = None,
    status_code: int = status.HTTP_200_OK,
) -> Response:
    """Format and return standard API JSON response structures."""
    payload = {
        "success": success,
        "data": data,
        "error": error,
    }
    return Response(payload, status=status_code)


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Optional[Response]:
    """Intercept, log, and format exceptions thrown from any layer."""
    # Convert Django validation errors to DRF validation errors
    if isinstance(exc, DjangoValidationError):
        exc = DRFValidationError(detail=exc.message_dict)

    # Let DRF handle standard REST framework exceptions first
    response = exception_handler(exc, context)

    if response is not None:
        # Standardize validation and built-in API errors format
        error_details = response.data
        code = getattr(exc, "default_code", "validation_error")
        message = "Validation failed" if code == "validation_error" else str(exc)

        # Standard JWT errors check
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            code = "authentication_failed"
            message = "Authentication credentials were not provided or are invalid."

        formatted_error = {
            "code": code,
            "message": message,
            "details": error_details,
        }
        response.data = {
            "success": False,
            "data": None,
            "error": formatted_error,
        }
        return response

    # Unhandled server exceptions (such as DB connections, AttributeError)
    logger.exception("Unhandled server exception caught: %s", str(exc))

    formatted_error = {
        "code": "internal_server_error",
        "message": "An unexpected error occurred on the server.",
        "details": str(exc) if getattr(context.get("view"), "debug", False) else None,
    }

    return Response(
        {
            "success": False,
            "data": None,
            "error": formatted_error,
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
