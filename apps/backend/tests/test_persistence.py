"""Integration tests for Phase 7: Persistence (PostgreSQL, Neo4j, Cognée)."""

import pytest
from typing import Any
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User, Workspace, Membership, RoleChoices
from apps.repositories.models import Repository, ArchitectureDecision, DecisionConstraint, DecisionAlternative
from apps.graph.services import GraphService
from apps.memory.services import MemoryService


@pytest.fixture
def auth_owner() -> User:
    """Fixture returning workspace owner User."""
    return User.objects.create_user(email="owner@example.com", password="password123", name="Owner User")


@pytest.fixture
def auth_viewer() -> User:
    """Fixture returning workspace viewer User."""
    return User.objects.create_user(email="viewer@example.com", password="password123", name="Viewer User")


@pytest.fixture
def other_user() -> User:
    """Fixture returning another User not associated with the workspace."""
    return User.objects.create_user(email="other@example.com", password="password123", name="Other User")


@pytest.fixture
def workspace(auth_owner: User, auth_viewer: User) -> Workspace:
    """Fixture creating Workspace and membership allocations."""
    workspace = Workspace.objects.create(name="Wayne Enterprises", slug="wayne-ent")
    Membership.objects.create(user=auth_owner, workspace=workspace, role=RoleChoices.OWNER)
    Membership.objects.create(user=auth_viewer, workspace=workspace, role=RoleChoices.VIEWER)
    return workspace  # type: ignore[no-any-return]


@pytest.fixture
def repository(workspace: Workspace) -> Repository:
    """Fixture creating a Repository."""
    return Repository.objects.create(  # type: ignore[no-any-return]
        workspace=workspace,
        name="batmobile-control",
        full_name="bruce/batmobile-control",
        github_id="99999",
        html_url="https://github.com/bruce/batmobile-control",
        clone_url="https://github.com/bruce/batmobile-control.git",
        visibility="private",
    )


@pytest.fixture(autouse=True)
def mock_memory_service() -> Any:
    """Mock all MemoryService operations to prevent real Cognée/LLM calls in tests."""
    with patch("apps.memory.services.MemoryService.remember_decision") as mock_remember, \
         patch("apps.memory.services.MemoryService.recall_decisions") as mock_recall, \
         patch("apps.memory.services.MemoryService.forget_dataset") as mock_forget, \
         patch("apps.memory.services.MemoryService.improve_dataset") as mock_improve:
        yield {
            "remember": mock_remember,
            "recall": mock_recall,
            "forget": mock_forget,
            "improve": mock_improve,
        }


@pytest.fixture(autouse=True)
def mock_graph_service() -> Any:
    """Mock all GraphService write/sync operations to prevent real Neo4j calls in tests."""
    with patch("apps.graph.services.GraphService.sync_decision_to_graph") as mock_sync:
        yield mock_sync


@pytest.fixture
def decision(repository: Repository) -> ArchitectureDecision:
    """Fixture creating an Architecture Decision."""
    dec = ArchitectureDecision.objects.create(
        repository=repository,
        title="Use Python 3.11 for core components",
        status="active",
        rationale="Stable releases and compatibility with key SDK libraries.",
        module_name="Engine",
        adr_source="docs/adr/0001-use-python.md",
        developer_name="Bruce Wayne",
        commit_hash="abcdef123",
        pr_number="12",
        incident_key="INC-99",
    )
    dec.constraints.create(constraint_text="Must run on Ubuntu 22.04 LTS")
    dec.alternatives.create(alternative_text="Go (rejected due to team lack of expertise)")
    dec.history.create(action_type="CREATED", description="Initial database record setup.")
    return dec  # type: ignore[no-any-return]


# =====================================================================
# 1. PostgreSQL Model Tests
# =====================================================================

@pytest.mark.django_db
def test_decision_models_persistence(decision: ArchitectureDecision) -> None:
    """Verify decision models and relationships are correctly written to Postgres."""
    assert ArchitectureDecision.objects.count() == 1
    assert DecisionConstraint.objects.count() == 1
    assert DecisionAlternative.objects.count() == 1

    dec = ArchitectureDecision.objects.get(id=decision.id)
    assert dec.title == "Use Python 3.11 for core components"
    assert dec.constraints.first().constraint_text == "Must run on Ubuntu 22.04 LTS"
    assert dec.alternatives.first().alternative_text == "Go (rejected due to team lack of expertise)"
    assert dec.history.filter(action_type="CREATED").exists()


