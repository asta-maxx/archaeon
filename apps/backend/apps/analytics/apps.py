"""App configuration for the analytics module."""

from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    """Configuration class for the analytics application module."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.analytics"
