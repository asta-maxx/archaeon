import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessorService } from './webhook-processor.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { WebhookNormalizerService } from './webhook-normalizer.service';
import { ScopeCalculatorService } from './scope-calculator.service';

describe('WebhookProcessorService', () => {
  let service: WebhookProcessorService;
  let mockPipelineService: jest.Mocked<PipelineService>;
  let mockNormalizerService: jest.Mocked<WebhookNormalizerService>;
  let mockScopeCalculator: jest.Mocked<ScopeCalculatorService>;

  beforeEach(async () => {
    mockPipelineService = {
      run: jest.fn(),
    } as any;

    mockNormalizerService = {
      parse: jest.fn(),
    } as any;

    mockScopeCalculator = {
      calculateScope: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessorService,
        { provide: PipelineService, useValue: mockPipelineService },
        { provide: WebhookNormalizerService, useValue: mockNormalizerService },
        { provide: ScopeCalculatorService, useValue: mockScopeCalculator },
      ],
    }).compile();

    service = module.get<WebhookProcessorService>(WebhookProcessorService);
  });

  it('should return skipped if normalizer returns null', async () => {
    mockNormalizerService.parse.mockReturnValue(null);

    const result = await service.process('job-1', 'issue_comment', {}, 123);

    expect(result).toEqual({ status: 'skipped', reason: expect.any(String) });
    expect(mockScopeCalculator.calculateScope).not.toHaveBeenCalled();
    expect(mockPipelineService.run).not.toHaveBeenCalled();
  });

  it('should calculate scope and invoke pipeline with correct JobContext', async () => {
    const mockSummary = {
      eventType: 'push' as const,
      repository: { owner: 'octocat', name: 'Hello-World', ref: 'main' },
      changedPaths: ['src/index.ts'],
    };
    const mockScope = { paths: ['src/index.ts'], isFullRepo: false };
    const mockPipelineResult = {
      status: 'success' as const,
      decisions: [],
      metrics: {} as any,
      logs: [],
    };

    mockNormalizerService.parse.mockReturnValue(mockSummary);
    mockScopeCalculator.calculateScope.mockReturnValue(mockScope);
    mockPipelineService.run.mockResolvedValue(mockPipelineResult);

    const result = await service.process(
      'job-2',
      'push',
      { some: 'payload' },
      999,
    );

    expect(mockNormalizerService.parse).toHaveBeenCalledWith(
      { some: 'payload' },
      'push',
    );
    expect(mockScopeCalculator.calculateScope).toHaveBeenCalledWith(
      mockSummary,
    );
    expect(mockPipelineService.run).toHaveBeenCalledWith({
      jobId: 'job-2',
      repository: {
        owner: 'octocat',
        name: 'Hello-World',
        ref: 'main',
        installationId: 999,
      },
      scope: mockScope,
    });
    expect(result).toBe(mockPipelineResult);
  });
});
