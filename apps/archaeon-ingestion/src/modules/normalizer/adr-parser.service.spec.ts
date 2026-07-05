import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdrParserService } from './adr-parser.service';
import {
  NormalizedCommit,
  NormalizedPullRequest,
  NormalizedFile,
} from '../../shared/types';

describe('AdrParserService', () => {
  let service: AdrParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [
            () => ({
              // We could override here, but let's test defaults first
            }),
          ],
        }),
      ],
      providers: [AdrParserService],
    }).compile();

    service = module.get<AdrParserService>(AdrParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extract ADR candidates from commits', () => {
    const commits: NormalizedCommit[] = [
      {
        sha: '1',
        author: 'a',
        date: 'd',
        message: 'fix: a bug',
        filesChanged: [],
      },
      {
        sha: '2',
        author: 'b',
        date: 'd',
        message: 'decision: use Postgres',
        filesChanged: [],
      },
      {
        sha: '3',
        author: 'c',
        date: 'd',
        message: 'ADR: something important',
        filesChanged: [],
      },
    ];

    const result = service.parse(commits, [], []);
    expect(result).toHaveLength(2);
    expect(result[0].sourceRef).toBe('2');
    expect(result[0].sourceType).toBe('commit');
    expect(result[1].sourceRef).toBe('3');
  });

  it('should extract ADR candidates from PRs', () => {
    const prs: NormalizedPullRequest[] = [
      {
        number: 1,
        title: 'regular pr',
        body: 'fixes #1',
        author: 'a',
        state: 'closed',
        mergedAt: null,
        filesChanged: [],
        linkedCommits: [],
      },
      {
        number: 2,
        title: 'ADR: move to microservices',
        body: 'Context...',
        author: 'b',
        state: 'open',
        mergedAt: null,
        filesChanged: [],
        linkedCommits: [],
      },
    ];

    const result = service.parse([], prs, []);
    expect(result).toHaveLength(1);
    expect(result[0].sourceRef).toBe('2');
    expect(result[0].sourceType).toBe('pr');
  });

  it('should extract ADR candidates from files', () => {
    const files: NormalizedFile[] = [
      {
        path: 'src/main.ts',
        language: 'TypeScript',
        sizeBytes: 10,
      },
      {
        path: 'docs/adr/0001-init.md',
        language: 'Markdown',
        sizeBytes: 100,
        content: '# ADR 1',
      },
    ];

    const result = service.parse([], [], files);
    expect(result).toHaveLength(1);
    expect(result[0].sourceRef).toBe('docs/adr/0001-init.md');
    expect(result[0].sourceType).toBe('file');
  });
});
