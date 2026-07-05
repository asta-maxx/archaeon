import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class RepositoryDto {
  @ApiProperty({ example: 'octocat' })
  @IsString()
  owner!: string;

  @ApiProperty({ example: 'Hello-World' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'refs/heads/main' })
  @IsString()
  ref!: string;

  @ApiProperty({ example: 12345678 })
  @IsNumber()
  installationId!: number;
}

export class ScopeDto {
  @ApiPropertyOptional({
    example: '2023-01-01T00:00:00Z',
    description: 'ISO-8601 date string to fetch commits since',
  })
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({
    example: ['src/main.ts', 'src/app.module.ts'],
    description: 'List of specific file paths to scope the analysis',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paths?: string[];
}

export class AnalyzeRequestDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique job identifier mapping back to the caller',
  })
  @IsUUID()
  jobId!: string;

  @ApiProperty({ type: RepositoryDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => RepositoryDto)
  repository!: RepositoryDto;

  @ApiPropertyOptional({ type: ScopeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScopeDto)
  scope?: ScopeDto;
}
