"""Celery initialization and configuration for background job processing."""

import os
from celery import Celery
from celery.signals import setup_logging

# Set default settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("archaeon")

# Load configuration from Django settings, namespace 'CELERY'
app.config_from_object("django.conf:settings", namespace="CELERY")

# Automatic discovery of tasks in local Django apps
app.autodiscover_tasks()

# Task Routing configurations
app.conf.task_routes = {
    "apps.repositories.tasks.process_repository_import": {"queue": "repository_processing"},
    "apps.repositories.tasks.process_github_webhook": {"queue": "webhook_processing"},
    "apps.graph.tasks.update_graph_timeline": {"queue": "graph_updates"},
    "apps.common.tasks.cleanup_system_assets": {"queue": "cleanup"},
    "apps.notifications.tasks.dispatch_notification": {"queue": "notifications"},
}

# Task execution and retry defaults
app.conf.task_default_queue = "default"
app.conf.task_acks_late = True
app.conf.task_reject_on_worker_lost = True
app.conf.worker_prefetch_multiplier = 1

# Celery Beat schedules
app.conf.beat_schedule = {
    "cleanup-expired-invitations-hourly": {
        "task": "apps.common.tasks.cleanup_system_assets",
        "schedule": 3600.0,  # 1 hour
    },
}


@setup_logging.connect
def config_loggers(*args, **kwargs):
    """Integrate Celery logging with python standard logging system."""
    from logging.config import dictConfig
    from django.conf import settings
    if hasattr(settings, "LOGGING"):
        dictConfig(settings.LOGGING)
