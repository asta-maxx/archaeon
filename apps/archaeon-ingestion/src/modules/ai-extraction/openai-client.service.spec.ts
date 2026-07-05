import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { OpenAiClientService } from './openai-client.service';
import { OpenAiRateLimitError, OpenAiTimeoutError } from './errors';
import { ChatOpenAI } from '@langchain/openai';

// Mock ChatOpenAI from langchain
const mockInvoke = jest.fn();

jest.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(() => {
      return {
        invoke: mockInvoke,
      };
    }),
  };
});

describe('OpenAiClientService', () => {
  let service: OpenAiClientService;
  let chatOpenAiMock: jest.Mocked<any>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockInvoke.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
      providers: [OpenAiClientService],
    }).compile();

    service = module.get<OpenAiClientService>(OpenAiClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should count tokens correctly using tiktoken', () => {
    const text = 'Hello, world! This is a test.';
    const count = service.countTokens(text);
    // 'Hello', ',', ' world', '!', ' This', ' is', ' a', ' test', '.'
    expect(count).toBeGreaterThan(5);
    expect(count).toBeLessThan(15);
  });

  it('should invoke the model and return structured response with tokens', async () => {
    const mockResponseText = '{"some": "json"}';
    mockInvoke.mockResolvedValue({ content: mockResponseText });

    const result = await service.invoke('System prompt', 'User input');

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(result.text).toBe(mockResponseText);
    expect(result.usage.promptTokens).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
    expect(result.usage.totalTokens).toBe(
      result.usage.promptTokens + result.usage.completionTokens,
    );
  });

  it('should map timeout errors to OpenAiTimeoutError', async () => {
    const error = new Error('Request timed out');
    error.name = 'TimeoutError';
    mockInvoke.mockRejectedValue(error);

    await expect(service.invoke('sys', 'user')).rejects.toThrow(
      OpenAiTimeoutError,
    );
  });

  it('should map rate limit errors to OpenAiRateLimitError', async () => {
    const error: any = new Error('Rate limit exceeded');
    error.status = 429;
    mockInvoke.mockRejectedValue(error);

    await expect(service.invoke('sys', 'user')).rejects.toThrow(
      OpenAiRateLimitError,
    );
  });

  it('should pass through unknown errors', async () => {
    const error = new Error('Unknown catastrophic failure');
    mockInvoke.mockRejectedValue(error);

    await expect(service.invoke('sys', 'user')).rejects.toThrow(
      'Unknown catastrophic failure',
    );
  });
});
