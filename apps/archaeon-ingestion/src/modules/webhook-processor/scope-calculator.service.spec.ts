import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScopeCalculatorService } from './scope-calculator.service';
import { WebhookEventSummary } from '../../shared/types';

describe('ScopeCalculatorService', () => {
  let service: ScopeCalculatorService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'WEBHOOK_LARGE_DIFF_THRESHOLD') return 50;
        return null;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopeCalculatorService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ScopeCalculatorService>(ScopeCalculatorService);
  });

  it('should fall back to full repo scope if diff exceeds threshold', () => {
    const summary: WebhookEventSummary = {
      eventType: 'push',
      repository: { owner: 'test', name: 'repo', ref: 'main' },
      changedPaths: Array.from({ length: 51 }, (_, i) => `file${i}.js`),
    };

    const scope = service.calculateScope(summary);
    expect(scope.isFullRepo).toBe(true);
    expect(scope.paths).toBeUndefined();
  });

  it('should return specific paths for a small push', () => {
    const summary: WebhookEventSummary = {
      eventType: 'push',
      repository: { owner: 'test', name: 'repo', ref: 'main' },
      changedPaths: ['src/main.ts', 'package.json'],
    };

    const scope = service.calculateScope(summary);
    expect(scope.isFullRepo).toBe(false);
    expect(scope.paths).toEqual(['src/main.ts', 'package.json']);
    expect(scope.pullRequestNumber).toBeUndefined();
  });

  it('should return PR number for a small pull request', () => {
    const summary: WebhookEventSummary = {
      eventType: 'pull_request',
      repository: { owner: 'test', name: 'repo', ref: 'main' },
      changedPaths: [],
      prNumber: 42,
    };

    const scope = service.calculateScope(summary);
    expect(scope.isFullRepo).toBe(false);
    expect(scope.pullRequestNumber).toBe(42);
    expect(scope.paths).toBeUndefined();
  });

  it('should fallback to full repo for ambiguous event type', () => {
    const summary: WebhookEventSummary = {
      eventType: 'unknown' as any,
      repository: { owner: 'test', name: 'repo', ref: 'main' },
      changedPaths: [],
    };

    const scope = service.calculateScope(summary);
    expect(scope.isFullRepo).toBe(true);
  });
});
