import { Test, TestingModule } from '@nestjs/testing';
import { FileParserService } from './file-parser.service';

describe('FileParserService', () => {
  let service: FileParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileParserService],
    }).compile();

    service = module.get<FileParserService>(FileParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle non-array input', () => {
    expect(service.parse(null as any)).toEqual([]);
    expect(service.parse({} as any)).toEqual([]);
  });

  it('should parse valid blob files and detect languages', () => {
    const raw = [
      {
        path: 'src/main.ts',
        type: 'blob',
        size: 100,
        content: 'console.log("hello");',
      },
      {
        path: 'README.md',
        type: 'blob',
        size: 200,
      },
    ];

    const result = service.parse(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      path: 'src/main.ts',
      language: 'TypeScript',
      sizeBytes: 100,
      content: 'console.log("hello");',
    });
    expect(result[1]).toEqual({
      path: 'README.md',
      language: 'Markdown',
      sizeBytes: 200,
      content: undefined,
    });
  });

  it('should ignore non-blob types', () => {
    const raw = [
      {
        path: 'src/dir',
        type: 'tree', // directory
      },
    ];
    const result = service.parse(raw);
    expect(result).toHaveLength(0);
  });

  it('should fallback to unknown for unknown extensions', () => {
    const raw = [
      {
        path: 'Dockerfile',
        type: 'blob',
      },
    ];
    const result = service.parse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('unknown');
  });

  it('should skip malformed files without throwing', () => {
    const raw = [
      {
        type: 'blob',
        // missing path
      },
      null,
      {
        path: 'good.js',
        type: 'blob',
        size: 10,
      },
    ];

    const result = service.parse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('good.js');
  });
});
