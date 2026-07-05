import { Injectable, Logger } from '@nestjs/common';
import { ArchitectureDecision } from '../../shared/types';

export interface QualityFilterOptions {
  minConfidenceScore: number;
}

@Injectable()
export class QualityFilterService {
  private readonly logger = new Logger(QualityFilterService.name);

  /**
   * Drops decisions that fall below the minimum confidence threshold.
   * Logs dropped candidates.
   *
   * @param decisions The array of decisions to filter.
   * @param options Configuration options, like minConfidenceScore.
   * @returns An array of decisions that passed the filter.
   */
  public filter(
    decisions: ArchitectureDecision[],
    options: QualityFilterOptions = { minConfidenceScore: 45 },
  ): ArchitectureDecision[] {
    const passed: ArchitectureDecision[] = [];

    for (const decision of decisions) {
      if (decision.confidenceScore < options.minConfidenceScore) {
        this.logger.log(
          `Dropped decision '${decision.id}' ('${decision.title}') - Score ${decision.confidenceScore} is below threshold ${options.minConfidenceScore}`,
        );
      } else {
        passed.push(decision);
      }
    }

    return passed;
  }
}
