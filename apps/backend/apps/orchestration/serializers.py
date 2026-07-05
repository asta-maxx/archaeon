"""Serializers for ProcessingJob entities representation."""

from rest_framework import serializers
from apps.orchestration.models import ProcessingJob


class ProcessingJobSerializer(serializers.ModelSerializer):
    """Serializer representing ProcessingJob attributes and execution logs."""

    class Meta:
        """Meta options."""

        model = ProcessingJob
        fields = (
            "id",
            "job_type",
            "status",
            "workspace",
            "project",
            "repository",
            "requested_by",
            "celery_task_id",
            "progress",
            "retry_count",
            "started_at",
            "completed_at",
            "error_message",
            "metadata",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
