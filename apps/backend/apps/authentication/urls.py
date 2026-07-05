"""URL configuration for the authentication app."""

from django.urls import path
from apps.authentication.views import (
    GitHubLoginView,
    GitHubCallbackView,
    LogoutView,
    CurrentUserView,
    CustomTokenRefreshView,
)

urlpatterns = [
    path("auth/github/login/", GitHubLoginView.as_view(), name="github-login"),
    path("auth/github/callback/", GitHubCallbackView.as_view(), name="github-callback"),
    path("auth/refresh/", CustomTokenRefreshView.as_view(), name="token-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", CurrentUserView.as_view(), name="current-user"),
]
