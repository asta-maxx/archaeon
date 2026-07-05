import { Injectable } from '@nestjs/common';
import {
  ArchitectureDecisionCandidate,
  NormalizedAdrCandidate,
} from '../../shared/types';

export interface ConfidenceScoreResult {
  score: number;
  confidence: 'low' | 'medium' | 'high';
}

@Injectable()
export class ConfidenceScoringService {
  /**
   * Deterministic scoring function for Architecture Decisions.
   *
   * Scoring Rubric (Max 100):
   * Base Score: 50
   *
   * Signal Strength (based on source type):
   * - 'file' (Explicit ADR document): +30
   * - 'pr' (Pull Request body): +15
   * - 'commit' (Commit message): +0
   *
   * LLM Raw Confidence Signal:
   * - Matches 'high' (case-insensitive): +20
   * - Matches 'medium' (case-insensitive): +10
   * - Matches 'low' or empty: +0
   *
   * Completeness Penalties:
   * - Missing/short rationale (< 10 chars): -15
   * - Missing alternatives (empty array): -10
   *
   * Score Bands:
   * - >= 75: 'high'
   * - >= 45: 'medium'
   * - < 45: 'low'
   */
  public score(
    candidate: ArchitectureDecisionCandidate,
    originals: NormalizedAdrCandidate[],
  ): ConfidenceScoreResult {
    let score = 50; // Base score

    // 1. Signal Strength (match sourceRefs to original NormalizedAdrCandidate)
    const sourceTypes = new Set<string>();
    for (const ref of candidate.sourceRefs || []) {
      const original = originals.find((o) => o.sourceRef === ref);
      if (original) {
        sourceTypes.add(original.sourceType);
      }
    }

    if (sourceTypes.has('file')) {
      score += 30;
    } else if (sourceTypes.has('pr')) {
      score += 15;
    }

    // 2. LLM Raw Confidence Signal
    const rawSignal = (candidate.rawConfidenceSignal || '').toLowerCase();
    if (rawSignal.includes('high')) {
      score += 20;
    } else if (rawSignal.includes('medium')) {
      score += 10;
    }

    // 3. Completeness Penalties
    if (!candidate.rationale || candidate.rationale.trim().length < 10) {
      score -= 15;
    }
    if (!candidate.alternatives || candidate.alternatives.length === 0) {
      score -= 10;
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine band
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (score >= 75) {
      confidence = 'high';
    } else if (score >= 45) {
      confidence = 'medium';
    }

    return { score, confidence };
  }
}
