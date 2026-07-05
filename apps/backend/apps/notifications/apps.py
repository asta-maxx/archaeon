"""App configuration for the notifications module."""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Configuration class for the notifications application module."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
