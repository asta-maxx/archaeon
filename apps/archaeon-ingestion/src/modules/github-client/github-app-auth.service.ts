import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAppAuth } from '@octokit/auth-app';
import { GithubAuthError } from './errors';

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class GithubAppAuthService {
  private readonly appId: string;
  private readonly privateKey: string;
  private readonly tokenCache = new Map<number, CachedToken>();

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.getOrThrow<string>('GITHUB_APP_ID');
    // Ensure newlines in the private key are properly formatted if loaded from env
    this.privateKey = this.configService
      .getOrThrow<string>('GITHUB_APP_PRIVATE_KEY')
      .replace(/\\n/g, '\n');
  }

  /**
   * Exchanges the GitHub App credentials and installation ID for an installation access token.
   * Caches the token in-memory to avoid redundant API calls.
   */
  async getInstallationToken(installationId: number): Promise<string> {
    const cached = this.tokenCache.get(installationId);
    const now = Date.now();

    // Add a 60-second buffer to token expiration to avoid race conditions
    if (cached && cached.expiresAt > now + 60000) {
      return cached.token;
    }

    try {
      const auth = createAppAuth({
        appId: this.appId,
        privateKey: this.privateKey,
      });

      const installationAuthentication = await auth({
        type: 'installation',
        installationId,
      });

      // Octokit auth-app returns expiresAt as a string (ISO 8601 date)
      const expiresAt = new Date(
        installationAuthentication.expiresAt,
      ).getTime();

      this.tokenCache.set(installationId, {
        token: installationAuthentication.token,
        expiresAt,
      });

      return installationAuthentication.token;
    } catch (error) {
      if (error instanceof Error) {
        throw new GithubAuthError(
          `Failed to authenticate GitHub App installation: ${error.message}`,
        );
      }
      throw new GithubAuthError(
        'Failed to authenticate GitHub App installation',
      );
    }
  }

  /**
   * Clear the cache for testing or manual invalidation
   */
  clearCache(): void {
    this.tokenCache.clear();
  }
}
