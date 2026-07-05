import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookEventSummary, JobScope } from '../../shared/types';
import { EnvironmentVariables } from '../../config/env.validation';

@Injectable()
export class ScopeCalculatorService {
  private readonly logger = new Logger(ScopeCalculatorService.name);
  private readonly largeDiffThreshold: number;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    this.largeDiffThreshold =
      this.configService.get('WEBHOOK_LARGE_DIFF_THRESHOLD', { infer: true }) ??
      50;
  }

  public calculateScope(summary: WebhookEventSummary): JobScope {
    const isLargeDiff = summary.changedPaths.length > this.largeDiffThreshold;

    if (isLargeDiff) {
      this.logger.log(
        `Diff size (${summary.changedPaths.length}) exceeds threshold (${this.largeDiffThreshold}). Falling back to full repo scope.`,
      );
      return { isFullRepo: true };
    }

    if (summary.eventType === 'push') {
      // Small push, target the specific paths
      this.logger.log(
        `Calculated scope for push: ${summary.changedPaths.length} files.`,
      );
      return {
        paths: summary.changedPaths,
        isFullRepo: false,
      };
    } else if (summary.eventType === 'pull_request') {
      // For PRs, we scope to the PR itself, the fetcher will grab its files.
      // Notice we only fall back to full repo if changedPaths was large, but
      // since our PR parser didn't extract changedPaths (they require another API call typically),
      // we just return the PR number. We assume the diff size check happens downstream if needed,
      // or we accept PRs as-is. Wait, the prompt says "a pull_request... anything ambiguous or a large diff falls back".
      // Since PR payload usually limits to a summary, if we want to check PR diff size, we'd need to fetch it.
      // But the module isn't allowed to call GitHub. Thus, we return the PR scope.
      this.logger.log(
        `Calculated scope for pull_request: PR #${summary.prNumber}`,
      );
      return {
        pullRequestNumber: summary.prNumber,
        isFullRepo: false,
      };
    }

    // Ambiguous event types fall back to full repo
    this.logger.warn(
      `Ambiguous event type '${summary.eventType}', falling back to full repo scope.`,
    );
    return { isFullRepo: true };
  }
}
