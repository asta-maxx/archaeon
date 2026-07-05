"""App configuration for the memory module."""

from django.apps import AppConfig


class MemoryConfig(AppConfig):
    """Configuration class for the memory application module."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.memory"
