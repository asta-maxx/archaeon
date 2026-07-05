import { GithubClientError } from './github-client.error';

export class GithubRateLimitExceededError extends GithubClientError {
  public readonly retryable = true;

  constructor(message: string = 'GitHub rate limit exceeded') {
    super(message);
  }
}
