import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  PORT: number = 3000;

  @IsString()
  OPENAI_API_KEY!: string;

  @IsString()
  GITHUB_APP_ID!: string;

  @IsString()
  GITHUB_APP_PRIVATE_KEY!: string;

  @IsString()
  INTERNAL_API_KEY!: string;

  @IsString()
  @IsOptional()
  ARCHAEON_BACKEND_URL: string = 'http://backend:8000';

  @IsString()
  LOG_LEVEL: string = 'info';

  @IsNumber()
  @IsOptional()
  WEBHOOK_LARGE_DIFF_THRESHOLD: number = 50;

  @IsNumber()
  @IsOptional()
  MAX_CONCURRENT_JOBS: number = 5;

  @IsNumber()
  @IsOptional()
  GITHUB_TIMEOUT_MS: number = 10000;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
