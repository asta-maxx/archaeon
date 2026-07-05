import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GithubAppAuthService } from './github-app-auth.service';
import * as authApp from '@octokit/auth-app';
import { GithubAuthError } from './errors';

jest.mock('@octokit/auth-app');

describe('GithubAppAuthService', () => {
  let service: GithubAppAuthService;
  let mockAuthFn: jest.Mock;

  beforeEach(async () => {
    mockAuthFn = jest.fn();
    (authApp.createAppAuth as jest.Mock).mockReturnValue(mockAuthFn);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubAppAuthService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'GITHUB_APP_ID') return '12345';
              if (key === 'GITHUB_APP_PRIVATE_KEY') return 'mock-private-key';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GithubAppAuthService>(GithubAppAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should exchange app credentials for an installation token', async () => {
    mockAuthFn.mockResolvedValueOnce({
      token: 'mock-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    const token = await service.getInstallationToken(999);

    expect(token).toBe('mock-token');
    expect(authApp.createAppAuth).toHaveBeenCalledWith({
      appId: '12345',
      privateKey: 'mock-private-key',
    });
    expect(mockAuthFn).toHaveBeenCalledWith({
      type: 'installation',
      installationId: 999,
    });
  });

  it('should cache the token and avoid redundant calls within validity window', async () => {
    mockAuthFn.mockResolvedValueOnce({
      token: 'mock-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    });

    const token1 = await service.getInstallationToken(999);
    const token2 = await service.getInstallationToken(999);

    expect(token1).toBe('mock-token');
    expect(token2).toBe('mock-token');
    expect(mockAuthFn).toHaveBeenCalledTimes(1); // Cached
  });

  it('should request a new token if the cached token is close to expiry', async () => {
    mockAuthFn
      .mockResolvedValueOnce({
        token: 'mock-token-1',
        expiresAt: new Date(Date.now() + 30000).toISOString(), // 30 seconds from now (within 60s buffer)
      })
      .mockResolvedValueOnce({
        token: 'mock-token-2',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

    const token1 = await service.getInstallationToken(999);
    const token2 = await service.getInstallationToken(999);

    expect(token1).toBe('mock-token-1');
    expect(token2).toBe('mock-token-2');
    expect(mockAuthFn).toHaveBeenCalledTimes(2);
  });

  it('should throw GithubAuthError on authentication failure', async () => {
    mockAuthFn.mockRejectedValueOnce(new Error('GitHub API Error'));

    await expect(service.getInstallationToken(999)).rejects.toThrow(
      GithubAuthError,
    );
  });

  it('should not log the token (token absence validation)', async () => {
    // This is essentially validated by design as there's no Pino injected,
    // but we can assert we don't console.log it.
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    mockAuthFn.mockResolvedValueOnce({
      token: 'secret-token-value',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    await service.getInstallationToken(999);

    // Assert no log output was generated
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
