import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  InternalServerErrorException,
  Logger,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { WebhookRequestDto } from './dto/webhook-request.dto';
import { WebhookProcessorService } from '../webhook-processor/webhook-processor.service';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { ConcurrencyInterceptor } from '../../common/interceptors/concurrency.interceptor';

@ApiTags('Internal API')
@ApiSecurity('internal-api-key')
@UseGuards(InternalApiKeyGuard)
@UseInterceptors(ConcurrencyInterceptor)
@Controller('internal/v1/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookProcessor: WebhookProcessorService) {}

  @Post()
  @ApiOperation({
    summary: 'Process Forwarded Webhook',
    description:
      'Accepts a forwarded GitHub webhook payload, calculates scope dynamically, and triggers the pipeline.',
  })
  @ApiHeader({
    name: 'x-github-event',
    description: 'The GitHub event type (e.g., push, pull_request)',
    required: false,
  })
  @ApiResponse({
    status: 201,
    description: 'Pipeline execution finished, or event was cleanly skipped.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (e.g., missing jobId or payload).',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (invalid or missing X-Internal-Api-Key).',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error from catastrophic downstream failure.',
  })
  async processWebhook(
    @Body() dto: WebhookRequestDto,
    @Headers('x-github-event') githubEventHeader?: string,
  ) {
    try {
      // Fallback for event type if Django wraps it differently or it's not in the headers
      const eventName =
        githubEventHeader || dto.githubEvent?.['x-github-event'] || 'unknown';

      if (eventName === 'unknown') {
        this.logger.warn(`Missing x-github-event header for job ${dto.jobId}`);
      }

      return await this.webhookProcessor.process(
        dto.jobId,
        eventName,
        dto.githubEvent,
        dto.installationId,
      );
    } catch (error: any) {
      this.logger.error(
        `Unhandled error during webhook controller invocation for job ${dto.jobId}`,
        error?.stack,
      );
      // Hide stack trace and internal values completely
      throw new InternalServerErrorException(
        'An unexpected error occurred during webhook processing.',
      );
    }
  }
}
