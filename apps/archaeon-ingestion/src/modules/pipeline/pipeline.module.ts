import { Module } from '@nestjs/common';
import { WorkspaceModule } from '../workspace/workspace.module';
import { RepositoryFetcherModule } from '../repository-fetcher/repository-fetcher.module';
import { NormalizerModule } from '../normalizer/normalizer.module';
import { ValidationModule } from '../validation/validation.module';
import { PipelineService } from './pipeline.service';
import { BackendClientModule } from '../backend-client/backend-client.module';

@Module({
  imports: [
    WorkspaceModule,
    RepositoryFetcherModule,
    NormalizerModule,
    ValidationModule,
    BackendClientModule,
  ],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
