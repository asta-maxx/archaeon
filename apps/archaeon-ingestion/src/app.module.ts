import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from './config/app-config.module';
import { HealthModule } from './modules/health/health.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { ThrottlerModule } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { Request } from 'express';

import { GithubClientModule } from './modules/github-client/github-client.module';
import { RepositoryFetcherModule } from './modules/repository-fetcher/repository-fetcher.module';
import { NormalizerModule } from './modules/normalizer/normalizer.module';
import { AiExtractionModule } from './modules/ai-extraction/ai-extraction.module';
import { ValidationModule } from './modules/validation/validation.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { WebhookProcessorModule } from './modules/webhook-processor/webhook-processor.module';
import { ApiModule } from './modules/api/api.module';
import { BackendClientModule } from './modules/backend-client/backend-client.module';

@Module({
  imports: [
    GithubClientModule,
    RepositoryFetcherModule,
    NormalizerModule,
    AiExtractionModule,
    ValidationModule,
    PipelineModule,
    WebhookProcessorModule,
    ApiModule,
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        genReqId: (req) => {
          const r = req as Request;
          return (
            (r.headers['x-job-id'] as string) || r.id || crypto.randomUUID()
          );
        },
        customProps: (req) => {
          const r = req as Request;
          return { jobId: r.id };
        },
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    HealthModule,
    WorkspaceModule,
    BackendClientModule,
  ],
})
export class AppModule {}
