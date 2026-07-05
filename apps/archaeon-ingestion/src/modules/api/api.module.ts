import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PipelineModule } from '../pipeline/pipeline.module';
import { WebhookProcessorModule } from '../webhook-processor/webhook-processor.module';
import { AnalyzeController } from './analyze.controller';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [ConfigModule, PipelineModule, WebhookProcessorModule],
  controllers: [AnalyzeController, WebhookController],
})
export class ApiModule {}
