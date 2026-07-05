"""Asynchronous tasks for dispatching in-app alerts and email notifications."""

import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger("apps.notifications")


@shared_task
def dispatch_notification(recipient_email: str, subject: str, body: str) -> None:
    """Asynchronous celery task sending email alerts using Django mail client."""
    logger.info("Dispatching background alert email to %s: %s", recipient_email, subject)
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@archaeon.io"),
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info("Successfully dispatched background alert email to %s.", recipient_email)
    except Exception as exc:
        logger.error("Failed to send background email to %s: %s", recipient_email, str(exc))
