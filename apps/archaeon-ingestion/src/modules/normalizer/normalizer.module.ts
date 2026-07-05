import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommitsParserService } from './commits-parser.service';
import { PullRequestParserService } from './pull-request-parser.service';
import { FileParserService } from './file-parser.service';
import { AdrParserService } from './adr-parser.service';
import { NormalizerService } from './normalizer.service';

@Module({
  imports: [ConfigModule],
  providers: [
    CommitsParserService,
    PullRequestParserService,
    FileParserService,
    AdrParserService,
    NormalizerService,
  ],
  exports: [NormalizerService],
})
export class NormalizerModule {}
