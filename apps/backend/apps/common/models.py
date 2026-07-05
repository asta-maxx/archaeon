"""Base abstract models for the Archaeon ecosystem.

Adheres to Clean Architecture and database standardization guidelines.
"""

import uuid
from typing import Any
from django.db import models
from django.utils import timezone


class UUIDModel(models.Model):
    """Abstract model that uses UUID4 as primary key instead of auto-incrementing integers."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, unique=True
    )

    class Meta:
        """Meta properties."""

        abstract = True


class TimestampModel(models.Model):
    """Abstract model to track object creation and update datetimes."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """Meta properties."""

        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    """Custom QuerySet supporting soft deletion queries."""

    def delete(self) -> tuple[int, dict[str, int]]:
        """Perform soft delete on queryset."""
        count = self.update(deleted_at=timezone.now())
        return count, {self.model._meta.label: count}

    def hard_delete(self) -> tuple[int, dict[str, int]]:
        """Physically delete records from database."""
        return super().delete()  # type: ignore[no-any-return]

    def active(self) -> models.QuerySet:
        """Filter only active objects."""
        return self.filter(deleted_at__isnull=True)

    def deleted(self) -> models.QuerySet:
        """Filter only deleted objects."""
        return self.filter(deleted_at__isnull=False)


class SoftDeleteManager(models.Manager):
    """Manager returning active (non-soft-deleted) records by default."""

    def get_queryset(self) -> SoftDeleteQuerySet:
        """Get queryset excluding soft deleted rows."""
        return SoftDeleteQuerySet(self.model, using=self._db).active()  # type: ignore[no-any-return]

    def all_with_deleted(self) -> SoftDeleteQuerySet:
        """Get queryset including soft deleted rows."""
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    """Abstract model representing objects that can be soft-deleted."""

    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeleteManager()

    class Meta:
        """Meta properties."""

        abstract = True

    def delete(self, *args: Any, **kwargs: Any) -> tuple[int, dict[str, int]]:
        """Perform soft-delete by setting deleted_at timestamp."""
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])
        return 1, {self._meta.label: 1}

    def hard_delete(self, *args: Any, **kwargs: Any) -> tuple[int, dict[str, int]]:
        """Physically delete record from database."""
        return super().delete(*args, **kwargs)  # type: ignore[no-any-return]

    def restore(self) -> None:
        """Restore a soft-deleted object."""
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])
