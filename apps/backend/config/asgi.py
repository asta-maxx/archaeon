"""ASGI config for archaeon-backend."""

import os
from django.core.asgi import get_asgi_application

# Set the default settings module for django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

application = get_asgi_application()
