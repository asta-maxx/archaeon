import {
  Controller,
  Post,
  Body,
  UseGuards,
  InternalServerErrorException,
  Logger,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { PipelineService } from '../pipeline/pipeline.service';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { ConcurrencyInterceptor } from '../../common/interceptors/concurrency.interceptor';
import { JobContext } from '../../shared/types';

@ApiTags('Internal API')
@ApiSecurity('internal-api-key')
@UseGuards(InternalApiKeyGuard)
@UseInterceptors(ConcurrencyInterceptor)
@Controller('internal/v1/analyze')
export class AnalyzeController {
  private readonly logger = new Logger(AnalyzeController.name);

  constructor(private readonly pipelineService: PipelineService) {}

  @Post()
  @ApiOperation({
    summary: 'Analyze Repository',
    description:
      'Triggers the pipeline to fetch, parse, and extract architecture decisions from a repository based on the provided scope.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Pipeline execution finished (success, partial, or failed gracefully).',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed (e.g., missing jobId or repository information).',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (invalid or missing X-Internal-Api-Key).',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error from catastrophic downstream failure.',
  })
  async analyze(@Body() dto: AnalyzeRequestDto) {
    try {
      const isFullRepo = !dto.scope?.paths?.length && !dto.scope?.since;

      const jobContext: JobContext = {
        jobId: dto.jobId,
        repository: dto.repository,
        scope: {
          paths: dto.scope?.paths,
          since: dto.scope?.since,
          isFullRepo: isFullRepo,
        },
      };

      return await this.pipelineService.run(jobContext);
    } catch (error: any) {
      this.logger.error(
        `Unhandled error during analyze controller invocation for job ${dto.jobId}`,
        error?.stack,
      );
      // Ensure we don't leak stack traces or tokens to the caller
      throw new InternalServerErrorException(
        'An unexpected error occurred during repository analysis.',
      );
    }
  }
}
