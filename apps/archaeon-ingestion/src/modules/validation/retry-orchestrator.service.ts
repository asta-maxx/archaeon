import { Injectable, Logger } from '@nestjs/common';
import {
  SchemaValidationError,
  OpenAiTimeoutError,
} from '../ai-extraction/errors';

export interface RetryOptions {
  maxAttempts: number;
  baseBackoffMs: number;
}

export interface RetryResult<T> {
  result: T;
  retries: number;
}

@Injectable()
export class RetryOrchestratorService {
  private readonly logger = new Logger(RetryOrchestratorService.name);

  /**
   * Retries an async operation (e.g. LLM extraction) if it fails with recoverable errors.
   * Uses exponential backoff.
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    contextInfo: string = 'operation',
  ): Promise<RetryResult<T>> {
    let attempt = 1;

    while (true) {
      try {
        const result = await operation();
        return { result, retries: attempt - 1 };
      } catch (error: any) {
        if (this.isRecoverable(error) && attempt < options.maxAttempts) {
          const delayMs = options.baseBackoffMs * Math.pow(2, attempt - 1);
          this.logger.warn(
            `Recoverable error during ${contextInfo} (attempt ${attempt}/${options.maxAttempts}): ${error.message}. Retrying in ${delayMs}ms...`,
          );
          await this.sleep(delayMs);
          attempt++;
        } else {
          this.logger.error(
            `Failed ${contextInfo} after ${attempt} attempts: ${error.message}`,
          );
          throw error;
        }
      }
    }
  }

  private isRecoverable(error: any): boolean {
    return (
      error instanceof SchemaValidationError ||
      error instanceof OpenAiTimeoutError
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
