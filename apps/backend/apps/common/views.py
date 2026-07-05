"""Health and readiness checking views."""

import logging
from typing import Any
from django.utils import timezone
from django.db import connection
from django.conf import settings
from django.core.cache import caches
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from config.celery import app as celery_app
from apps.graph.services import GraphService

logger = logging.getLogger("apps.common")

START_TIME = timezone.now()


class StandardResponseMixin:
    """Mixin to format all successful DRF responses in the standard JSON envelope."""

    def finalize_response(self, request: Any, response: Any, *args: Any, **kwargs: Any) -> Any:
        """Wrap successful responses in standard payload envelope."""
        if isinstance(response, Response) and 200 <= response.status_code < 300:
            if not isinstance(response.data, dict) or "success" not in response.data:
                response.data = {
                    "success": True,
                    "data": response.data,
                    "error": None,
                }
        return super().finalize_response(request, response, *args, **kwargs)  # type: ignore[misc]


class HealthCheckView(APIView):
    """Liveness check returning general health of the service."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Service Liveness Check",
        responses={200: dict},
    )
    def get(self, request: Any) -> Response:
        """Handle GET requests for liveness status."""
        uptime = (timezone.now() - START_TIME).total_seconds()

        # Quick check for db connection
        try:
            connection.ensure_connection()
            db_status = "healthy"
        except Exception:
            db_status = "unhealthy"

        # Quick check for redis cache connection
        try:
            cache = caches["default"]
            cache.set("health_check_ping", "pong", timeout=5)
            is_cached = cache.get("health_check_ping") == "pong"
            redis_status = "healthy" if is_cached else "unhealthy"
        except Exception:
            redis_status = "unhealthy"

        # Quick check for Neo4j connection
        try:
            graph_srv = GraphService()
            is_connected = graph_srv.check_connection()
            neo4j_status = "healthy" if is_connected else "unhealthy"
        except Exception:
            neo4j_status = "unhealthy"

        payload = {
            "status": "healthy",
            "version": "1.0.0",
            "environment": "development" if settings.DEBUG else "production",
            "uptime_seconds": int(uptime),
            "checks": {
                "database": db_status,
                "redis": redis_status,
                "neo4j": neo4j_status,
            },
        }
        return Response(payload, status=status.HTTP_200_OK)


class ReadinessCheckView(APIView):
    """Readiness check querying active connections of downstream services."""

    permission_classes = [AllowAny]

    def _check_database(self) -> bool:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
            return True
        except Exception as exc:
            logger.error("Readiness check - Postgres failure: %s", str(exc))
            return False

    def _check_redis(self) -> bool:
        try:
            cache = caches["default"]
            cache.set("readiness_check_ping", "pong", timeout=5)
            return bool(cache.get("readiness_check_ping") == "pong")
        except Exception as exc:
            logger.error("Readiness check - Redis failure: %s", str(exc))
            return False

    def _check_celery(self) -> bool:
        try:
            with celery_app.connection() as conn:
                conn.connect()
            return True
        except Exception as exc:
            logger.error("Readiness check - Celery Broker failure: %s", str(exc))
            return False

    def _check_neo4j(self) -> bool:
        try:
            graph_srv = GraphService()
            return graph_srv.check_connection()
        except Exception as exc:
            logger.error("Readiness check - Neo4j failure: %s", str(exc))
            return False

    @extend_schema(
        summary="Service Readiness Check",
        responses={200: dict, 503: dict},
    )
    def get(self, request: Any) -> Response:
        """Verify downstream connections and return status codes."""
        issues = {}

        if not self._check_database():
            issues["database"] = "unreachable"

        if not self._check_redis():
            issues["redis"] = "unreachable"

        if not self._check_celery():
            issues["celery"] = "unreachable"

        if not self._check_neo4j():
            issues["neo4j"] = "unhealthy"

        if issues:
            payload = {
                "status": "not_ready",
                "environment": "development" if settings.DEBUG else "production",
                "issues": issues,
            }
            return Response(payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        payload = {
            "status": "ready",
            "environment": "development" if settings.DEBUG else "production",
            "details": "All downstream infrastructure connections verified.",
        }
        return Response(payload, status=status.HTTP_200_OK)
