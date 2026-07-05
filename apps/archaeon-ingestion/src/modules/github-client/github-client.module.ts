import { Module } from '@nestjs/common';
import { GithubAppAuthService } from './github-app-auth.service';
import { GithubApiClientService } from './github-api-client.service';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [GithubAppAuthService, GithubApiClientService],
  exports: [GithubApiClientService],
})
export class GithubClientModule {}
