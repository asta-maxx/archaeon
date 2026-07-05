export interface ArchitectureDecisionCandidate {
  id: string;
  title: string;
  description: string;
  rationale: string;
  alternatives: string[];
  sourceRefs: string[];
  extractedAt: string;
  rawConfidenceSignal?: string;
}

export interface ArchitectureDecision extends ArchitectureDecisionCandidate {
  confidence: 'low' | 'medium' | 'high';
  confidenceScore: number;
  duplicateOf?: string;
}
