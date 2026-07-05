import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventSummary } from '../../shared/types';

@Injectable()
export class WebhookNormalizerService {
  private readonly logger = new Logger(WebhookNormalizerService.name);

  public parse(
    githubEvent: any,
    githubEventName: string, // X-GitHub-Event header
  ): WebhookEventSummary | null {
    if (!githubEvent || typeof githubEvent !== 'object') {
      this.logger.warn('Skipping webhook: payload is empty or not an object.');
      return null;
    }

    if (!githubEvent.repository) {
      this.logger.warn('Skipping webhook: payload missing repository info.');
      return null;
    }

    if (githubEventName === 'push') {
      return this.parsePushEvent(githubEvent);
    } else if (githubEventName === 'pull_request') {
      return this.parsePullRequestEvent(githubEvent);
    }

    this.logger.log(
      `Skipping unsupported webhook event type: ${githubEventName}`,
    );
    return null;
  }

  private parsePushEvent(event: any): WebhookEventSummary | null {
    // Only care about commits on a branch, skip tag pushes etc if necessary, but
    // for now we'll accept any push that has commits.
    const changedPaths = new Set<string>();

    if (Array.isArray(event.commits)) {
      for (const commit of event.commits) {
        if (Array.isArray(commit.added))
          commit.added.forEach((f: string) => changedPaths.add(f));
        if (Array.isArray(commit.modified))
          commit.modified.forEach((f: string) => changedPaths.add(f));
        if (Array.isArray(commit.removed))
          commit.removed.forEach((f: string) => changedPaths.add(f));
      }
    }

    return {
      eventType: 'push',
      repository: {
        owner: event.repository.owner?.login || event.repository.owner?.name,
        name: event.repository.name,
        ref: event.ref || '',
      },
      changedPaths: Array.from(changedPaths),
    };
  }

  private parsePullRequestEvent(event: any): WebhookEventSummary | null {
    // Only act on specific PR actions (opened, synchronize, reopened)
    const action = event.action;
    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      this.logger.log(`Skipping PR webhook action: ${action}`);
      return null;
    }

    const pr = event.pull_request;
    if (!pr) {
      this.logger.warn('Skipping PR webhook: missing pull_request object.');
      return null;
    }

    // A PR payload does not directly contain the list of changed files.
    // It will be handled in ScopeCalculatorService -> JobScope.
    return {
      eventType: 'pull_request',
      repository: {
        owner: event.repository.owner?.login || event.repository.owner?.name,
        name: event.repository.name,
        ref: pr.head?.ref || '',
      },
      changedPaths: [],
      prNumber: pr.number,
    };
  }
}
