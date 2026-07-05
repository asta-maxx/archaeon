import { Injectable } from '@nestjs/common';
import { ArchitectureDecision } from '../../shared/types';

@Injectable()
export class DuplicateDetectionService {
  /**
   * Compares decisions within a batch to identify near-duplicates.
   * If similarity > threshold, the one with the lower confidence score
   * gets its duplicateOf set to the higher-confidence one.
   *
   * @param decisions The array of decisions to process in-place.
   * @param threshold Jaccard index threshold (0.0 to 1.0). Default 0.75.
   */
  public deduplicate(
    decisions: ArchitectureDecision[],
    threshold: number = 0.75,
  ): void {
    if (decisions.length < 2) return;

    // We tokenize each once to save computation
    const tokenized = decisions.map((d) => ({
      decision: d,
      tokens: this.tokenize(`${d.title} ${d.description}`),
    }));

    // O(N^2) comparison within the batch
    for (let i = 0; i < tokenized.length; i++) {
      for (let j = i + 1; j < tokenized.length; j++) {
        const itemA = tokenized[i];
        const itemB = tokenized[j];

        // Skip if either is already marked as a duplicate
        if (itemA.decision.duplicateOf || itemB.decision.duplicateOf) {
          continue;
        }

        const similarity = this.jaccardIndex(itemA.tokens, itemB.tokens);

        if (similarity >= threshold) {
          if (
            itemA.decision.confidenceScore >= itemB.decision.confidenceScore
          ) {
            itemB.decision.duplicateOf = itemA.decision.id;
          } else {
            itemA.decision.duplicateOf = itemB.decision.id;
          }
        }
      }
    }
  }

  private tokenize(text: string): Set<string> {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2); // ignore very short words like 'a', 'is'
    return new Set(words);
  }

  private jaccardIndex(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0;

    let intersectionCount = 0;
    for (const token of setA) {
      if (setB.has(token)) {
        intersectionCount++;
      }
    }

    const unionCount = setA.size + setB.size - intersectionCount;
    return intersectionCount / unionCount;
  }
}
