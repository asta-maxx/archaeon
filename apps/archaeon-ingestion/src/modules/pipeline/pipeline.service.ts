import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceService } from '../workspace/workspace.service';
import { RepositoryFetcherService } from '../repository-fetcher/repository-fetcher.service';
import { NormalizerService } from '../normalizer/normalizer.service';
import { ValidationService } from '../validation/validation.service';
import { BackendClientService } from '../backend-client/backend-client.service';
import { JobContext, PipelineResult, PipelineLog, ArchitectureDecision } from '../../shared/types';
import { GithubRateLimitExceededError } from '../github-client/errors';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly repositoryFetcher: RepositoryFetcherService,
    private readonly normalizer: NormalizerService,
    private readonly validation: ValidationService,
    private readonly backendClient: BackendClientService,
  ) {}

  public async run(jobContext: JobContext): Promise<PipelineResult> {
    const startTime = Date.now();
    const logs: PipelineLog[] = [];
    const pushLog = (level: 'info' | 'warn' | 'error', message: string) => {
      const loggerMethod = level === 'info' ? 'log' : level;
      this.logger[loggerMethod](`[Job ${jobContext.jobId}] ${message}`);
      logs.push({ level, message, timestamp: new Date().toISOString() });
    };

    let status: PipelineResult['status'] = 'success';
    let errorDetails: PipelineResult['errorDetails'] = undefined;
    let finalDecisions: ArchitectureDecision[] = [];
    const metrics = this.emptyMetrics();

    pushLog('info', 'Pipeline started');

    try {
      pushLog('info', 'Creating workspace');
      await this.workspaceService.createJobWorkspace(jobContext.jobId);

      pushLog('info', 'Fetching repository data');
      const rawRepoData = await this.repositoryFetcher.fetchRepository(
        jobContext.jobId,
        jobContext.repository.installationId,
        jobContext.repository.owner,
        jobContext.repository.name,
        jobContext.repository.ref,
        jobContext.scope,
      );

      pushLog('info', 'Normalizing repository data');
      const normalizedData = this.normalizer.normalize(rawRepoData);

      // Check for partial normalization failures
      const rawCommitsCount = rawRepoData.commits?.length || 0;
      const rawPrsCount = rawRepoData.pullRequests?.length || 0;
      const rawFilesCount = rawRepoData.fileManifest?.length || 0;

      const normCommitsCount = normalizedData.commits?.length || 0;
      const normPrsCount = normalizedData.pullRequests?.length || 0;
      const normFilesCount = normalizedData.files?.length || 0;

      if (
        rawCommitsCount !== normCommitsCount ||
        rawPrsCount !== normPrsCount ||
        rawFilesCount !== normFilesCount
      ) {
        status = 'partial';
        pushLog('warn', 'Partial normalization detected');
      }

      pushLog('info', 'Validating and extracting architecture decisions');
      const validationResult = await this.validation.validate(
        normalizedData.adrCandidates,
      );

      finalDecisions = validationResult.decisions;

      metrics.tokensUsed = validationResult.metrics.tokensUsed;
      metrics.retries = validationResult.metrics.retryCount;
      metrics.decisionsExtracted = finalDecisions.length;
      metrics.confidenceDistribution =
        validationResult.metrics.confidenceDistribution;

      // Check for complete AI failure
      if (
        normalizedData.adrCandidates.length > 0 &&
        validationResult.metrics.totalExtracted === 0
      ) {
        status = 'failed';
        pushLog('error', 'AI extraction fully failed for the batch');
        errorDetails = {
          message:
            'AI extraction exhausted retries and failed to parse candidates.',
          retryable: false,
        };
      } else {
        pushLog('info', 'Validation completed');
      }
    } catch (error: any) {
      status = 'failed';
      if (error instanceof GithubRateLimitExceededError) {
        pushLog('error', `GitHub Rate Limit Exceeded: ${error.message}`);
        errorDetails = {
          message: error.message,
          retryable: true,
        };
      } else {
        pushLog(
          'error',
          `Unexpected error during pipeline execution: ${error.stack || error.message}`,
        );
        errorDetails = {
          message: error.message,
          retryable: false,
        };
      }
    } finally {
      pushLog('info', 'Destroying workspace');
      try {
        await this.workspaceService.destroyJobWorkspace(jobContext.jobId);
      } catch (cleanupError: any) {
        pushLog(
          'error',
          `Failed to destroy workspace: ${cleanupError.message}`,
        );
        // We do not change job status to failed just because cleanup failed,
        // but it is logged.
      }
    }

    metrics.durationMs = Date.now() - startTime;
    pushLog('info', `Pipeline finished with status: ${status}`);

    this.logger.log({
      msg: 'Pipeline Summary',
      jobId: jobContext.jobId,
      status,
      metrics,
      error: errorDetails?.message,
    });

    const resultPayload = {
      status,
      decisions: finalDecisions,
      metrics,
      logs,
      ...(errorDetails && { errorDetails }),
    };

    // Asynchronously report the result to the backend. We do not await this,
    // so we can return the response to the original webhook caller quickly.
    void this.backendClient.reportPipelineResult(jobContext.jobId, resultPayload);

    return resultPayload;
  }

  private emptyMetrics() {
    return {
      durationMs: 0,
      tokensUsed: 0,
      retries: 0,
      decisionsExtracted: 0,
      confidenceDistribution: {
        high: 0,
        medium: 0,
        low: 0,
      },
    };
  }
}
