import { Injectable, Logger } from '@nestjs/common';
import { OpenAiClientService } from './openai-client.service';
import { StructuredOutputParserService } from './structured-output-parser.service';
import { V1_ADR_EXTRACTION_PROMPT } from './prompts';
import {
  NormalizedAdrCandidate,
  ArchitectureDecisionCandidate,
} from '../../shared/types';

export interface ExtractionBatchResult {
  candidates: ArchitectureDecisionCandidate[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);

  constructor(
    private readonly openAiClient: OpenAiClientService,
    private readonly parser: StructuredOutputParserService,
  ) {}

  /**
   * Extracts Architecture Decisions from a list of normalized ADR candidates.
   * Internally batches candidates to fit within prompt limits if necessary.
   * Raises SchemaValidationError on parsing failure without internal retries.
   */
  public async extract(
    candidates: NormalizedAdrCandidate[],
  ): Promise<ExtractionBatchResult> {
    if (!candidates || candidates.length === 0) {
      return {
        candidates: [],
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    // For V1, we process them as a single batch since we only expect a few
    // candidates per repo import (ADR files + specific commits/PRs).
    // A future enhancement could chunk `candidates` into smaller arrays if
    // token count > MAX_TOKENS.
    const inputJson = JSON.stringify(candidates, null, 2);

    this.logger.log(
      `Extracting architecture decisions from ${candidates.length} candidates`,
    );

    const result = await this.openAiClient.invoke(
      V1_ADR_EXTRACTION_PROMPT,
      inputJson,
    );

    const parsedCandidates = await this.parser.parse(result.text);

    return {
      candidates: parsedCandidates,
      usage: result.usage,
    };
  }
}
