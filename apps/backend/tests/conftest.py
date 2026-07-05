"""Pytest global configuration and shared fixtures."""

import pytest
from typing import Any, Generator
from unittest.mock import MagicMock, patch
from rest_framework.test import APIClient


@pytest.fixture
def api_client() -> APIClient:
    """Fixture returning a standard DRF test API client."""
    return APIClient()


@pytest.fixture(autouse=True)
def mock_db_connection(request: pytest.FixtureRequest) -> Generator[None, None, None]:
    """Mock standard Django database connection to avoid hitting real PostgreSQL, except when django_db is used."""
    if "django_db" in request.keywords:
        yield
        return

    with patch("django.db.connection.ensure_connection"), \
         patch("django.db.connection.cursor") as mock_cursor:

        # Configure cursor mock to act as context manager returning another mock
        cursor_instance = MagicMock()
        cursor_instance.execute.return_value = None
        mock_cursor.return_value.__enter__.return_value = cursor_instance

        yield


@pytest.fixture(autouse=True)
def configure_test_settings(settings: Any) -> None:
    """Override Django settings during tests to use in-memory cache."""
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "unique-snowflake",
        }
    }


@pytest.fixture(autouse=True)
def mock_celery_broker() -> Generator[None, None, None]:
    """Mock Celery broker connection tests."""
    mock_conn = MagicMock()
    with patch("apps.common.views.celery_app.connection") as mock_celery_conn:
        mock_celery_conn.return_value.__enter__.return_value = mock_conn
        yield


@pytest.fixture(autouse=True)
def mock_neo4j_driver() -> Generator[None, None, None]:
    """Mock Neo4j connection checks in views."""
    with patch("apps.graph.services.GraphService.check_connection") as mock_check, \
         patch("apps.graph.services.GraphService.get_driver") as mock_drv:
        mock_check.return_value = True
        mock_drv.return_value = MagicMock()
        yield
