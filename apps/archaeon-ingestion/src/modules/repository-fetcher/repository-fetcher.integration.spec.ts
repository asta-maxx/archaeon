import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { RepositoryFetcherService } from './repository-fetcher.service';
import { GithubClientModule } from '../github-client/github-client.module';
import { WorkspaceModule } from '../workspace/workspace.module';

import nock from 'nock';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('RepositoryFetcher Integration', () => {
  let fetcherService: RepositoryFetcherService;
  let workspacePath: string;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [
            () => ({
              GITHUB_APP_ID: '123',
              GITHUB_APP_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCtM6dCEPmPbHS1\nQTQJ4z4PaplxhYnTsF7kUf3rJsvfiOSzaOb4cwmoXbxY9o6yyhaOg+ZO0rKM3WUP\n9YZ6PsdR/fuImkoUC2+VH96IV6QzyEG/NgZrmFkV121SJEjrAIiYNLqr/GfxWuJX\nwL84kKCapJVPYvkEXW59LEnBwW9hN3yFPX08FS3W09w7naAo5mnrPhA7IdCBKzyv\n0RnTOhrE5rY4BJB74MiuvDB9Bnl0t7omODBJTMBZvcN2Jl179Bjbbn2tpKABl/Dp\n98B4wy+MIDjMfwISMliuOBTR6JxNgd6wQRoDlKBshD7ekuHa6r0W+i/Is8s9PW8o\nnYmOdYdXAgMBAAECggEAAjSzifaIDHjnzkco+oHtEGqIecGm97iPUikZKsgxCy/F\nzzh5eJXpJukgCkyu6egDpt0B2eR6ZwDgK0vdN+wEwy6Q6DR5gmKC5qCj8j3rgXKo\nzl6fG6UHvWzOSkrcAuIxhdQQweVSYuiIFBtdqW1uHjS/vLsYoM2afU2gbYShKS5z\nsaF28jX2Q1zos8mUoMq4kBbnpI3ojmjhEtfWwVFo3zZkB3bpK9BBmXj1YZpukHj5\n6/cg11gjOUC+RFkdCbc24vUaJ+6MUFrFm+ZxombWI/gijv/fRcwIL+w9Rr/6RMEs\nDhLF7yeyGFQiF+iVtKb1+rHSKFwkKQzrD/rb2F8VgQKBgQDZ86wTxe2uqCkst1cF\nOjxlbFdQk3VpmZ2sIIAim9pbhM50waryYUPJoCrwYL0b00Sd7NADpdudFcDkkRGP\nmROg6J1GId+DWaRaBOfJsLnpEvCfQcS5yVrvQWLtrjhkZId08GgsxMDtaSjbqbE6\nQEvSUXTDE4aLNP65y5X1lHJYTwKBgQDLcBaNI618Un+574mLe4qFra820vRx2TVk\nEeYmTJaxJ8i+cIp/AaOD181O3V3C+ew94MCrD+vaC/jtsO0ezsLW+cXVfaZdmyVJ\nmjWGeI5s3yIlqrKiJktaTtlIkvInvJMcR/oMjUDpzetpU/UyrNGjG3YIQY7UHS3o\nNMXKmj0WeQKBgDXjdcx9x8LDeUrBGhcEyyIYo44cp48wmDeS4ZutBVRTheiAag/7\n1JLpszQz9w4GMpUJlHUScTZpxoO9CqaCpsPGP/yzK1yCsYxAYj8QHydts2jtDgMR\nshYuCJPT28WWxZc4Scmn7DvHIH8Pee55L0YVNdV14nJQ7BpsJ+vMhGkpAoGBAMQF\noPUmJ4ffRks2z+WiiHr+PBIrenYowRVHWegVbC4PE5LMheaTAaeMTLts+WdhwYxt\n/7fUg4F6f8Un8ZL5zyutSD7J73/KekdNW73SdAnbht+cdrtfAsRlrWAMl2BKh8V8\nZSerA51FWUwIJf9KHkV3tGeII8OmyhEwqFTsAWihAoGAX9ZNCe3Jy3nPAGL+t5pR\nT2uEUFokMeXFGUAObVumEMaWWKUsXD/B2vsjZjj0ByS1OKYj88AbE2Fei3c+dXSu\nr6MT+GWRx0e22eAXx85FocJbrdPvFUbansnDCXIaAxuBzNOMnrtHAEtxYwmh+W0B\nKWa3rTYPbCaHrTGvNo8WLpM=\n-----END PRIVATE KEY-----`,
            }),
          ],
        }),
        GithubClientModule,
        WorkspaceModule,
      ],
      providers: [
        RepositoryFetcherService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'GITHUB_APP_ID') return '12345';
              if (key === 'GITHUB_APP_PRIVATE_KEY')
                return `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCtM6dCEPmPbHS1\nQTQJ4z4PaplxhYnTsF7kUf3rJsvfiOSzaOb4cwmoXbxY9o6yyhaOg+ZO0rKM3WUP\n9YZ6PsdR/fuImkoUC2+VH96IV6QzyEG/NgZrmFkV121SJEjrAIiYNLqr/GfxWuJX\nwL84kKCapJVPYvkEXW59LEnBwW9hN3yFPX08FS3W09w7naAo5mnrPhA7IdCBKzyv\n0RnTOhrE5rY4BJB74MiuvDB9Bnl0t7omODBJTMBZvcN2Jl179Bjbbn2tpKABl/Dp\n98B4wy+MIDjMfwISMliuOBTR6JxNgd6wQRoDlKBshD7ekuHa6r0W+i/Is8s9PW8o\nnYmOdYdXAgMBAAECggEAAjSzifaIDHjnzkco+oHtEGqIecGm97iPUikZKsgxCy/F\nzzh5eJXpJukgCkyu6egDpt0B2eR6ZwDgK0vdN+wEwy6Q6DR5gmKC5qCj8j3rgXKo\nzl6fG6UHvWzOSkrcAuIxhdQQweVSYuiIFBtdqW1uHjS/vLsYoM2afU2gbYShKS5z\nsaF28jX2Q1zos8mUoMq4kBbnpI3ojmjhEtfWwVFo3zZkB3bpK9BBmXj1YZpukHj5\n6/cg11gjOUC+RFkdCbc24vUaJ+6MUFrFm+ZxombWI/gijv/fRcwIL+w9Rr/6RMEs\nDhLF7yeyGFQiF+iVtKb1+rHSKFwkKQzrD/rb2F8VgQKBgQDZ86wTxe2uqCkst1cF\nOjxlbFdQk3VpmZ2sIIAim9pbhM50waryYUPJoCrwYL0b00Sd7NADpdudFcDkkRGP\nmROg6J1GId+DWaRaBOfJsLnpEvCfQcS5yVrvQWLtrjhkZId08GgsxMDtaSjbqbE6\nQEvSUXTDE4aLNP65y5X1lHJYTwKBgQDLcBaNI618Un+574mLe4qFra820vRx2TVk\nEeYmTJaxJ8i+cIp/AaOD181O3V3C+ew94MCrD+vaC/jtsO0ezsLW+cXVfaZdmyVJ\nmjWGeI5s3yIlqrKiJktaTtlIkvInvJMcR/oMjUDpzetpU/UyrNGjG3YIQY7UHS3o\nNMXKmj0WeQKBgDXjdcx9x8LDeUrBGhcEyyIYo44cp48wmDeS4ZutBVRTheiAag/7\n1JLpszQz9w4GMpUJlHUScTZpxoO9CqaCpsPGP/yzK1yCsYxAYj8QHydts2jtDgMR\nshYuCJPT28WWxZc4Scmn7DvHIH8Pee55L0YVNdV14nJQ7BpsJ+vMhGkpAoGBAMQF\noPUmJ4ffRks2z+WiiHr+PBIrenYowRVHWegVbC4PE5LMheaTAaeMTLts+WdhwYxt\n/7fUg4F6f8Un8ZL5zyutSD7J73/KekdNW73SdAnbht+cdrtfAsRlrWAMl2BKh8V8\nZSerA51FWUwIJf9KHkV3tGeII8OmyhEwqFTsAWihAoGAX9ZNCe3Jy3nPAGL+t5pR\nT2uEUFokMeXFGUAObVumEMaWWKUsXD/B2vsjZjj0ByS1OKYj88AbE2Fei3c+dXSu\nr6MT+GWRx0e22eAXx85FocJbrdPvFUbansnDCXIaAxuBzNOMnrtHAEtxYwmh+W0B\nKWa3rTYPbCaHrTGvNo8WLpM=\n-----END PRIVATE KEY-----`;
            }),
          },
        },
      ],
    }).compile();

    fetcherService = module.get<RepositoryFetcherService>(
      RepositoryFetcherService,
    );
  });

  afterEach(async () => {
    nock.cleanAll();
    if (workspacePath) {
      // In real scenario, destroyJobWorkspace does this, but since it relies on internal path building,
      // we'll clean up our explicit path manually if we tracked it
      await fs
        .rm(workspacePath, { recursive: true, force: true })
        .catch(() => {});
    }
  });

  it('should fetch repository via octokit using nock and write JSON', async () => {
    // 1. Mock the GitHub App auth exchange (POST /app/installations/999/access_tokens)
    nock('https://api.github.com')
      .post('/app/installations/999/access_tokens')
      .reply(200, {
        token: 'mock-install-token',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });

    // 2. Mock GET branches
    nock('https://api.github.com', {
      reqheaders: {
        authorization: 'token mock-install-token',
      },
    })
      .get('/repos/test-owner/test-repo/branches')
      .query({ per_page: '100' })
      .reply(200, [{ name: 'main' }]);

    // 3. Mock GET commits
    nock('https://api.github.com', {
      reqheaders: {
        authorization: 'token mock-install-token',
      },
    })
      .get('/repos/test-owner/test-repo/commits')
      .query({ sha: 'main', per_page: '100' })
      .reply(200, [{ sha: 'abcd123' }]);

    // 4. Mock GET PRs
    nock('https://api.github.com', {
      reqheaders: {
        authorization: 'token mock-install-token',
      },
    })
      .get('/repos/test-owner/test-repo/pulls')
      .query({ state: 'all', per_page: '100' })
      .reply(200, [{ id: 1, title: 'Test PR' }]);

    // 5. Mock GET Trees
    nock('https://api.github.com', {
      reqheaders: {
        authorization: 'token mock-install-token',
      },
    })
      .get('/repos/test-owner/test-repo/git/trees/main')
      .query({ recursive: '1' })
      .reply(200, {
        sha: 'tree-sha',
        tree: [{ path: 'README.md', type: 'blob' }],
      });

    const result = await fetcherService.fetchRepository(
      'test-job-99',
      999,
      'test-owner',
      'test-repo',
      'main',
    );

    expect(result.jobId).toBe('test-job-99');
    expect(result.fileManifest.length).toBe(4);

    workspacePath = result.workspacePath as string;

    // Validate written files
    const branchesJson = await fs.readFile(
      path.join(workspacePath, 'branches.json'),
      'utf-8',
    );
    expect(JSON.parse(branchesJson)[0].name).toBe('main');

    const commitsJson = await fs.readFile(
      path.join(workspacePath, 'commits.json'),
      'utf-8',
    );
    expect(JSON.parse(commitsJson)[0].sha).toBe('abcd123');

    const prsJson = await fs.readFile(
      path.join(workspacePath, 'pull_requests.json'),
      'utf-8',
    );
    expect(JSON.parse(prsJson)[0].title).toBe('Test PR');

    const filesJson = await fs.readFile(
      path.join(workspacePath, 'files.json'),
      'utf-8',
    );
    expect(JSON.parse(filesJson).tree[0].path).toBe('README.md');

    // Make sure we didn't miss asserting that Nock was fully consumed
    expect(nock.isDone()).toBe(true);
  });
});
