import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class ConcurrencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ConcurrencyInterceptor.name);
  private currentJobs = 0;
  private readonly maxJobs: number;

  constructor(private readonly configService: ConfigService) {
    this.maxJobs = this.configService.get<number>('MAX_CONCURRENT_JOBS') || 5;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (this.currentJobs >= this.maxJobs) {
      this.logger.warn(
        `Concurrency limit reached. Rejecting request. Current: ${this.currentJobs}, Max: ${this.maxJobs}`,
      );
      return throwError(
        () =>
          new HttpException(
            'Too Many Requests: Concurrency limit reached',
            HttpStatus.TOO_MANY_REQUESTS,
          ),
      );
    }

    this.currentJobs++;
    this.logger.debug(
      `Job started. Current concurrent jobs: ${this.currentJobs}`,
    );

    return next.handle().pipe(
      tap(() => {
        this.currentJobs--;
        this.logger.debug(
          `Job completed. Current concurrent jobs: ${this.currentJobs}`,
        );
      }),
      catchError((err) => {
        this.currentJobs--;
        this.logger.debug(
          `Job failed. Current concurrent jobs: ${this.currentJobs}`,
        );
        return throwError(() => err);
      }),
    );
  }
}
