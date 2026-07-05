"""App configuration for the repositories module."""

from django.apps import AppConfig


class RepositoriesConfig(AppConfig):
    """Configuration class for the repositories application module."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.repositories"
