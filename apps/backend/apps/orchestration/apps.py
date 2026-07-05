"""App configuration for the orchestration module."""

from django.apps import AppConfig


class OrchestrationConfig(AppConfig):
    """Configuration class for the orchestration application module."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orchestration"
