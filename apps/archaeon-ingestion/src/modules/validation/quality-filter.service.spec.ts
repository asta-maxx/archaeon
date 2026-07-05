import { Test, TestingModule } from '@nestjs/testing';
import { QualityFilterService } from './quality-filter.service';
import { ArchitectureDecision } from '../../shared/types';

describe('QualityFilterService', () => {
  let service: QualityFilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QualityFilterService],
    }).compile();

    service = module.get<QualityFilterService>(QualityFilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const getBaseDecision = (
    id: string,
    title: string,
    score: number,
  ): ArchitectureDecision => ({
    id,
    title,
    description: '',
    rationale: '',
    alternatives: [],
    sourceRefs: [],
    extractedAt: '2023-01-01',
    confidence: score > 70 ? 'high' : 'low',
    confidenceScore: score,
  });

  it('should keep decisions above or equal to threshold', () => {
    const decisions = [
      getBaseDecision('1', 'Good', 80),
      getBaseDecision('2', 'Borderline', 45),
    ];

    const result = service.filter(decisions, { minConfidenceScore: 45 });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });

  it('should drop decisions below threshold', () => {
    const decisions = [
      getBaseDecision('1', 'Good', 80),
      getBaseDecision('2', 'Bad', 20),
    ];

    const result = service.filter(decisions, { minConfidenceScore: 45 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});
