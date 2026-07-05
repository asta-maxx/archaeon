import { Module } from '@nestjs/common';
import { AiExtractionModule } from '../ai-extraction/ai-extraction.module';
import { ConfidenceScoringService } from './confidence-scoring.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { QualityFilterService } from './quality-filter.service';
import { RetryOrchestratorService } from './retry-orchestrator.service';
import { ValidationService } from './validation.service';

@Module({
  imports: [AiExtractionModule],
  providers: [
    ConfidenceScoringService,
    DuplicateDetectionService,
    QualityFilterService,
    RetryOrchestratorService,
    ValidationService,
  ],
  exports: [ValidationService],
})
export class ValidationModule {}
