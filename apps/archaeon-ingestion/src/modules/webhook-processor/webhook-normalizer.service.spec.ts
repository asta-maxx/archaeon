import { Test, TestingModule } from '@nestjs/testing';
import { WebhookNormalizerService } from './webhook-normalizer.service';

describe('WebhookNormalizerService', () => {
  let service: WebhookNormalizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookNormalizerService],
    }).compile();

    service = module.get<WebhookNormalizerService>(WebhookNormalizerService);
  });

  it('should return null for malformed payloads', () => {
    expect(service.parse(null, 'push')).toBeNull();
    expect(service.parse({}, 'push')).toBeNull();
  });

  it('should return null for unsupported event types', () => {
    const payload = { repository: { owner: { login: 'test' }, name: 'repo' } };
    expect(service.parse(payload, 'issue_comment')).toBeNull();
  });

  describe('Push Events', () => {
    it('should extract changed paths from all commits', () => {
      const payload = {
        repository: { owner: { login: 'octocat' }, name: 'Hello-World' },
        ref: 'refs/heads/main',
        commits: [
          {
            added: ['file1.js'],
            modified: ['file2.js'],
            removed: [],
          },
          {
            added: [],
            modified: ['file2.js', 'file3.js'],
            removed: ['file4.js'],
          },
        ],
      };

      const result = service.parse(payload, 'push');
      expect(result).not.toBeNull();
      expect(result?.eventType).toBe('push');
      expect(result?.repository.owner).toBe('octocat');
      expect(result?.repository.name).toBe('Hello-World');
      expect(result?.repository.ref).toBe('refs/heads/main');
      expect(result?.changedPaths).toEqual(
        expect.arrayContaining([
          'file1.js',
          'file2.js',
          'file3.js',
          'file4.js',
        ]),
      );
      expect(result?.changedPaths).toHaveLength(4); // file2.js is deduped
    });

    it('should handle push with no commits gracefully', () => {
      const payload = {
        repository: { owner: { login: 'octocat' }, name: 'Hello-World' },
        ref: 'refs/heads/main',
      };

      const result = service.parse(payload, 'push');
      expect(result?.changedPaths).toHaveLength(0);
    });
  });

  describe('Pull Request Events', () => {
    it('should ignore PR events with unhandled actions', () => {
      const payload = {
        action: 'closed',
        repository: { owner: { login: 'octocat' }, name: 'Hello-World' },
        pull_request: { number: 42 },
      };

      expect(service.parse(payload, 'pull_request')).toBeNull();
    });

    it('should extract PR details for handled actions', () => {
      const payload = {
        action: 'opened',
        repository: { owner: { login: 'octocat' }, name: 'Hello-World' },
        pull_request: {
          number: 42,
          head: { ref: 'feature-branch' },
        },
      };

      const result = service.parse(payload, 'pull_request');
      expect(result).not.toBeNull();
      expect(result?.eventType).toBe('pull_request');
      expect(result?.prNumber).toBe(42);
      expect(result?.changedPaths).toEqual([]);
      expect(result?.repository.ref).toBe('feature-branch');
    });

    it('should return null if PR object is missing', () => {
      const payload = {
        action: 'opened',
        repository: { owner: { login: 'octocat' }, name: 'Hello-World' },
      };
      expect(service.parse(payload, 'pull_request')).toBeNull();
    });
  });
});
