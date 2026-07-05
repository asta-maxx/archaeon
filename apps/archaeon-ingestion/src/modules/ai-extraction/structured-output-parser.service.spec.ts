import { Test, TestingModule } from '@nestjs/testing';
import { StructuredOutputParserService } from './structured-output-parser.service';
import { SchemaValidationError } from './errors';

describe('StructuredOutputParserService', () => {
  let service: StructuredOutputParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StructuredOutputParserService],
    }).compile();

    service = module.get<StructuredOutputParserService>(
      StructuredOutputParserService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse and validate a valid JSON array of candidates', async () => {
    const validJson = `[
      {
        "id": "adr-1",
        "title": "Use Postgres",
        "description": "We need a DB",
        "rationale": "Relational data",
        "alternatives": ["Mongo", "MySQL"],
        "sourceRefs": ["commit-123"],
        "extractedAt": "2023-01-01T00:00:00Z",
        "rawConfidenceSignal": "High"
      }
    ]`;

    const result = await service.parse(validJson);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('adr-1');
  });

  it('should strip markdown blocks and parse correctly', async () => {
    const markdownJson = `\`\`\`json
[
  {
    "id": "adr-2",
    "title": "T",
    "description": "D",
    "rationale": "R",
    "alternatives": [],
    "sourceRefs": [],
    "extractedAt": "time"
  }
]
\`\`\``;

    const result = await service.parse(markdownJson);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('adr-2');
  });

  it('should throw SchemaValidationError for invalid JSON', async () => {
    await expect(service.parse('not json')).rejects.toThrow(
      SchemaValidationError,
    );
    await expect(service.parse('not json')).rejects.toThrow(
      'LLM output is not valid JSON',
    );
  });

  it('should throw SchemaValidationError if output is not an array', async () => {
    const objJson = `{"id": "adr-3"}`;
    await expect(service.parse(objJson)).rejects.toThrow(SchemaValidationError);
    await expect(service.parse(objJson)).rejects.toThrow(
      'LLM output must be a JSON array',
    );
  });

  it('should throw SchemaValidationError if array items fail schema validation', async () => {
    const invalidItemJson = `[
      {
        "id": "adr-4",
        "title": "Missing fields!"
      }
    ]`;

    await expect(service.parse(invalidItemJson)).rejects.toThrow(
      SchemaValidationError,
    );
  });
});
