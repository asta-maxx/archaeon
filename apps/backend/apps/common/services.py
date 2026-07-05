"""Base Service Layer definition."""

import logging
from typing import TypeVar, Generic, Any

T = TypeVar("T")


class BaseService(Generic[T]):
    """Abstract base service class providing common lifecycle structures and helpers.

    Services act as the boundaries for business logic transactions.
    """

    def __init__(self) -> None:
        """Initialize service logger and configurations."""
        self.logger = logging.getLogger(f"apps.{self.__class__.__module__}")

    def log_info(self, message: str, *args: Any) -> None:
        """Log an info message with context."""
        self.logger.info(message, *args)

    def log_error(self, message: str, *args: Any) -> None:
        """Log an error message with context."""
        self.logger.error(message, *args)
