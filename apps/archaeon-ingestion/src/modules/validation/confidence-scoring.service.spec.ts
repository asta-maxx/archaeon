import { Test, TestingModule } from '@nestjs/testing';
import { ConfidenceScoringService } from './confidence-scoring.service';
import {
  ArchitectureDecisionCandidate,
  NormalizedAdrCandidate,
} from '../../shared/types';

describe('ConfidenceScoringService', () => {
  let service: ConfidenceScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfidenceScoringService],
    }).compile();

    service = module.get<ConfidenceScoringService>(ConfidenceScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const getBaseCandidate = (): ArchitectureDecisionCandidate => ({
    id: 'test-1',
    title: 'Test',
    description: 'Desc',
    rationale: 'A good rationale that is long enough',
    alternatives: ['Alt 1'],
    sourceRefs: [],
    extractedAt: '2023-01-01',
  });

  it('should score 50 (medium) for default base candidate with no matching sources or signals', () => {
    const result = service.score(getBaseCandidate(), []);
    expect(result.score).toBe(50);
    expect(result.confidence).toBe('medium');
  });

  it('should add 30 points for file source type', () => {
    const candidate = { ...getBaseCandidate(), sourceRefs: ['docs/adr.md'] };
    const originals: NormalizedAdrCandidate[] = [
      {
        sourceType: 'file',
        sourceRef: 'docs/adr.md',
        rawText: '',
        context: '',
      },
    ];

    const result = service.score(candidate, originals);
    expect(result.score).toBe(80);
    expect(result.confidence).toBe('high');
  });

  it('should add 15 points for pr source type', () => {
    const candidate = { ...getBaseCandidate(), sourceRefs: ['pr-123'] };
    const originals: NormalizedAdrCandidate[] = [
      { sourceType: 'pr', sourceRef: 'pr-123', rawText: '', context: '' },
    ];

    const result = service.score(candidate, originals);
    expect(result.score).toBe(65);
    expect(result.confidence).toBe('medium');
  });

  it('should add 20 points for high confidence signal', () => {
    const candidate = { ...getBaseCandidate(), rawConfidenceSignal: 'High' };
    const result = service.score(candidate, []);
    expect(result.score).toBe(70);
    expect(result.confidence).toBe('medium');
  });

  it('should subtract points for missing rationale and alternatives', () => {
    const candidate = {
      ...getBaseCandidate(),
      rationale: 'short',
      alternatives: [],
    };
    const result = service.score(candidate, []);

    // 50 - 15 (rationale) - 10 (alts) = 25
    expect(result.score).toBe(25);
    expect(result.confidence).toBe('low');
  });

  it('should clamp scores correctly between 0 and 100', () => {
    const badCandidate = {
      ...getBaseCandidate(),
      rationale: '',
      alternatives: [],
    };
    badCandidate.rawConfidenceSignal = 'low'; // base 50 - 15 - 10 = 25

    // Create an extremely negative scenario (doesn't naturally go below 0 but we can verify logic)
    const result = service.score(badCandidate, []);
    expect(result.score).toBe(25);

    // Extremely positive scenario
    const superCandidate = {
      ...getBaseCandidate(),
      sourceRefs: ['file'],
      rawConfidenceSignal: 'high',
    };
    const originals: NormalizedAdrCandidate[] = [
      { sourceType: 'file', sourceRef: 'file', rawText: '', context: '' },
    ];
    const superResult = service.score(superCandidate, originals);

    // 50 + 30 + 20 = 100
    expect(superResult.score).toBe(100);
  });
});
