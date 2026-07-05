import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAiClientService } from './openai-client.service';
import { StructuredOutputParserService } from './structured-output-parser.service';
import { AiExtractionService } from './ai-extraction.service';

@Module({
  imports: [ConfigModule],
  providers: [
    OpenAiClientService,
    StructuredOutputParserService,
    AiExtractionService,
  ],
  exports: [AiExtractionService],
})
export class AiExtractionModule {}
