"""WSGI config for archaeon-backend."""

import os
from django.core.wsgi import get_wsgi_application

# Set the default settings module for django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

application = get_wsgi_application()
