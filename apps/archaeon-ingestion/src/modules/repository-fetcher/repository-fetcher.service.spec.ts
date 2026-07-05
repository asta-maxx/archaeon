import { Test, TestingModule } from '@nestjs/testing';
import { RepositoryFetcherService } from './repository-fetcher.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { GithubApiClientService } from '../github-client/github-api-client.service';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

describe('RepositoryFetcherService', () => {
  let service: RepositoryFetcherService;
  let workspaceServiceMock: jest.Mocked<WorkspaceService>;
  let githubClientMock: jest.Mocked<GithubApiClientService>;

  beforeEach(async () => {
    workspaceServiceMock = {
      createJobWorkspace: jest.fn().mockResolvedValue('/tmp/mock-workspace-id'),
    } as any;

    githubClientMock = {
      getBranches: jest.fn().mockResolvedValue([{ name: 'main' }]),
      getCommits: jest.fn().mockResolvedValue([{ sha: '123' }]),
      getPullRequests: jest.fn().mockResolvedValue([{ id: 1 }]),
      getFiles: jest.fn().mockResolvedValue({
        tree: [{ path: 'README.md' }, { path: 'src/main.ts' }],
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoryFetcherService,
        { provide: WorkspaceService, useValue: workspaceServiceMock },
        { provide: GithubApiClientService, useValue: githubClientMock },
      ],
    }).compile();

    service = module.get<RepositoryFetcherService>(RepositoryFetcherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and serialize data into the workspace', async () => {
    const result = await service.fetchRepository(
      'job-1',
      999,
      'owner',
      'repo',
      'main',
    );

    expect(result.jobId).toBe('job-1');
    expect(result.workspacePath).toBe('/tmp/mock-workspace-id');
    expect(result.fileManifest).toEqual([
      'branches.json',
      'commits.json',
      'pull_requests.json',
      'files.json',
    ]);

    expect(workspaceServiceMock.createJobWorkspace).toHaveBeenCalledWith(
      'job-1',
    );
    expect(githubClientMock.getBranches).toHaveBeenCalledWith(
      999,
      'owner',
      'repo',
      expect.any(Map),
    );
    expect(githubClientMock.getCommits).toHaveBeenCalledWith(
      999,
      'owner',
      'repo',
      'main',
      undefined,
      expect.any(Map),
    );
    expect(githubClientMock.getPullRequests).toHaveBeenCalledWith(
      999,
      'owner',
      'repo',
      'all',
      expect.any(Map),
    );
    expect(githubClientMock.getFiles).toHaveBeenCalledWith(
      999,
      'owner',
      'repo',
      'main',
      expect.any(Map),
    );

    // Verify fs.writeFile calls
    expect(fs.writeFile).toHaveBeenCalledTimes(4);
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('/tmp/mock-workspace-id', 'branches.json'),
      expect.stringContaining('"name": "main"'),
      'utf-8',
    );
  });

  it('should pass scope properly to commits and filter files', async () => {
    await service.fetchRepository('job-1', 999, 'owner', 'repo', 'main', {
      since: '2024-01-01T00:00:00Z',
      paths: ['src/main.ts'],
    });

    expect(githubClientMock.getCommits).toHaveBeenCalledWith(
      999,
      'owner',
      'repo',
      'main',
      '2024-01-01T00:00:00Z',
      expect.any(Map),
    );

    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('/tmp/mock-workspace-id', 'files.json'),
      expect.stringContaining('"src/main.ts"'),
      'utf-8',
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('/tmp/mock-workspace-id', 'files.json'),
      expect.not.stringContaining('"README.md"'),
      'utf-8',
    );
  });
});
