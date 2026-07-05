"""URL configuration for archaeon-backend."""

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from apps.common.views import HealthCheckView, ReadinessCheckView

urlpatterns = [
    # Admin Interface
    path("admin/", admin.site.urls),

    # Authentication Module Routes
    path("api/", include("apps.authentication.urls")),
    path("api/", include("apps.workspaces.urls")),
    path("api/", include("apps.repositories.urls")),
    path("api/", include("apps.orchestration.urls")),
    path("api/", include("apps.graph.urls")),
    path("api/", include("apps.memory.urls")),
    path("api/", include("apps.analytics.urls")),
    path("api/", include("apps.notifications.urls")),

    # Health and Readiness Endpoints
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("ready/", ReadinessCheckView.as_view(), name="readiness-check"),

    # API Documentation (Swagger and ReDoc)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]
