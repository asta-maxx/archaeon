"""Tests for the inter-service communication layer (Phase 5)."""

import pytest
from unittest.mock import patch, MagicMock
import requests
from django.urls import reverse
from django.conf import settings
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User, Workspace, Membership, RoleChoices
from apps.repositories.models import Repository
from apps.repositories.ris_client import RISClient
from apps.common.exceptions import ServiceException


@pytest.fixture
def auth_owner() -> User:
    """Fixture returning the workspace owner User."""
    return User.objects.create_user(email="owner@example.com", password="password123", name="Owner User")


@pytest.fixture
def workspace(auth_owner: User) -> Workspace:
    """Fixture creating a Workspace owned by auth_owner."""
    workspace = Workspace.objects.create(name="Stark Industries", slug="stark-industries")
    Membership.objects.create(user=auth_owner, workspace=workspace, role=RoleChoices.OWNER)
    return workspace  # type: ignore[no-any-return]


@pytest.fixture
def repository(workspace: Workspace) -> Repository:
    """Fixture creating a Repository metadata record."""
    return Repository.objects.create(  # type: ignore[no-any-return]
        workspace=workspace,
        name="mark-85",
        full_name="tony/mark-85",
        github_id="858585",
        html_url="https://github.com/tony/mark-85",
        clone_url="https://github.com/tony/mark-85.git",
        visibility="private",
    )


# ==========================================
# 1. RISClient Unit Tests
# ==========================================

@pytest.mark.django_db
@patch("requests.Session.post")
def test_ris_client_trigger_success(mock_post: MagicMock, repository: Repository, auth_owner: User) -> None:
    """Verify RISClient formats payload and returns successful responses."""
    # Setup mock response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"status": "processing", "job_id": "job_uuid"}
    mock_post.return_value = mock_response

    client = RISClient()
    result = client.trigger_repository_processing(repository, user=auth_owner, webhook_type="push")

    assert result["status"] == "processing"
    assert result["job_id"] == "job_uuid"

    # Verify request payload details
    args, kwargs = mock_post.call_args
    assert args[0].endswith("/internal/repository/process")

    payload = kwargs["json"]
    assert payload["repository"]["github_id"] == repository.github_id
    assert payload["workspace"]["slug"] == repository.workspace.slug
    assert payload["user"]["email"] == auth_owner.email
    assert payload["webhook_type"] == "push"

    # Verify header key mapping
    assert kwargs["headers"]["X-Internal-API-Key"] == settings.INTERNAL_API_KEY


@pytest.mark.django_db
@patch("requests.Session.post")
def test_ris_client_trigger_error_codes(mock_post: MagicMock, repository: Repository) -> None:
    """Verify RISClient handles non-200 HTTP statuses by throwing ServiceExceptions."""
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    mock_post.return_value = mock_response

    client = RISClient()
    with pytest.raises(ServiceException) as excinfo:
        client.trigger_repository_processing(repository)

    assert "Intelligence Service process trigger failed" in str(excinfo.value)


@pytest.mark.django_db
@patch("requests.Session.post")
def test_ris_client_trigger_connection_failure(mock_post: MagicMock, repository: Repository) -> None:
    """Verify RISClient propagates connection drops as ServiceExceptions."""
    mock_post.side_effect = requests.RequestException("Connection refused")

    client = RISClient()
    with pytest.raises(ServiceException) as excinfo:
        client.trigger_repository_processing(repository)

    assert "Failed to communicate with Intelligence Service" in str(excinfo.value)


# ==========================================
# 2. Endpoint Permissions API Integration Tests
# ==========================================

@pytest.mark.django_db
def test_internal_process_callback_authentication(api_client: APIClient) -> None:
    """Verify inter-service callback endpoint requires a valid API key."""
    url = reverse("internal-repository-process")

    # 1. Missing header returns 403 Forbidden
    response = api_client.post(url, data={})
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # 2. Incorrect API key returns 403 Forbidden
    headers = {"HTTP_X_Internal_API_Key": "invalid_key"}
    response = api_client.post(url, data={}, **headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # 3. Valid API key returns 200 OK
    headers = {"HTTP_X_Internal_API_Key": settings.INTERNAL_API_KEY}
    response = api_client.post(url, data={}, **headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True
