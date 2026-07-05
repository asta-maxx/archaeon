"""App configuration for the authentication module."""

from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    """Configuration class for the authentication application module."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.authentication"
