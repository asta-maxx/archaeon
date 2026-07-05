# flake8: noqa: F403, F405
from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

# CORS configurations
CORS_ALLOW_ALL_ORIGINS = True

# Disable security requirements for easier development
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# Additional middlewares or configurations for development
if "django_debug_toolbar" in INSTALLED_APPS:
    MIDDLEWARE.append("debug_toolbar.middleware.DebugToolbarMiddleware")
    INTERNAL_IPS = ["127.0.0.1", "localhost"]
