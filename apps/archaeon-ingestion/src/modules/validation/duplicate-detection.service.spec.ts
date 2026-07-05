import { Test, TestingModule } from '@nestjs/testing';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { ArchitectureDecision } from '../../shared/types';

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DuplicateDetectionService],
    }).compile();

    service = module.get<DuplicateDetectionService>(DuplicateDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const getBaseDecision = (
    id: string,
    title: string,
    desc: string,
    score: number,
  ): ArchitectureDecision => ({
    id,
    title,
    description: desc,
    rationale: '',
    alternatives: [],
    sourceRefs: [],
    extractedAt: '2023-01-01',
    confidence: score > 70 ? 'high' : 'low',
    confidenceScore: score,
  });

  it('should not mark duplicates when similarity is low', () => {
    const decisions = [
      getBaseDecision('1', 'Use Postgres', 'We need relational data', 80),
      getBaseDecision('2', 'Use Redis', 'We need a cache layer', 80),
    ];

    service.deduplicate(decisions);

    expect(decisions[0].duplicateOf).toBeUndefined();
    expect(decisions[1].duplicateOf).toBeUndefined();
  });

  it('should mark lower confidence item as duplicate when similarity is high', () => {
    const decisions = [
      getBaseDecision(
        '1',
        'Migrate to NextJS',
        'Moving from React SPA to NextJS for SEO',
        85,
      ),
      getBaseDecision(
        '2',
        'Migrate to Next.JS',
        'Moving from React SPA to NextJS for better SEO',
        60,
      ), // Almost identical
    ];

    service.deduplicate(decisions);

    expect(decisions[0].duplicateOf).toBeUndefined();
    expect(decisions[1].duplicateOf).toBe('1');
  });

  it('should mark the first item if the second has higher confidence', () => {
    const decisions = [
      getBaseDecision(
        '1',
        'Use Kafka',
        'Event streaming for the microservices',
        50,
      ),
      getBaseDecision(
        '2',
        'Use Kafka',
        'Event streaming for the microservices',
        90,
      ),
    ];

    service.deduplicate(decisions);

    expect(decisions[1].duplicateOf).toBeUndefined();
    expect(decisions[0].duplicateOf).toBe('2');
  });

  it('should handle more than two duplicates gracefully', () => {
    const decisions = [
      getBaseDecision('1', 'Deploy on AWS', 'Using AWS for hosting', 90),
      getBaseDecision('2', 'Deploy on AWS', 'Using AWS for hosting', 50),
      getBaseDecision('3', 'Deploy on AWS', 'Using AWS for hosting', 60),
    ];

    service.deduplicate(decisions);

    // 1 should survive. 2 and 3 should point to 1 (or 3 to 1 and 2 to 3, depending on iteration)
    expect(decisions[0].duplicateOf).toBeUndefined();

    // In our O(N^2) loop, 1 and 2 compare -> 2 marked as dup of 1.
    // 1 and 3 compare -> 3 marked as dup of 1.
    // 2 and 3 skipped because 2 is already a dup.
    expect(decisions[1].duplicateOf).toBe('1');
    expect(decisions[2].duplicateOf).toBe('1');
  });
});
