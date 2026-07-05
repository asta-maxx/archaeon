import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NormalizedAdrCandidate,
  NormalizedCommit,
  NormalizedFile,
  NormalizedPullRequest,
} from '../../shared/types';

@Injectable()
export class AdrParserService {
  private readonly logger = new Logger(AdrParserService.name);
  private commitPattern: RegExp;
  private prPattern: RegExp;
  private filePathPattern: RegExp;

  constructor(private readonly configService: ConfigService) {
    const defaultCommitPattern = '^(adr|decision|architecture):';
    const defaultPrPattern = '(adr|decision|architecture)';
    const defaultFilePathPattern = 'docs/adr/.*\\.md$';

    this.commitPattern = new RegExp(
      this.configService.get<string>(
        'ADR_COMMIT_PATTERN',
        defaultCommitPattern,
      ),
      'i',
    );
    this.prPattern = new RegExp(
      this.configService.get<string>('ADR_PR_PATTERN', defaultPrPattern),
      'i',
    );
    this.filePathPattern = new RegExp(
      this.configService.get<string>(
        'ADR_FILE_PATH_PATTERN',
        defaultFilePathPattern,
      ),
      'i',
    );
  }

  public parse(
    commits: NormalizedCommit[],
    prs: NormalizedPullRequest[],
    files: NormalizedFile[],
  ): NormalizedAdrCandidate[] {
    const candidates: NormalizedAdrCandidate[] = [];

    // Filter Commits
    for (const commit of commits) {
      if (this.commitPattern.test(commit.message)) {
        candidates.push({
          sourceType: 'commit',
          sourceRef: commit.sha,
          rawText: commit.message,
          context: `Commit by ${commit.author} on ${commit.date}`,
        });
      }
    }

    // Filter PRs
    for (const pr of prs) {
      if (this.prPattern.test(pr.title) || this.prPattern.test(pr.body)) {
        candidates.push({
          sourceType: 'pr',
          sourceRef: pr.number.toString(),
          rawText: `${pr.title}\n${pr.body}`,
          context: `PR #${pr.number} by ${pr.author} (State: ${pr.state})`,
        });
      }
    }

    // Filter Files
    for (const file of files) {
      if (this.filePathPattern.test(file.path)) {
        candidates.push({
          sourceType: 'file',
          sourceRef: file.path,
          rawText: file.content || '',
          context: `File ${file.path} (${file.sizeBytes} bytes)`,
        });
      }
    }

    this.logger.debug(
      `Found ${candidates.length} ADR candidates across all sources`,
    );
    return candidates;
  }
}
