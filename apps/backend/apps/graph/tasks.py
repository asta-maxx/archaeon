"""Asynchronous tasks for Neo4j and timeline updates orchestration."""

import logging
from celery import shared_task

logger = logging.getLogger("apps.graph")


@shared_task
def update_graph_timeline(repository_id: str) -> None:
    """Stub celery task to update graphs timeline."""
    logger.info("Stub update_graph_timeline task called for repo: %s", repository_id)
