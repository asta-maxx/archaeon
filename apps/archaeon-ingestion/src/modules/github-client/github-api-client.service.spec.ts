import { Test, TestingModule } from '@nestjs/testing';
import { GithubApiClientService } from './github-api-client.service';
import { ConfigService } from '@nestjs/config';
import { GithubAppAuthService } from './github-app-auth.service';
import { Octokit } from '@octokit/rest';
import {
  GithubRateLimitExceededError,
  GithubNotFoundError,
  GithubClientError,
} from './errors';

jest.mock('@octokit/rest');

describe('GithubApiClientService', () => {
  let service: GithubApiClientService;
  let authServiceMock: jest.Mocked<GithubAppAuthService>;
  let octokitRequestMock: jest.Mock;

  beforeEach(async () => {
    authServiceMock = {
      getInstallationToken: jest.fn().mockResolvedValue('mock-token'),
    } as any;

    octokitRequestMock = jest.fn();
    (Octokit as unknown as jest.Mock).mockImplementation(() => ({
      request: octokitRequestMock,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubApiClientService,
        { provide: GithubAppAuthService, useValue: authServiceMock },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GithubApiClientService>(GithubApiClientService);

    // Override the backoff to avoid waiting in tests
    (service as any).initialBackoffMs = 1;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return data successfully on 200 OK', async () => {
    octokitRequestMock.mockResolvedValueOnce({ data: { success: true } });

    const result = await service.request(999, 'GET /path');

    expect(result).toEqual({ success: true });
    expect(octokitRequestMock).toHaveBeenCalledTimes(1);
    expect(authServiceMock.getInstallationToken).toHaveBeenCalledWith(999);
  });

  it('should throw GithubNotFoundError on 404', async () => {
    octokitRequestMock.mockRejectedValueOnce({ status: 404 });

    await expect(service.request(999, 'GET /path')).rejects.toThrow(
      GithubNotFoundError,
    );
    expect(octokitRequestMock).toHaveBeenCalledTimes(1);
  });

  it('should back off and retry on 429 rate limit, then succeed', async () => {
    octokitRequestMock
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ data: { success: true } });

    const result = await service.request(999, 'GET /path');

    expect(result).toEqual({ success: true });
    expect(octokitRequestMock).toHaveBeenCalledTimes(2);
  });

  it('should throw GithubRateLimitExceededError after exhaustion on 403 Rate Limit', async () => {
    octokitRequestMock.mockRejectedValue({
      status: 403,
      response: { headers: { 'x-ratelimit-remaining': '0' } },
    });

    const promise = service.request(999, 'GET /path');

    await expect(promise).rejects.toThrow(GithubRateLimitExceededError);
    // Should try initial + 3 retries = 4 times total
    expect(octokitRequestMock).toHaveBeenCalledTimes(4);
  });

  it('should throw GithubClientError on generic 500 failure', async () => {
    octokitRequestMock.mockRejectedValueOnce({
      status: 500,
      message: 'Server error',
    });

    await expect(service.request(999, 'GET /path')).rejects.toThrow(
      GithubClientError,
    );
    expect(octokitRequestMock).toHaveBeenCalledTimes(1);
  });
});
