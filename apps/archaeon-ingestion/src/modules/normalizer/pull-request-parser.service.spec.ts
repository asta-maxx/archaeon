import { Test, TestingModule } from '@nestjs/testing';
import { PullRequestParserService } from './pull-request-parser.service';

describe('PullRequestParserService', () => {
  let service: PullRequestParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PullRequestParserService],
    }).compile();

    service = module.get<PullRequestParserService>(PullRequestParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle non-array input', () => {
    expect(service.parse(null as any)).toEqual([]);
    expect(service.parse({} as any)).toEqual([]);
  });

  it('should parse valid PRs', () => {
    const raw = [
      {
        number: 42,
        title: 'Fix issue',
        body: 'Closes #41',
        user: { login: 'Bob' },
        state: 'closed',
        merged_at: '2023-01-01T12:00:00Z',
        files: [{ filename: 'src/main.ts' }],
        commits: [{ sha: 'sha1' }, { sha: 'sha2' }],
      },
    ];

    const result = service.parse(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      number: 42,
      title: 'Fix issue',
      body: 'Closes #41',
      author: 'Bob',
      state: 'closed',
      mergedAt: '2023-01-01T12:00:00Z',
      filesChanged: ['src/main.ts'],
      linkedCommits: ['sha1', 'sha2'],
    });
  });

  it('should default missing values gracefully', () => {
    const raw = [
      {
        number: 43,
      },
    ];

    const result = service.parse(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      number: 43,
      title: 'Untitled',
      body: '',
      author: 'unknown',
      state: 'open',
      mergedAt: null,
      filesChanged: [],
      linkedCommits: [],
    });
  });

  it('should skip malformed PRs without throwing', () => {
    const raw = [
      {
        // Missing number
        title: 'bad',
      },
      null,
      {
        number: 44,
      },
    ];

    const result = service.parse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(44);
  });
});
