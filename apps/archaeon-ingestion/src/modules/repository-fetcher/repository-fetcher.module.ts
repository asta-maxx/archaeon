import { Module } from '@nestjs/common';
import { RepositoryFetcherService } from './repository-fetcher.service';
import { GithubClientModule } from '../github-client/github-client.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [GithubClientModule, WorkspaceModule],
  providers: [RepositoryFetcherService],
  exports: [RepositoryFetcherService],
})
export class RepositoryFetcherModule {}
