import { GithubClientError } from './github-client.error';

export class GithubNotFoundError extends GithubClientError {
  constructor(message: string = 'GitHub resource not found') {
    super(message);
  }
}
