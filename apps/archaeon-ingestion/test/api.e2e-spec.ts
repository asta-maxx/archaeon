process.env.INTERNAL_API_KEY = 'test-api-key';
process.env.OPENAI_API_KEY = 'test-openai';
process.env.GITHUB_APP_ID = 'test-app';
process.env.GITHUB_APP_PRIVATE_KEY = 'test-key';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import type { Response } from 'supertest';
import { AppModule } from './../src/app.module';
import { PipelineService } from '../src/modules/pipeline/pipeline.service';
import { WebhookProcessorService } from '../src/modules/webhook-processor/webhook-processor.service';
import { BackendClientService } from '../src/modules/backend-client/backend-client.service';

describe('API Layer (e2e)', () => {
  let app: INestApplication;
  let pipelineService: jest.Mocked<PipelineService>;
  let webhookService: jest.Mocked<WebhookProcessorService>;

  const VALID_API_KEY = 'test-api-key';

  beforeAll(async () => {
    pipelineService = {
      run: jest.fn(),
    } as any;

    webhookService = {
      process: jest.fn(),
    } as any;

    const mockBackendClient = {
      reportPipelineResult: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PipelineService)
      .useValue(pipelineService)
      .overrideProvider(WebhookProcessorService)
      .useValue(webhookService)
      .overrideProvider(BackendClientService)
      .useValue(mockBackendClient)
      .compile();

    app = moduleFixture.createNestApplication();

    // Exact same validation configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /internal/v1/analyze', () => {
    const validPayload = {
      jobId: '123e4567-e89b-12d3-a456-426614174000',
      repository: {
        owner: 'octocat',
        name: 'Hello-World',
        ref: 'main',
        installationId: 12345,
      },
    };

    it('should return 401 if missing X-Internal-Api-Key', () => {
      return request(app.getHttpServer())
        .post('/internal/v1/analyze')
        .send(validPayload)
        .expect(401);
    });

    it('should return 401 if invalid X-Internal-Api-Key', () => {
      return request(app.getHttpServer())
        .post('/internal/v1/analyze')
        .set('x-internal-api-key', 'wrong-key')
        .send(validPayload)
        .expect(401);
    });

    it('should return 400 for malformed payload (missing jobId)', () => {
      const invalidPayload = { ...validPayload, jobId: undefined };
      return request(app.getHttpServer())
        .post('/internal/v1/analyze')
        .set('x-internal-api-key', VALID_API_KEY)
        .send(invalidPayload)
        .expect(400)
        .expect((res: Response) => {
          expect(res.body.message).toEqual(
            expect.arrayContaining([
              expect.stringContaining('jobId must be a UUID'),
            ]),
          );
        });
    });

    it('should return 201 and PipelineResult on success', async () => {
      const mockResult = {
        status: 'success',
        decisions: [],
        metrics: {},
        logs: [],
      };
      pipelineService.run.mockResolvedValueOnce(mockResult as any);

      return request(app.getHttpServer())
        .post('/internal/v1/analyze')
        .set('x-internal-api-key', VALID_API_KEY)
        .send(validPayload)
        .expect(201)
        .expect((res: Response) => {
          expect(res.body).toEqual(mockResult);
          expect(pipelineService.run).toHaveBeenCalledWith({
            jobId: validPayload.jobId,
            repository: validPayload.repository,
            scope: { isFullRepo: true },
          });
        });
    });

    it('should return 500 without leaking internals if PipelineService throws', async () => {
      pipelineService.run.mockRejectedValueOnce(
        new Error('Super secret stack trace: openai_api_key=sk-123'),
      );

      return request(app.getHttpServer())
        .post('/internal/v1/analyze')
        .set('x-internal-api-key', VALID_API_KEY)
        .send(validPayload)
        .expect(500)
        .expect((res: Response) => {
          expect(res.body.message).toBe(
            'An unexpected error occurred during repository analysis.',
          );
          expect(res.body.message).not.toContain('sk-123');
          expect(res.body.message).not.toContain('stack');
        });
    });

    it('should reject requests with 429 when MAX_CONCURRENT_JOBS is exceeded', async () => {
      let resolveHangingJob: (value: any) => void;
      const hangingPromise = new Promise((resolve) => {
        resolveHangingJob = resolve;
      });

      pipelineService.run.mockReturnValue(hangingPromise as any);

      const reqs = [];
      for (let i = 0; i < 5; i++) {
        // Trigger the requests but don't await their resolution yet
        const req = request(app.getHttpServer())
          .post('/internal/v1/analyze')
          .set('x-internal-api-key', VALID_API_KEY)
          .send(validPayload);
        req.end(() => {}); // .end() executes the request in supertest
        reqs.push(req);
      }

      // Wait a tiny bit to ensure all 5 requests have hit the interceptor
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        await request(app.getHttpServer())
          .post('/internal/v1/analyze')
          .set('x-internal-api-key', VALID_API_KEY)
          .send(validPayload)
          .expect(429);
      } finally {
        resolveHangingJob!({});
        // We don't necessarily need to wait for reqs because they will resolve
        // to 201 once hangingPromise resolves.
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    });
  });

  describe('POST /internal/v1/webhook', () => {
    const validPayload = {
      jobId: '123e4567-e89b-12d3-a456-426614174000',
      githubEvent: { action: 'opened' },
      installationId: 12345,
    };

    it('should return 401 if missing X-Internal-Api-Key', () => {
      return request(app.getHttpServer())
        .post('/internal/v1/webhook')
        .send(validPayload)
        .expect(401);
    });

    it('should return 400 for malformed payload (missing githubEvent)', () => {
      const invalidPayload = { ...validPayload, githubEvent: undefined };
      return request(app.getHttpServer())
        .post('/internal/v1/webhook')
        .set('x-internal-api-key', VALID_API_KEY)
        .send(invalidPayload)
        .expect(400);
    });

    it('should return 201 on success (passing headers)', async () => {
      const mockResult = { status: 'skipped', reason: 'unsupported' };
      webhookService.process.mockResolvedValueOnce(mockResult as any);

      return request(app.getHttpServer())
        .post('/internal/v1/webhook')
        .set('x-internal-api-key', VALID_API_KEY)
        .set('x-github-event', 'pull_request')
        .send(validPayload)
        .expect(201)
        .expect((res: Response) => {
          expect(res.body).toEqual(mockResult);
          expect(webhookService.process).toHaveBeenCalledWith(
            validPayload.jobId,
            'pull_request',
            validPayload.githubEvent,
            validPayload.installationId,
          );
        });
    });

    it('should return 500 without leaking internals if WebhookProcessorService throws', async () => {
      webhookService.process.mockRejectedValueOnce(
        new Error('Super secret DB credentials'),
      );

      return request(app.getHttpServer())
        .post('/internal/v1/webhook')
        .set('x-internal-api-key', VALID_API_KEY)
        .send(validPayload)
        .expect(500)
        .expect((res: Response) => {
          expect(res.body.message).toBe(
            'An unexpected error occurred during webhook processing.',
          );
          expect(res.body.message).not.toContain('credentials');
        });
    });
  });
});
