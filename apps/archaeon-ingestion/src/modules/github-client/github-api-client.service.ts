import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { GithubAppAuthService } from './github-app-auth.service';
import {
  GithubRateLimitExceededError,
  GithubClientError,
  GithubNotFoundError,
} from './errors';

export interface GithubApiClientOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
}

@Injectable()
export class GithubApiClientService {
  private readonly maxRetries: number;
  private readonly initialBackoffMs: number;
  private readonly timeoutMs: number;

  constructor(
    private readonly authService: GithubAppAuthService,
    private readonly configService: ConfigService,
  ) {
    this.maxRetries = 3;
    this.initialBackoffMs = 1000;
    this.timeoutMs =
      this.configService.get<number>('GITHUB_TIMEOUT_MS') || 10000;
  }

  /**
   * Helper to sleep for exponential backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * General request wrapper handling auth injection, 403/429 rate limit errors, and exponential backoff.
   */
  async request<T = unknown>(
    installationId: number,
    route: string,
    options: Record<string, unknown> = {},
  ): Promise<T> {
    const jobCache = options.jobCache as Map<string, any>;
    if (jobCache) {
      delete options.jobCache;
    }

    const cacheKey = jobCache ? `${route}:${JSON.stringify(options)}` : null;
    if (jobCache && jobCache.has(cacheKey!)) {
      return jobCache.get(cacheKey!);
    }

    let attempt = 0;

    // Apply explicit timeout
    options.request = {
      ...((options.request as any) || {}),
      timeout: this.timeoutMs,
    };

    while (attempt <= this.maxRetries) {
      try {
        const token =
          await this.authService.getInstallationToken(installationId);
        const octokit = new Octokit({ auth: token });

        const response = await octokit.request(route, options);

        if (jobCache) {
          jobCache.set(cacheKey!, response.data);
        }

        return response.data;
      } catch (e: unknown) {
        const error = e as any;
        // Octokit error format: error.status is the HTTP status code
        const status = error.status;

        if (status === 404) {
          throw new GithubNotFoundError(`Resource not found: ${route}`);
        }

        // 403 with x-ratelimit-remaining == 0 or 429 are rate limit errors
        const isRateLimit =
          status === 429 ||
          (status === 403 &&
            error.response?.headers?.['x-ratelimit-remaining'] === '0') ||
          (status === 403 &&
            error.message?.toLowerCase().includes('rate limit'));

        if (isRateLimit) {
          if (attempt >= this.maxRetries) {
            throw new GithubRateLimitExceededError(
              `GitHub rate limit exceeded. Max retries (${this.maxRetries}) exhausted.`,
            );
          }

          // Exponential backoff
          const backoff = this.initialBackoffMs * Math.pow(2, attempt);
          await this.sleep(backoff);
          attempt++;
          continue;
        }

        throw new GithubClientError(
          `GitHub API request failed: ${error.message || 'Unknown error'}`,
        );
      }
    }

    // Should never theoretically hit this due to throw inside the loop
    throw new GithubClientError('Exhausted retries unexpectedly');
  }

  async getCommits(
    installationId: number,
    owner: string,
    repo: string,
    ref: string,
    since?: string,
    jobCache?: Map<string, any>,
  ): Promise<unknown[]> {
    const options: Record<string, unknown> = {
      owner,
      repo,
      sha: ref,
      per_page: 100,
      jobCache,
    };
    if (since) options.since = since;
    return this.request<unknown[]>(
      installationId,
      'GET /repos/{owner}/{repo}/commits',
      options,
    );
  }

  async getPullRequests(
    installationId: number,
    owner: string,
    repo: string,
    state: string = 'all',
    jobCache?: Map<string, any>,
  ): Promise<unknown[]> {
    return this.request<unknown[]>(
      installationId,
      'GET /repos/{owner}/{repo}/pulls',
      { owner, repo, state, per_page: 100, jobCache },
    );
  }

  async getFiles(
    installationId: number,
    owner: string,
    repo: string,
    ref: string,
    jobCache?: Map<string, any>,
  ): Promise<unknown> {
    // To get a full file tree, we use the Git Trees API recursively.
    return this.request<unknown>(
      installationId,
      'GET /repos/{owner}/{repo}/git/trees/{ref}',
      {
        owner,
        repo,
        ref,
        recursive: '1',
        jobCache,
      },
    );
  }

  async getBranches(
    installationId: number,
    owner: string,
    repo: string,
    jobCache?: Map<string, any>,
  ): Promise<unknown[]> {
    return this.request<unknown[]>(
      installationId,
      'GET /repos/{owner}/{repo}/branches',
      { owner, repo, per_page: 100, jobCache },
    );
  }
}
