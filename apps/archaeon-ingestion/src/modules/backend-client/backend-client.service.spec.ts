import { Test, TestingModule } from '@nestjs/testing';
import { BackendClientService } from './backend-client.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { PipelineResult } from '../../shared/types';
import { Logger } from '@nestjs/common';

describe('BackendClientService', () => {
  let service: BackendClientService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
    } as any;

    configService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackendClientService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<BackendClientService>(BackendClientService);
    // Suppress expected error logs
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reportPipelineResult', () => {
    const mockResult: PipelineResult = {
      status: 'success',
      decisions: [],
      metrics: {
        durationMs: 100,
        tokensUsed: 0,
        retries: 0,
        decisionsExtracted: 0,
        confidenceDistribution: { high: 0, medium: 0, low: 0 },
      },
      logs: [],
    };

    it('should not call httpService if ARCHAEON_BACKEND_URL is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      await service.reportPipelineResult('job-1', mockResult);

      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should post result to backend when configured', async () => {
      configService.get.mockImplementation((key) => {
        if (key === 'ARCHAEON_BACKEND_URL') return 'http://backend:8000';
        if (key === 'INTERNAL_API_KEY') return 'test-key';
        return undefined;
      });

      httpService.post.mockReturnValue(of({ data: 'ok' } as any));

      await service.reportPipelineResult('job-1', mockResult);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://backend:8000/api/internal/repository/process/',
        {
          jobId: 'job-1',
          ...mockResult,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Api-Key': 'test-key',
          },
        },
      );
    });

    it('should not throw if backend returns an error', async () => {
      configService.get.mockReturnValue('http://backend:8000');
      httpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      // Should resolve normally despite error
      await expect(service.reportPipelineResult('job-1', mockResult)).resolves.toBeUndefined();
    });
  });
});
