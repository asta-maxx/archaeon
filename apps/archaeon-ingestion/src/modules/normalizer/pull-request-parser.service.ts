import { Injectable, Logger } from '@nestjs/common';
import { NormalizedPullRequest } from '../../shared/types';

@Injectable()
export class PullRequestParserService {
  private readonly logger = new Logger(PullRequestParserService.name);

  /**
   * Parses raw PR data into NormalizedPullRequest array.
   */
  public parse(rawPrs: any[]): NormalizedPullRequest[] {
    if (!Array.isArray(rawPrs)) {
      this.logger.warn('Expected rawPrs to be an array, returning empty list');
      return [];
    }

    const normalized: NormalizedPullRequest[] = [];

    for (const raw of rawPrs) {
      try {
        const parsed = this.parseSingle(raw);
        if (parsed) {
          normalized.push(parsed);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse PR record: ${(error as Error).message}`,
        );
      }
    }

    return normalized;
  }

  private parseSingle(raw: any): NormalizedPullRequest | null {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Raw PR is not an object');
    }

    const number = raw.number;
    if (typeof number !== 'number') {
      throw new Error('Missing or invalid PR number');
    }

    const title = typeof raw.title === 'string' ? raw.title : 'Untitled';
    const body = typeof raw.body === 'string' ? raw.body : '';

    let author = 'unknown';
    if (
      raw.user &&
      typeof raw.user === 'object' &&
      typeof raw.user.login === 'string'
    ) {
      author = raw.user.login;
    }

    let state: 'open' | 'closed' | 'all' = 'open';
    if (raw.state === 'closed' || raw.state === 'all') {
      state = raw.state;
    }

    const mergedAt = typeof raw.merged_at === 'string' ? raw.merged_at : null;

    const filesChanged: string[] = [];
    // GitHub PR lists don't always include files changed, but if we fetch them via PR files API,
    // they might be attached. Let's assume they could be in `files`.
    if (Array.isArray(raw.files)) {
      for (const file of raw.files) {
        if (file && typeof file.filename === 'string') {
          filesChanged.push(file.filename);
        }
      }
    }

    // Heuristic linking for commits: extract #123 or commit SHAs from body?
    // Actually, linkedCommits usually means commits that are PART of the PR.
    // If the raw data contains a `commits` array (from a PR commits fetch), we extract them.
    const linkedCommits: string[] = [];
    if (Array.isArray(raw.commits)) {
      for (const commit of raw.commits) {
        if (commit && typeof commit.sha === 'string') {
          linkedCommits.push(commit.sha);
        }
      }
    }

    return {
      number,
      title,
      body,
      author,
      state,
      mergedAt,
      filesChanged,
      linkedCommits,
    };
  }
}
