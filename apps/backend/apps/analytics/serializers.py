"""Serializers for Phase 10: Analytics & Dashboard APIs."""

from rest_framework import serializers


class StatusDistributionSerializer(serializers.Serializer):
    """Serializer representing counts of decisions by their status."""
    active = serializers.IntegerField(default=0)
    superseded = serializers.IntegerField(default=0)
    deprecated = serializers.IntegerField(default=0)


class WorkspaceAnalyticsSummarySerializer(serializers.Serializer):
    """Serializer representing workspace high-level analytics indicators."""
    total_decisions = serializers.IntegerField()
    status_distribution = StatusDistributionSerializer()
    total_constraints = serializers.IntegerField()
    total_alternatives = serializers.IntegerField()
    total_incidents_mitigated = serializers.IntegerField()


class ModuleBreakdownSerializer(serializers.Serializer):
    """Serializer for decision count per module."""
    module_name = serializers.CharField(allow_blank=True)
    count = serializers.IntegerField()


class DeveloperBreakdownSerializer(serializers.Serializer):
    """Serializer for decision count per developer."""
    developer_name = serializers.CharField(allow_blank=True)
    count = serializers.IntegerField()


class DecisionTrendSerializer(serializers.Serializer):
    """Serializer representing decision counts over time."""
    month = serializers.CharField()  # formatted as YYYY-MM
    count = serializers.IntegerField()
