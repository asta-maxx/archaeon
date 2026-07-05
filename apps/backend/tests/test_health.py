"""Tests for health and readiness api endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


def test_health_check_endpoint(api_client: APIClient) -> None:
    """Verify health check endpoint returns 200 OK with expected JSON structure."""
    url = reverse("health-check")
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "healthy"
    assert "version" in response.json()
    assert "uptime_seconds" in response.json()
    assert response.json()["checks"]["database"] == "healthy"
    assert response.json()["checks"]["redis"] == "healthy"
    assert response.json()["checks"]["neo4j"] == "healthy"


def test_readiness_check_endpoint_success(api_client: APIClient) -> None:
    """Verify readiness check returns 200 when all backend services are healthy."""
    url = reverse("readiness-check")
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "ready"
    assert "details" in response.json()


def test_readiness_check_endpoint_failure(
    api_client: APIClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify readiness check returns 503 when a downstream service fails."""
    # Monkeypatch GraphService check_connection to return False
    from apps.graph.services import GraphService
    monkeypatch.setattr(GraphService, "check_connection", lambda self: False)

    url = reverse("readiness-check")
    response = api_client.get(url)

    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert response.json()["status"] == "not_ready"
    assert "issues" in response.json()
    assert response.json()["issues"]["neo4j"] == "unhealthy"
