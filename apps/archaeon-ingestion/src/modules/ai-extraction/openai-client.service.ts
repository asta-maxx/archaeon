import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import * as tiktoken from 'tiktoken';
import { OpenAiRateLimitError, OpenAiTimeoutError } from './errors';

export interface ExtractionResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

@Injectable()
export class OpenAiClientService {
  private readonly logger = new Logger(OpenAiClientService.name);
  private model: ChatOpenAI;
  private readonly maxRetries = 0; // We do not retry here, as per requirements
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('OPENAI_API_KEY') || 'dummy-key-for-tests';
    const modelName =
      this.configService.get<string>('OPENAI_MODEL_NAME') || 'gpt-4o-mini';
    this.timeoutMs =
      this.configService.get<number>('OPENAI_TIMEOUT_MS') || 30000;

    this.model = new ChatOpenAI({
      apiKey,
      modelName,
      temperature: 0, // Deterministic
      maxRetries: this.maxRetries,
      timeout: this.timeoutMs,
    });
  }

  /**
   * Invokes the LLM with the given prompt and input, counting tokens.
   */
  public async invoke(
    systemPrompt: string,
    userInput: string,
  ): Promise<ExtractionResult> {
    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userInput),
    ];

    const promptTokens = this.countTokens(systemPrompt + '\n' + userInput);

    try {
      this.logger.debug(
        `Invoking OpenAI. Estimated prompt tokens: ${promptTokens}`,
      );

      const response = await this.model.invoke(messages);

      const text =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const completionTokens = this.countTokens(text);
      const totalTokens = promptTokens + completionTokens;

      this.logger.debug(
        `OpenAI invocation complete. Total tokens: ${totalTokens}`,
      );

      return {
        text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
      };
    } catch (error: any) {
      this.logger.error(`OpenAI invocation failed: ${error.message}`);

      if (
        error.name === 'TimeoutError' ||
        error.message?.includes('timeout') ||
        error.code === 'ECONNABORTED'
      ) {
        throw new OpenAiTimeoutError(
          `OpenAI request timed out after ${this.timeoutMs}ms`,
        );
      }

      if (error.status === 429 || error.message?.includes('rate limit')) {
        throw new OpenAiRateLimitError('OpenAI API rate limit exceeded');
      }

      throw error;
    }
  }

  /**
   * Simple token counting using tiktoken
   */
  public countTokens(text: string): number {
    // For general gpt-4 or gpt-3.5 models, cl100k_base is used.
    try {
      const enc = tiktoken.get_encoding('cl100k_base');
      const tokens = enc.encode(text);
      enc.free();
      return tokens.length;
    } catch (e) {
      this.logger.warn(
        `Failed to encode text with tiktoken: ${(e as Error).message}. Falling back to approximation.`,
      );
      // Rough fallback: 1 token ~= 4 chars in English
      return Math.ceil(text.length / 4);
    }
  }
}