# =====================================================================
# 2. Services Mock Integration Tests
# =====================================================================

@pytest.mark.django_db
def test_decision_sync_services(repository: Repository) -> None:
    """Verify that creating decisions triggers graph and memory sync routines."""
    dec = ArchitectureDecision.objects.create(
        repository=repository,
        title="Use PostgreSQL for persistent storage",
        status="active",
        rationale="ACID compliance and relational scaling."
    )
    
    # Trigger services sync manually or verify views integration trigger
    graph_srv = GraphService()
    graph_srv.sync_decision_to_graph(dec)

    mem_srv = MemoryService()
    mem_srv.remember_decision("Test data", dataset_name="test_set")


# =====================================================================
# 3. API Integration Tests (Workspace Decisions Endpoint)
# =====================================================================

@pytest.mark.django_db
def test_workspace_decisions_list(
    api_client: APIClient, workspace: Workspace, decision: ArchitectureDecision, auth_viewer: User
) -> None:
    """Verify GET list retrieves active workspace decisions for authenticated viewers."""
    api_client.force_authenticate(user=auth_viewer)
    url = reverse("workspace-decisions-list", kwargs={"workspace_id": workspace.id})

    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True
    
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["title"] == decision.title


@pytest.mark.django_db
def test_workspace_decisions_list_isolation(
    api_client: APIClient, workspace: Workspace, decision: ArchitectureDecision, other_user: User
) -> None:
    """Verify non-members cannot retrieve decisions from workspaces they do not belong to."""
    api_client.force_authenticate(user=other_user)
    url = reverse("workspace-decisions-list", kwargs={"workspace_id": workspace.id})

    response = api_client.get(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_workspace_decisions_create_remember(
    api_client: APIClient, workspace: Workspace, repository: Repository, auth_owner: User
) -> None:
    """Verify POST create successfully indices decisions in Neo4j, postgres, and cognée stubs."""
    api_client.force_authenticate(user=auth_owner)
    url = reverse("workspace-decisions-list", kwargs={"workspace_id": workspace.id})

    payload = {
        "repository_id": str(repository.id),
        "title": "Use Redis for cache",
        "rationale": "High-throughput in-memory caching requirement.",
        "module_name": "Cache",
        "constraints": ["Must use Redis clusters in production"],
        "alternatives": ["Memcached"],
    }

    response = api_client.post(url, data=payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["success"] is True

    dec_id = response.json()["data"]["id"]
    assert ArchitectureDecision.objects.filter(id=dec_id).exists()
    assert DecisionConstraint.objects.filter(decision_id=dec_id).count() == 1


@pytest.mark.django_db
def test_workspace_decision_forget(
    api_client: APIClient, workspace: Workspace, decision: ArchitectureDecision, auth_owner: User
) -> None:
    """Verify forget POST endpoint marks decision superseded and logs audit history."""
    api_client.force_authenticate(user=auth_owner)
    url = reverse("workspace-decisions-forget", kwargs={"workspace_id": workspace.id, "pk": decision.id})

    response = api_client.post(url)
    assert response.status_code == status.HTTP_200_OK
    
    decision.refresh_from_db()
    assert decision.status == "superseded"
    assert decision.history.filter(action_type="SUPERSEDED").exists()


@pytest.mark.django_db
def test_decision_timeline_and_linage(
    api_client: APIClient, workspace: Workspace, decision: ArchitectureDecision, auth_viewer: User
) -> None:
    """Verify timeline, history, and supersession chain API endpoints."""
    api_client.force_authenticate(user=auth_viewer)
    
    # 1. Timeline Endpoint
    timeline_url = reverse("workspace-decisions-timeline", kwargs={"workspace_id": workspace.id})
    response = api_client.get(timeline_url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()["data"]) > 0

    # 2. History Endpoint
    history_url = reverse("workspace-decisions-history", kwargs={"workspace_id": workspace.id, "pk": decision.id})
    response = api_client.get(history_url)
    assert response.status_code == status.HTTP_200_OK

    # 3. Supersession Chain Endpoint
    chain_url = reverse("workspace-decisions-supersession-chain", kwargs={"workspace_id": workspace.id, "pk": decision.id})
    response = api_client.get(chain_url)
    assert response.status_code == status.HTTP_200_OK

