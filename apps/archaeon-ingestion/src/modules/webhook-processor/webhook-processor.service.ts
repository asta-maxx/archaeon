import { Injectable, Logger } from '@nestjs/common';
import { PipelineService } from '../pipeline/pipeline.service';
import { WebhookNormalizerService } from './webhook-normalizer.service';
import { ScopeCalculatorService } from './scope-calculator.service';
import { PipelineResult, JobContext } from '../../shared/types';

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private readonly pipelineService: PipelineService,
    private readonly normalizerService: WebhookNormalizerService,
    private readonly scopeCalculator: ScopeCalculatorService,
  ) {}

  public async process(
    jobId: string,
    githubEventName: string,
    githubEventBody: any,
    installationId: number,
  ): Promise<PipelineResult | { status: 'skipped'; reason: string }> {
    this.logger.log(
      `Processing webhook event '${githubEventName}' for job ${jobId}`,
    );

    const summary = this.normalizerService.parse(
      githubEventBody,
      githubEventName,
    );
    if (!summary) {
      const reason = 'Unsupported or invalid webhook event type/payload.';
      this.logger.log(`Webhook job ${jobId} skipped: ${reason}`);
      return { status: 'skipped', reason };
    }

    const scope = this.scopeCalculator.calculateScope(summary);

    const jobContext: JobContext = {
      jobId,
      repository: {
        owner: summary.repository.owner,
        name: summary.repository.name,
        ref: summary.repository.ref,
        installationId,
      },
      scope,
    };

    this.logger.log(
      `Invoking pipeline for job ${jobId} with scope: ${JSON.stringify(scope)}`,
    );
    return this.pipelineService.run(jobContext);
  }
}
