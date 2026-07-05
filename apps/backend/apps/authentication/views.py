"""Views for user registration, authentication, token refresh, and profile checks."""

import logging
from typing import Any
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.common.exceptions import standard_response, AuthenticationException
from apps.authentication.services import AuthenticationService, GitHubOAuthService, JWTService
from apps.authentication.serializers import (
    GitHubLoginSerializer,
    LogoutSerializer,
    CurrentUserSerializer,
    TokenResponseSerializer,
)

logger = logging.getLogger("apps.authentication")


class GitHubLoginView(APIView):
    """View to initiate GitHub OAuth workflow by returning authorization URL."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get GitHub OAuth Authorization URL",
        description="Returns the redirection URL to initiate GitHub OAuth callback handshake.",
        request=None,
        responses={
            200: OpenApiResponse(
                description="GitHub Authorization URL successfully generated.",
                response=dict,
            )
        },
    )
    def post(self, request: Request) -> Response:
        """Calculate and return the GitHub authorize redirection URL."""
        oauth_srv = GitHubOAuthService()
        auth_url = oauth_srv.get_authorization_url()
        return standard_response(
            success=True,
            data={"authorization_url": auth_url},
            status_code=status.HTTP_200_OK,
        )


class GitHubCallbackView(APIView):
    """View to exchange authorization code for application JWT tokens."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="GitHub OAuth Callback login handler",
        description="Exchanges code from GitHub callback redirect for JWT authentication tokens.",
        request=GitHubLoginSerializer,
        responses={
            200: OpenApiResponse(
                description="User successfully authenticated.",
                response=TokenResponseSerializer,
            ),
            401: OpenApiResponse(description="Authentication credentials rejected."),
        },
    )
    def post(self, request: Request) -> Response:
        """Verify code query params, login/register user, and return JWT tokens."""
        serializer = GitHubLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["code"]

        auth_srv = AuthenticationService()
        user, tokens, is_new = auth_srv.process_github_login(code)

        logger.info("GitHub Login Success: user=%s, is_new=%s", user.email, is_new)

        return standard_response(
            success=True,
            data={
                "tokens": tokens,
                "user_id": str(user.id),
                "email": user.email,
                "is_new": is_new,
            },
            status_code=status.HTTP_200_OK,
        )

    @extend_schema(exclude=True)
    def get(self, request: Request) -> Response:
        """Fallback GET handler to query params for simpler frontend redirects."""
        code = request.query_params.get("code")
        if not code:
            raise AuthenticationException("Authorization code query parameter is missing.")

        auth_srv = AuthenticationService()
        user, tokens, is_new = auth_srv.process_github_login(code)

        return standard_response(
            success=True,
            data={
                "tokens": tokens,
                "user_id": str(user.id),
                "email": user.email,
                "is_new": is_new,
            },
            status_code=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """View to log out the user by blacklisting their refresh token."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Log out User session",
        description="Blacklists the provided refresh token, invalidating the session.",
        request=LogoutSerializer,
        responses={
            200: OpenApiResponse(description="Successfully logged out."),
            401: OpenApiResponse(description="Invalid or expired token."),
        },
    )
    def post(self, request: Request) -> Response:
        """Blacklist refresh token payload."""
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data["refresh"]

        jwt_srv = JWTService()
        jwt_srv.blacklist_token(refresh_token)

        return standard_response(
            success=True,
            data={"message": "Successfully logged out."},
            status_code=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    """View to retrieve authenticated user profile and active workspace memberships."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Retrieve Current User Profile",
        description="Returns user details and organization workspaces listing.",
        responses={
            200: OpenApiResponse(
                description="Profile details retrieved.",
                response=CurrentUserSerializer,
            )
        },
    )
    def get(self, request: Request) -> Response:
        """Return serialized user data nested with memberships."""
        serializer = CurrentUserSerializer(request.user)
        return standard_response(
            success=True,
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )


class CustomTokenRefreshView(TokenRefreshView):
    """Custom TokenRefreshView to format standard SimpleJWT response using the common standard_response."""

    @extend_schema(
        summary="Refresh Access Token",
        description="Exchanges a valid refresh token for a new short-lived access token.",
        responses={200: dict},
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Validate refresh token and return standardized response."""
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            response.data = {
                "success": True,
                "data": response.data,
                "error": None,
            }
        return response
