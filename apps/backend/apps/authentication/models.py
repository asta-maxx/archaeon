"""Database models for the authentication and authorization (RBAC) module."""

from typing import Any, Optional
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from apps.common.models import UUIDModel, TimestampModel, SoftDeleteModel


class RoleChoices(models.TextChoices):
    """Available workspace roles for membership authorization."""

    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    DEVELOPER = "developer", "Developer"
    VIEWER = "viewer", "Viewer"


class UserManager(BaseUserManager):
    """Custom manager for the custom User model."""

    def create_user(
        self, email: str, password: Optional[str] = None, **extra_fields: Any
    ) -> "User":
        """Create and return a regular User with the given email and password."""
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user  # type: ignore[no-any-return]

    def create_superuser(
        self, email: str, password: Optional[str] = None, **extra_fields: Any
    ) -> "User":
        """Create and return a superuser with the given email and password."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)  # type: ignore[no-any-return]


class User(AbstractBaseUser, PermissionsMixin, UUIDModel, TimestampModel, SoftDeleteModel):
    """Custom user model mapping user profiles to emails and GitHub authorization details."""

    email = models.EmailField(unique=True, db_index=True)
    name = models.CharField(max_length=255, blank=True)
    github_id = models.CharField(
        max_length=100, unique=True, null=True, blank=True, db_index=True
    )
    github_username = models.CharField(max_length=100, null=True, blank=True)
    avatar_url = models.URLField(max_length=500, null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()  # type: ignore[assignment]

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        """Meta options."""

        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        """String representation of the user."""
        return str(self.email)


class Workspace(UUIDModel, TimestampModel, SoftDeleteModel):
    """Workspaces encapsulating repositories and project scopes."""

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    members = models.ManyToManyField(
        User, through="Membership", related_name="workspaces"
    )

    class Meta:
        """Meta options."""

        db_table = "workspaces"
        verbose_name = "Workspace"
        verbose_name_plural = "Workspaces"

    def __str__(self) -> str:
        """String representation of the workspace."""
        return str(self.name)


class Membership(UUIDModel, TimestampModel, SoftDeleteModel):
    """Join table mapping workspace membership and role assignments."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="memberships"
    )
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(
        max_length=50, choices=RoleChoices.choices, default=RoleChoices.VIEWER
    )

    class Meta:
        """Meta options."""

        db_table = "memberships"
        unique_together = ("user", "workspace")
        verbose_name = "Membership"
        verbose_name_plural = "Memberships"

    def __str__(self) -> str:
        """String representation of the membership."""
        return f"{self.user.email} in {self.workspace.name} as {self.role}"
