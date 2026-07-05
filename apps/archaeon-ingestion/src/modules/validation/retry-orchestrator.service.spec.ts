import { Test, TestingModule } from '@nestjs/testing';
import { RetryOrchestratorService } from './retry-orchestrator.service';
import {
  SchemaValidationError,
  OpenAiTimeoutError,
} from '../ai-extraction/errors';

describe('RetryOrchestratorService', () => {
  let service: RetryOrchestratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RetryOrchestratorService],
    }).compile();

    service = module.get<RetryOrchestratorService>(RetryOrchestratorService);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return result immediately if successful', async () => {
    const op = jest.fn().mockResolvedValue('success');
    const response = await service.executeWithRetry(op, {
      maxAttempts: 3,
      baseBackoffMs: 1000,
    });

    expect(response.result).toBe('success');
    expect(response.retries).toBe(0);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('should retry on SchemaValidationError and eventually succeed', async () => {
    const op = jest
      .fn()
      .mockRejectedValueOnce(new SchemaValidationError('bad json'))
      .mockResolvedValueOnce('success on try 2');

    const response = await service.executeWithRetry(op, {
      maxAttempts: 3,
      baseBackoffMs: 1000,
    });

    expect(response.result).toBe('success on try 2');
    expect(response.retries).toBe(1);
    expect(op).toHaveBeenCalledTimes(2);
    expect((service as any).sleep).toHaveBeenCalledTimes(1);
    expect((service as any).sleep).toHaveBeenCalledWith(1000);
  });

  it('should retry on OpenAiTimeoutError and eventually fail if max attempts reached', async () => {
    const op = jest.fn().mockRejectedValue(new OpenAiTimeoutError('timeout'));

    await expect(
      service.executeWithRetry(op, { maxAttempts: 3, baseBackoffMs: 1000 }),
    ).rejects.toThrow(OpenAiTimeoutError);

    expect(op).toHaveBeenCalledTimes(3);
    expect((service as any).sleep).toHaveBeenCalledTimes(2);
    expect((service as any).sleep).toHaveBeenNthCalledWith(1, 1000);
    expect((service as any).sleep).toHaveBeenNthCalledWith(2, 2000);
  });

  it('should immediately fail on non-recoverable error', async () => {
    const op = jest
      .fn()
      .mockRejectedValue(new Error('Fatal non-recoverable DB error'));

    await expect(
      service.executeWithRetry(op, { maxAttempts: 3, baseBackoffMs: 1000 }),
    ).rejects.toThrow('Fatal non-recoverable DB error');
    expect(op).toHaveBeenCalledTimes(1);
  });
});
