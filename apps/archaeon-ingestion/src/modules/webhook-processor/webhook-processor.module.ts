import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PipelineModule } from '../pipeline/pipeline.module';
import { WebhookNormalizerService } from './webhook-normalizer.service';
import { ScopeCalculatorService } from './scope-calculator.service';
import { WebhookProcessorService } from './webhook-processor.service';

@Module({
  imports: [ConfigModule, PipelineModule],
  providers: [
    WebhookNormalizerService,
    ScopeCalculatorService,
    WebhookProcessorService,
  ],
  exports: [WebhookProcessorService],
})
export class WebhookProcessorModule {}
