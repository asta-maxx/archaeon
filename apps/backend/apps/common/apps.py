"""App configuration for the common module."""

from django.apps import AppConfig


class CommonConfig(AppConfig):
    """Configuration class for the common application module."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.common"
