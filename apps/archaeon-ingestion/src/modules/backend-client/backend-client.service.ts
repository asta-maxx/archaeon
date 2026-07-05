import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PipelineResult } from '../../shared/types';
import { lastValueFrom } from 'rxjs';
import { EnvironmentVariables } from '../../config/env.validation';

@Injectable()
export class BackendClientService {
  private readonly logger = new Logger(BackendClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  public async reportPipelineResult(
    jobId: string,
    result: PipelineResult,
  ): Promise<void> {
    const backendUrl = this.configService.get<string>('ARCHAEON_BACKEND_URL');
    const internalApiKey = this.configService.get<string>('INTERNAL_API_KEY');

    if (!backendUrl) {
      this.logger.warn(
        'ARCHAEON_BACKEND_URL is not configured. Skipping callback.',
      );
      return;
    }

    const payload = {
      jobId,
      ...result,
    };

    const endpoint = `${backendUrl.replace(/\/$/, '')}/api/internal/repository/process/`;

    this.logger.log(`Reporting pipeline result to backend for job ${jobId}`);

    try {
      await lastValueFrom(
        this.httpService.post(endpoint, payload, {
          headers: {
            'Content-Type': 'application/json',
            ...(internalApiKey ? { 'X-Internal-Api-Key': internalApiKey } : {}),
          },
        }),
      );
      this.logger.log(`Successfully reported pipeline result for job ${jobId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to report pipeline result for job ${jobId} to backend: ${error.message}`,
        error.stack,
      );
      // Don't throw error to avoid failing the main job if the callback fails.
    }
  }
}
