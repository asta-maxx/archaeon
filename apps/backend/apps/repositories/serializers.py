"""Serializers for Repository entities representation and imports payload validation."""

from rest_framework import serializers
from apps.repositories.models import (
    Repository,
    ArchitectureDecision,
    DecisionConstraint,
    DecisionAlternative,
    DecisionHistory,
)


class RepositorySerializer(serializers.ModelSerializer):
    """Serializer representing full repository properties and metadata statuses."""

    class Meta:
        """Meta options."""

        model = Repository
        fields = (
            "id",
            "workspace",
            "project",
            "name",
            "full_name",
            "github_id",
            "html_url",
            "clone_url",
            "default_branch",
            "sync_branch",
            "visibility",
            "primary_language",
            "installation_id",
            "sync_status",
            "processing_status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "workspace", "sync_status", "processing_status", "created_at", "updated_at")


class RepositoryImportSerializer(serializers.ModelSerializer):
    """Serializer validating incoming GitHub repository link and import parameters."""

    project_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        """Meta options."""

        model = Repository
        fields = (
            "project_id",
            "name",
            "full_name",
            "github_id",
            "html_url",
            "clone_url",
            "default_branch",
            "sync_branch",
            "visibility",
            "primary_language",
            "installation_id",
            "webhook_secret",
        )


class DecisionConstraintSerializer(serializers.ModelSerializer):
    """Serializer for decision constraints."""

    class Meta:
        model = DecisionConstraint
        fields = ("id", "constraint_text")


class DecisionAlternativeSerializer(serializers.ModelSerializer):
    """Serializer for decision alternatives."""

    class Meta:
        model = DecisionAlternative
        fields = ("id", "alternative_text")


class DecisionHistorySerializer(serializers.ModelSerializer):
    """Serializer for decision history audit trail."""

    class Meta:
        model = DecisionHistory
        fields = ("id", "action_type", "description", "timestamp")


class ArchitectureDecisionSerializer(serializers.ModelSerializer):
    """Serializer representing complete ArchitectureDecision details."""

    constraints = DecisionConstraintSerializer(many=True, read_only=True)
    alternatives = DecisionAlternativeSerializer(many=True, read_only=True)
    history = DecisionHistorySerializer(many=True, read_only=True)

    class Meta:
        model = ArchitectureDecision
        fields = (
            "id",
            "repository",
            "title",
            "status",
            "rationale",
            "module_name",
            "adr_source",
            "developer_name",
            "commit_hash",
            "pr_number",
            "incident_key",
            "superseded_by",
            "constraints",
            "alternatives",
            "history",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "repository",
            "constraints",
            "alternatives",
            "history",
            "created_at",
            "updated_at",
        )

