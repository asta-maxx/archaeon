import { Test, TestingModule } from '@nestjs/testing';
import { AiExtractionService } from './ai-extraction.service';
import { OpenAiClientService } from './openai-client.service';
import { StructuredOutputParserService } from './structured-output-parser.service';
import { NormalizedAdrCandidate } from '../../shared/types';
import { SchemaValidationError } from './errors';

describe('AiExtractionService', () => {
  let service: AiExtractionService;
  let mockOpenAiClient: jest.Mocked<OpenAiClientService>;

  beforeEach(async () => {
    mockOpenAiClient = {
      invoke: jest.fn(),
      countTokens: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiExtractionService,
        { provide: OpenAiClientService, useValue: mockOpenAiClient },
        StructuredOutputParserService, // use real parser to test the boundary
      ],
    }).compile();

    service = module.get<AiExtractionService>(AiExtractionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty result if no candidates provided', async () => {
    const result = await service.extract([]);
    expect(result.candidates).toHaveLength(0);
    expect(result.usage.totalTokens).toBe(0);
    expect(mockOpenAiClient.invoke).not.toHaveBeenCalled();
  });

  it('should invoke OpenAI and parse clean extraction correctly', async () => {
    const mockOutput = `[
      {
        "id": "test-1",
        "title": "Use Next.js",
        "description": "desc",
        "rationale": "rat",
        "alternatives": ["React"],
        "sourceRefs": ["pr-1"],
        "extractedAt": "2023",
        "rawConfidenceSignal": "High"
      }
    ]`;

    mockOpenAiClient.invoke.mockResolvedValue({
      text: mockOutput,
      usage: { promptTokens: 10, completionTokens: 50, totalTokens: 60 },
    });

    const candidates: NormalizedAdrCandidate[] = [
      {
        sourceType: 'pr',
        sourceRef: 'pr-1',
        rawText: 'Use Next.js',
        context: '',
      },
    ];

    const result = await service.extract(candidates);

    expect(mockOpenAiClient.invoke).toHaveBeenCalledTimes(1);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].id).toBe('test-1');
    expect(result.usage.totalTokens).toBe(60);
  });

  it('should handle empty/no-signal input gracefully', async () => {
    // If the LLM determines there is no ADR, it should return '[]'
    mockOpenAiClient.invoke.mockResolvedValue({
      text: '[]',
      usage: { promptTokens: 10, completionTokens: 2, totalTokens: 12 },
    });

    const candidates: NormalizedAdrCandidate[] = [
      {
        sourceType: 'commit',
        sourceRef: 'c1',
        rawText: 'fix typo',
        context: '',
      },
    ];

    const result = await service.extract(candidates);

    expect(result.candidates).toHaveLength(0);
    expect(result.usage.totalTokens).toBe(12);
  });

  it('should surface SchemaValidationError on malformed LLM output', async () => {
    // The LLM returns invalid JSON or hallucinates conversational text
    mockOpenAiClient.invoke.mockResolvedValue({
      text: 'Sorry, I cannot help with that.',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });

    const candidates: NormalizedAdrCandidate[] = [
      { sourceType: 'commit', sourceRef: 'c1', rawText: '...', context: '' },
    ];

    await expect(service.extract(candidates)).rejects.toThrow(
      SchemaValidationError,
    );
  });
});
