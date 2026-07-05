import { Test, TestingModule } from '@nestjs/testing';
import { PipelineService } from './pipeline.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { RepositoryFetcherService } from '../repository-fetcher/repository-fetcher.service';
import { NormalizerService } from '../normalizer/normalizer.service';
import {
  ValidationService,
  ValidationResult,
} from '../validation/validation.service';
import { BackendClientService } from '../backend-client/backend-client.service';
import {
  JobContext,
  RawRepositoryData,
  NormalizedRepositoryData,
} from '../../shared/types';
import { GithubRateLimitExceededError } from '../github-client/errors';

describe('PipelineService', () => {
  let service: PipelineService;
  let mockWorkspaceService: jest.Mocked<WorkspaceService>;
  let mockRepositoryFetcher: jest.Mocked<RepositoryFetcherService>;
  let mockNormalizer: jest.Mocked<NormalizerService>;
  let mockValidation: jest.Mocked<ValidationService>;
  let mockBackendClient: jest.Mocked<BackendClientService>;

  const jobContext: JobContext = {
    jobId: 'test-job-123',
    repository: { owner: 'test', name: 'repo', ref: 'main', installationId: 1 },
  };

  const createMockRawData = (): RawRepositoryData => ({
    jobId: 'test-job-123',
    commits: [{}],
    pullRequests: [{}],
    branches: [{}],
    fileManifest: [{}],
  });

  const createMockNormalizedData = (): NormalizedRepositoryData => ({
    jobId: 'test-job-123',
    commits: [
      { sha: '1', author: 'a', date: 'd', message: 'm', filesChanged: [] },
    ],
    pullRequests: [
      {
        number: 1,
        title: 't',
        body: 'b',
        author: 'a',
        state: 'all',
        mergedAt: 'd',
        filesChanged: [],
        linkedCommits: [],
      },
    ],
    files: [{ path: 'p', sizeBytes: 1, language: 'typescript' }],
    adrCandidates: [
      { sourceType: 'commit', sourceRef: '1', rawText: '', context: '' },
    ],
  });

  const createMockValidationResult = (): ValidationResult => ({
    decisions: [
      {
        id: 'd1',
        title: 't',
        description: 'd',
        rationale: 'r',
        alternatives: [],
        sourceRefs: [],
        extractedAt: 'd',
        confidence: 'high',
        confidenceScore: 90,
      },
    ],
    metrics: {
      totalExtracted: 1,
      confidenceDistribution: { high: 1, medium: 0, low: 0 },
      tokensUsed: 100,
      droppedCount: 0,
      duplicateCount: 0,
      retryCount: 0,
    },
  });

  beforeEach(async () => {
    mockWorkspaceService = {
      createJobWorkspace: jest.fn().mockResolvedValue('workspace-path'),
      destroyJobWorkspace: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockRepositoryFetcher = {
      fetchRepository: jest.fn(),
    } as any;

    mockNormalizer = {
      normalize: jest.fn(),
    } as any;

    mockValidation = {
      validate: jest.fn(),
    } as any;

    mockBackendClient = {
      reportPipelineResult: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: WorkspaceService, useValue: mockWorkspaceService },
        { provide: RepositoryFetcherService, useValue: mockRepositoryFetcher },
        { provide: NormalizerService, useValue: mockNormalizer },
        { provide: ValidationService, useValue: mockValidation },
        { provide: BackendClientService, useValue: mockBackendClient },
      ],
    }).compile();

    service = module.get<PipelineService>(PipelineService);
  });

  it('should process a successful pipeline run', async () => {
    mockRepositoryFetcher.fetchRepository.mockResolvedValue(createMockRawData());
    mockNormalizer.normalize.mockReturnValue(createMockNormalizedData());
    mockValidation.validate.mockResolvedValue(createMockValidationResult());

    const result = await service.run(jobContext);

    expect(result.status).toBe('success');
    expect(result.decisions).toHaveLength(1);
    expect(result.metrics.decisionsExtracted).toBe(1);
    expect(result.metrics.tokensUsed).toBe(100);

    expect(mockWorkspaceService.createJobWorkspace).toHaveBeenCalledWith(
      jobContext.jobId,
    );
    expect(mockRepositoryFetcher.fetchRepository).toHaveBeenCalledWith(
      jobContext.jobId,
      jobContext.repository.installationId,
      jobContext.repository.owner,
      jobContext.repository.name,
      jobContext.repository.ref,
      jobContext.scope,
    );
    expect(mockNormalizer.normalize).toHaveBeenCalled();
    expect(mockValidation.validate).toHaveBeenCalled();
    expect(mockWorkspaceService.destroyJobWorkspace).toHaveBeenCalledWith(
      jobContext.jobId,
    );
  });

  it('should flag partial success when normalization drops records', async () => {
    const raw = createMockRawData();
    // Simulate one extra raw commit that fails to normalize
    raw.commits.push({});

    mockRepositoryFetcher.fetchRepository.mockResolvedValue(raw);
    mockNormalizer.normalize.mockReturnValue(createMockNormalizedData());
    mockValidation.validate.mockResolvedValue(createMockValidationResult());

    const result = await service.run(jobContext);

    expect(result.status).toBe('partial');
    expect(
      result.logs.some((l) => l.message === 'Partial normalization detected'),
    ).toBeTruthy();
  });

  it('should fail with AI failure if validation yields no results despite candidates', async () => {
    mockRepositoryFetcher.fetchRepository.mockResolvedValue(createMockRawData());
    mockNormalizer.normalize.mockReturnValue(createMockNormalizedData());

    const valResult = createMockValidationResult();
    valResult.decisions = [];
    valResult.metrics.totalExtracted = 0; // Simulate AI total failure
    mockValidation.validate.mockResolvedValue(valResult);

    const result = await service.run(jobContext);

    expect(result.status).toBe('failed');
    expect(result.errorDetails?.retryable).toBe(false);
    expect(result.errorDetails?.message).toMatch(
      /AI extraction exhausted retries/,
    );
  });

  it('should handle GithubRateLimitExceededError as a retryable failure', async () => {
    mockRepositoryFetcher.fetchRepository.mockRejectedValue(
      new GithubRateLimitExceededError('rate limit'),
    );

    const result = await service.run(jobContext);

    expect(result.status).toBe('failed');
    expect(result.errorDetails?.retryable).toBe(true);
    expect(result.errorDetails?.message).toBe('rate limit');
    expect(mockWorkspaceService.destroyJobWorkspace).toHaveBeenCalled();
  });

  it('should handle unknown errors as fatal failures and STILL CLEAN UP', async () => {
    mockRepositoryFetcher.fetchRepository.mockRejectedValue(
      new Error('something terrible'),
    );

    const result = await service.run(jobContext);

    expect(result.status).toBe('failed');
    expect(result.errorDetails?.retryable).toBe(false);
    expect(result.errorDetails?.message).toBe('something terrible');
    expect(mockWorkspaceService.destroyJobWorkspace).toHaveBeenCalledWith(
      jobContext.jobId,
    );
  });

  it('should guarantee workspace cleanup even if validation throws', async () => {
    mockRepositoryFetcher.fetchRepository.mockResolvedValue(createMockRawData());
    mockNormalizer.normalize.mockReturnValue(createMockNormalizedData());
    mockValidation.validate.mockRejectedValue(new Error('validation crash'));

    await service.run(jobContext);

    expect(mockWorkspaceService.destroyJobWorkspace).toHaveBeenCalledWith(
      jobContext.jobId,
    );
  });
});
