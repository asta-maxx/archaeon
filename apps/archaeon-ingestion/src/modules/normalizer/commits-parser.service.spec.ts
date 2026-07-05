import { Test, TestingModule } from '@nestjs/testing';
import { CommitsParserService } from './commits-parser.service';

describe('CommitsParserService', () => {
  let service: CommitsParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommitsParserService],
    }).compile();

    service = module.get<CommitsParserService>(CommitsParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle non-array input', () => {
    expect(service.parse(null as any)).toEqual([]);
    expect(service.parse({} as any)).toEqual([]);
  });

  it('should parse valid commits', () => {
    const raw = [
      {
        sha: 'abc1234',
        commit: {
          author: { name: 'Alice', date: '2023-01-01T12:00:00Z' },
          message: 'feat: add something',
        },
        files: [{ filename: 'src/main.ts' }, { filename: 'README.md' }],
      },
    ];

    const result = service.parse(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      sha: 'abc1234',
      author: 'Alice',
      date: '2023-01-01T12:00:00Z',
      message: 'feat: add something',
      filesChanged: ['src/main.ts', 'README.md'],
    });
  });

  it('should fallback to defaults for missing author or date', () => {
    const raw = [
      {
        sha: 'abc1234',
        commit: {
          message: 'chore: updates',
        },
      },
    ];

    const result = service.parse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].author).toBe('unknown');
    expect(result[0].date).toBe('1970-01-01T00:00:00.000Z');
  });

  it('should skip malformed commits without throwing', () => {
    const raw = [
      {
        // Missing commit object completely
        sha: 'bad1',
      },
      {
        sha: 'bad2',
        commit: {}, // Missing message
      },
      null, // Not an object
      {
        sha: 'good1',
        commit: { message: 'valid message' },
      },
    ];

    const result = service.parse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].sha).toBe('good1');
  });
});
