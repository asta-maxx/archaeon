import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ArchitectureDecisionCandidate } from '../../shared/types';
import { SchemaValidationError } from './errors';
import { ArchitectureDecisionCandidateDto } from './dto/architecture-decision-candidate.dto';

@Injectable()
export class StructuredOutputParserService {
  private readonly logger = new Logger(StructuredOutputParserService.name);

  /**
   * Parses raw LLM JSON text and validates it matches the required array schema.
   * On mismatch, throws SchemaValidationError.
   */
  public async parse(
    rawText: string,
  ): Promise<ArchitectureDecisionCandidate[]> {
    let parsed: any;
    try {
      // Sometimes LLMs wrap JSON in markdown blocks even when told not to.
      const cleanText = this.stripMarkdownBlocks(rawText);
      parsed = JSON.parse(cleanText);
    } catch (error: any) {
      this.logger.error(`Failed to parse LLM output as JSON: ${error.message}`);
      throw new SchemaValidationError('LLM output is not valid JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new SchemaValidationError('LLM output must be a JSON array');
    }

    const validated: ArchitectureDecisionCandidate[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      const dto = plainToInstance(ArchitectureDecisionCandidateDto, item);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const messages = errors
          .map((e) => Object.values(e.constraints || {}).join(', '))
          .join('; ');
        this.logger.error(`Validation failed at index ${i}: ${messages}`);
        throw new SchemaValidationError(
          `Validation failed at index ${i}: ${messages}`,
        );
      }

      validated.push(dto);
    }

    return validated;
  }

  private stripMarkdownBlocks(text: string): string {
    return text
      .replace(/^```(json)?\n?/g, '')
      .replace(/\n?```$/g, '')
      .trim();
  }
}
