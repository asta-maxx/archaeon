import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BackendClientService } from './backend-client.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [BackendClientService],
  exports: [BackendClientService],
})
export class BackendClientModule {}
