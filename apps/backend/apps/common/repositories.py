"""Base Repository Layer interface wrapper.

Decouples database engines or ORM specific implementations from business logic.
"""

from typing import TypeVar, Generic, Type, Optional, Sequence, Any
from django.db import models
from apps.common.exceptions import NotFoundException

M = TypeVar("M", bound=models.Model)


class BaseRepository(Generic[M]):
    """Abstract base repository wrapping standard Django ORM operations."""

    model: Type[M]

    def __init__(self) -> None:
        """Verify model attribute is defined."""
        if not hasattr(self, "model") or self.model is None:
            raise NotImplementedError("Repositories must define a 'model' attribute.")

    def get_by_id(self, pk: Any) -> M:
        """Find record by ID, raises NotFoundException if missing."""
        try:
            return self.model.objects.get(pk=pk)  # type: ignore[no-any-return]
        except self.model.DoesNotExist:
            raise NotFoundException(
                detail=f"{self.model.__name__} with ID {pk} does not exist.",
                code=f"{self.model.__name__.lower()}_not_found",
            )

    def get_or_none(self, **filters: Any) -> Optional[M]:
        """Find record or return None if missing."""
        try:
            return self.model.objects.get(**filters)  # type: ignore[no-any-return]
        except self.model.DoesNotExist:
            return None

    def filter(self, **filters: Any) -> models.QuerySet:
        """Fetch records matching filter queries."""
        return self.model.objects.filter(**filters)

    def list_all(self) -> Sequence[M]:
        """List all entries from the model."""
        return list(self.model.objects.all())

    def create(self, **fields: Any) -> M:
        """Instantiate and save a new record."""
        obj = self.model(**fields)
        obj.full_clean()
        obj.save()
        return obj  # type: ignore[no-any-return]

    def update(self, instance: M, **fields: Any) -> M:
        """Update instance attributes and save."""
        for key, value in fields.items():
            setattr(instance, key, value)
        instance.full_clean()
        instance.save()
        return instance

    def delete(self, instance: M) -> bool:
        """Delete instance (calls delete on the model instance, which handles soft-delete if supported)."""
        instance.delete()
        return True

    def exists(self, **filters: Any) -> bool:
        """Check if rows exist matching query."""
        return self.model.objects.filter(**filters).exists()  # type: ignore[no-any-return]
