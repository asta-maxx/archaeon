import { Injectable, Logger } from '@nestjs/common';
import { AiExtractionService } from '../ai-extraction/ai-extraction.service';
import { RetryOrchestratorService } from './retry-orchestrator.service';
import { ConfidenceScoringService } from './confidence-scoring.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { QualityFilterService } from './quality-filter.service';
import {
  NormalizedAdrCandidate,
  ArchitectureDecision,
} from '../../shared/types';

export interface ValidationMetrics {
  totalExtracted: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  tokensUsed: number;
  droppedCount: number;
  duplicateCount: number;
  retryCount: number;
}

export interface ValidationResult {
  decisions: ArchitectureDecision[];
  metrics: ValidationMetrics;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    private readonly retryOrchestrator: RetryOrchestratorService,
    private readonly aiExtraction: AiExtractionService,
    private readonly confidenceScoring: ConfidenceScoringService,
    private readonly duplicateDetection: DuplicateDetectionService,
    private readonly qualityFilter: QualityFilterService,
  ) {}

  public async validate(
    candidates: NormalizedAdrCandidate[],
  ): Promise<ValidationResult> {
    if (!candidates || candidates.length === 0) {
      return this.emptyResult();
    }

    // 1. Retry Recovery & Extraction
    let extractedCandidates = [];
    let retries = 0;
    let tokensUsed = 0;

    try {
      const response = await this.retryOrchestrator.executeWithRetry(
        () => this.aiExtraction.extract(candidates),
        { maxAttempts: 3, baseBackoffMs: 1000 },
        'AI Extraction',
      );
      extractedCandidates = response.result.candidates;
      tokensUsed = response.result.usage?.totalTokens || 0;
      retries = response.retries;
    } catch (error: any) {
      this.logger.error(
        `Failed to extract candidates after retries: ${error.message}`,
      );
      // As specified in the implementation plan, if the batch exhausts retries,
      // we log the failure and return an empty list of extracted candidates for that batch.
      return this.emptyResult(retries);
    }

    const totalExtracted = extractedCandidates.length;

    // 2. Base mapping to ArchitectureDecision
    const decisions: ArchitectureDecision[] = extractedCandidates.map((c) => ({
      ...c,
      confidence: 'low',
      confidenceScore: 0,
    }));

    // 3. Confidence Scoring
    for (const decision of decisions) {
      const { score, confidence } = this.confidenceScoring.score(
        decision,
        candidates,
      );
      decision.confidenceScore = score;
      decision.confidence = confidence;
    }

    // 4. Deduplication
    this.duplicateDetection.deduplicate(decisions);
    const duplicateCount = decisions.filter((d) => !!d.duplicateOf).length;

    // 5. Quality Filter
    const filteredDecisions = this.qualityFilter.filter(decisions);
    const droppedCount = decisions.length - filteredDecisions.length;

    // Build metrics
    const metrics: ValidationMetrics = {
      totalExtracted,
      confidenceDistribution: {
        high: filteredDecisions.filter((d) => d.confidence === 'high').length,
        medium: filteredDecisions.filter((d) => d.confidence === 'medium')
          .length,
        low: filteredDecisions.filter((d) => d.confidence === 'low').length,
      },
      tokensUsed,
      droppedCount,
      duplicateCount,
      retryCount: retries,
    };

    return {
      decisions: filteredDecisions,
      metrics,
    };
  }

  private emptyResult(retries: number = 0): ValidationResult {
    return {
      decisions: [],
      metrics: {
        totalExtracted: 0,
        confidenceDistribution: { high: 0, medium: 0, low: 0 },
        tokensUsed: 0,
        droppedCount: 0,
        duplicateCount: 0,
        retryCount: retries,
      },
    };
  }
}
