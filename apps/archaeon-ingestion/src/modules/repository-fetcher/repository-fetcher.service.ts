import { Injectable } from '@nestjs/common';
import { WorkspaceService } from '../workspace/workspace.service';
import { GithubApiClientService } from '../github-client/github-api-client.service';
import { RawRepositoryData } from '../../shared/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FetchScope {
  since?: string;
  paths?: string[];
}

@Injectable()
export class RepositoryFetcherService {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly githubClient: GithubApiClientService,
  ) {}

  async fetchRepository(
    jobId: string,
    installationId: number,
    owner: string,
    repo: string,
    ref: string,
    scope?: FetchScope,
  ): Promise<RawRepositoryData> {
    const workspacePath = await this.workspaceService.createJobWorkspace(jobId);
    const fileManifest: string[] = [];

    // Helper to write JSON files
    const writeJson = async (filename: string, data: any) => {
      const fullPath = path.join(workspacePath, filename);
      await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8');
      fileManifest.push(filename);
    };

    const jobCache = new Map<string, any>();

    // 1. Fetch Branches
    const branches = await this.githubClient.getBranches(
      installationId,
      owner,
      repo,
      jobCache,
    );
    await writeJson('branches.json', branches);

    // 2. Fetch Commits
    const commits = await this.githubClient.getCommits(
      installationId,
      owner,
      repo,
      ref,
      scope?.since,
      jobCache,
    );
    await writeJson('commits.json', commits);

    // 3. Fetch Pull Requests
    const prs = await this.githubClient.getPullRequests(
      installationId,
      owner,
      repo,
      'all',
      jobCache,
    );
    await writeJson('pull_requests.json', prs);

    // 4. Fetch Files (Git Trees recursive)
    // In a real advanced scenario, we'd fetch individual file blobs if needed,
    // but the git trees API gives us the repository structure.
    const tree = await this.githubClient.getFiles(
      installationId,
      owner,
      repo,
      ref,
      jobCache,
    );

    // Optionally filter tree by scope.paths
    let filteredTree = (tree as any).tree || [];
    if (scope?.paths && scope.paths.length > 0) {
      filteredTree = filteredTree.filter((item: any) =>
        scope.paths!.some(
          (p) => item.path === p || item.path.startsWith(p + '/'),
        ),
      );
    }

    await writeJson('files.json', { ...(tree as any), tree: filteredTree });

    return {
      jobId,
      workspacePath,
      branches,
      commits,
      pullRequests: prs,
      fileManifest,
    };
  }
}
