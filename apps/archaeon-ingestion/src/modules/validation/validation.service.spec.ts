import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import { RetryOrchestratorService } from './retry-orchestrator.service';
import { AiExtractionService } from '../ai-extraction/ai-extraction.service';
import { ConfidenceScoringService } from './confidence-scoring.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { QualityFilterService } from './quality-filter.service';
import {
  ArchitectureDecisionCandidate,
  NormalizedAdrCandidate,
  ArchitectureDecision,
} from '../../shared/types';
import { SchemaValidationError } from '../ai-extraction/errors';

describe('ValidationService', () => {
  let service: ValidationService;
  let mockRetryOrchestrator: jest.Mocked<RetryOrchestratorService>;
  let mockAiExtraction: jest.Mocked<AiExtractionService>;
  let mockConfidenceScoring: jest.Mocked<ConfidenceScoringService>;
  let mockDuplicateDetection: jest.Mocked<DuplicateDetectionService>;
  let mockQualityFilter: jest.Mocked<QualityFilterService>;

  beforeEach(async () => {
    mockRetryOrchestrator = {
      executeWithRetry: jest.fn(),
    } as any;

    mockAiExtraction = {
      extract: jest.fn(),
    } as any;

    mockConfidenceScoring = {
      score: jest.fn(),
    };

    mockDuplicateDetection = {
      deduplicate: jest.fn(),
    } as any;

    mockQualityFilter = {
      filter: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        { provide: RetryOrchestratorService, useValue: mockRetryOrchestrator },
        { provide: AiExtractionService, useValue: mockAiExtraction },
        { provide: ConfidenceScoringService, useValue: mockConfidenceScoring },
        {
          provide: DuplicateDetectionService,
          useValue: mockDuplicateDetection,
        },
        { provide: QualityFilterService, useValue: mockQualityFilter },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty result if no candidates provided', async () => {
    const result = await service.validate([]);
    expect(result.decisions).toHaveLength(0);
    expect(result.metrics.totalExtracted).toBe(0);
    expect(result.metrics.tokensUsed).toBe(0);
    expect(mockRetryOrchestrator.executeWithRetry).not.toHaveBeenCalled();
  });

  it('should return empty result if extraction fails entirely', async () => {
    mockRetryOrchestrator.executeWithRetry.mockRejectedValue(
      new SchemaValidationError('fail'),
    );

    const candidates: NormalizedAdrCandidate[] = [
      { sourceType: 'file', sourceRef: '1', rawText: '', context: '' },
    ];
    const result = await service.validate(candidates);

    expect(result.decisions).toHaveLength(0);
    expect(result.metrics.totalExtracted).toBe(0);
    expect(result.metrics.tokensUsed).toBe(0);
    // retryCount would be whatever retries we tracked if we caught it from the orchestrator, but since it throws we don't know easily inside validate() unless orchestrator tells us, but we default to 0 on crash.
    expect(result.metrics.retryCount).toBe(0);
  });

  it('should orchestrate the full validation pipeline', async () => {
    const candidates: NormalizedAdrCandidate[] = [
      { sourceType: 'file', sourceRef: '1', rawText: '', context: '' },
    ];

    const extracted: ArchitectureDecisionCandidate[] = [
      {
        id: 'adr-1',
        title: 'Test 1',
        description: '',
        rationale: '',
        alternatives: [],
        sourceRefs: [],
        extractedAt: '',
      },
      {
        id: 'adr-2',
        title: 'Test 2',
        description: '',
        rationale: '',
        alternatives: [],
        sourceRefs: [],
        extractedAt: '',
      },
      {
        id: 'adr-3',
        title: 'Test 3',
        description: '',
        rationale: '',
        alternatives: [],
        sourceRefs: [],
        extractedAt: '',
      },
    ];

    mockRetryOrchestrator.executeWithRetry.mockResolvedValue({
      result: {
        candidates: extracted,
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      },
      retries: 1,
    });

    mockConfidenceScoring.score
      .mockReturnValueOnce({ score: 90, confidence: 'high' }) // adr-1
      .mockReturnValueOnce({ score: 50, confidence: 'medium' }) // adr-2
      .mockReturnValueOnce({ score: 20, confidence: 'low' }); // adr-3

    // Mock duplicate detection (modifies in place)
    mockDuplicateDetection.deduplicate.mockImplementation((decisions) => {
      decisions[1].duplicateOf = 'adr-1';
    });

    // Mock quality filter
    mockQualityFilter.filter.mockImplementation((decisions) => {
      // Keep only high and medium
      return decisions.filter((d) => d.confidenceScore >= 45);
    });

    const result = await service.validate(candidates);

    expect(result.decisions).toHaveLength(2); // adr-1 and adr-2 kept (adr-3 dropped by filter)
    expect(result.metrics.totalExtracted).toBe(3);
    expect(result.metrics.tokensUsed).toBe(30);
    expect(result.metrics.retryCount).toBe(1);
    expect(result.metrics.droppedCount).toBe(1); // adr-3
    expect(result.metrics.duplicateCount).toBe(1); // adr-2 is a duplicate

    expect(result.metrics.confidenceDistribution).toEqual({
      high: 1,
      medium: 1,
      low: 0, // It got dropped, but distribution tracks the *passed* decisions
    });
  });
});
