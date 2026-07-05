import { IsString, IsArray, IsOptional } from 'class-validator';
import { ArchitectureDecisionCandidate } from '../../../shared/types';

export class ArchitectureDecisionCandidateDto implements ArchitectureDecisionCandidate {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  rationale: string;

  @IsArray()
  @IsString({ each: true })
  alternatives: string[];

  @IsArray()
  @IsString({ each: true })
  sourceRefs: string[];

  @IsString()
  extractedAt: string;

  @IsOptional()
  @IsString()
  rawConfidenceSignal?: string;
}
