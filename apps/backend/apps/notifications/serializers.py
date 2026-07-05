"""Serializers for Phase 11: Notifications & Alerts."""

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer mapping Notification database entries to API outputs."""

    class Meta:
        """Meta options."""

        model = Notification
        fields = [
            "id",
            "workspace",
            "user",
            "title",
            "message",
            "is_read",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "workspace",
            "user",
            "title",
            "message",
            "created_at",
            "updated_at",
        ]
