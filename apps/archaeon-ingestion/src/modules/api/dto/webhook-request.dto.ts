import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNumber, IsObject, IsUUID } from 'class-validator';

export class WebhookRequestDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique job identifier mapping back to the caller',
  })
  @IsUUID()
  jobId!: string;

  @ApiProperty({
    example: {
      repository: {
        owner: { login: 'octocat' },
        name: 'Hello-World',
      },
      ref: 'refs/heads/main',
      commits: [],
    },
    description: 'Raw payload from GitHub webhook',
  })
  @IsDefined()
  @IsObject()
  githubEvent!: Record<string, any>;

  @ApiProperty({ example: 12345678, description: 'GitHub App Installation ID' })
  @IsNumber()
  installationId!: number;
}
