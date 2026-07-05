import { GithubClientError } from './github-client.error';

export class GithubAuthError extends GithubClientError {
  constructor(message: string = 'GitHub authentication failed') {
    super(message);
  }
}
