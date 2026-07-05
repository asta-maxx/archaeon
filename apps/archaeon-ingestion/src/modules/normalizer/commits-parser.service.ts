import { Injectable, Logger } from '@nestjs/common';
import { NormalizedCommit } from '../../shared/types';

@Injectable()
export class CommitsParserService {
  private readonly logger = new Logger(CommitsParserService.name);

  /**
   * Parses raw commit data into NormalizedCommit array.
   * Gracefully handles and skips malformed records.
   */
  public parse(rawCommits: any[]): NormalizedCommit[] {
    if (!Array.isArray(rawCommits)) {
      this.logger.warn(
        'Expected rawCommits to be an array, returning empty list',
      );
      return [];
    }

    const normalized: NormalizedCommit[] = [];

    for (const raw of rawCommits) {
      try {
        const parsed = this.parseSingle(raw);
        if (parsed) {
          normalized.push(parsed);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse commit record: ${(error as Error).message}`,
        );
      }
    }

    return normalized;
  }

  private parseSingle(raw: any): NormalizedCommit | null {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Raw commit is not an object');
    }

    const sha = raw.sha;
    if (!sha || typeof sha !== 'string') {
      throw new Error('Missing or invalid sha');
    }

    const commitObj = raw.commit;
    if (!commitObj || typeof commitObj !== 'object') {
      throw new Error(`Missing commit object for sha ${sha}`);
    }

    const message = commitObj.message;
    if (typeof message !== 'string') {
      throw new Error(`Missing or invalid message for sha ${sha}`);
    }

    let author = 'unknown';
    let date = new Date(0).toISOString();

    if (commitObj.author && typeof commitObj.author === 'object') {
      if (typeof commitObj.author.name === 'string') {
        author = commitObj.author.name;
      }
      if (typeof commitObj.author.date === 'string') {
        date = commitObj.author.date;
      }
    }

    const filesChanged: string[] = [];
    if (Array.isArray(raw.files)) {
      for (const file of raw.files) {
        if (file && typeof file.filename === 'string') {
          filesChanged.push(file.filename);
        }
      }
    }

    return {
      sha,
      author,
      date,
      message,
      filesChanged,
    };
  }
}
