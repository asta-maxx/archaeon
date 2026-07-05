"""App configuration for the graph module."""

from django.apps import AppConfig


class GraphConfig(AppConfig):
    """Configuration class for the graph application module."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.graph"
