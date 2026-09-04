import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { deriveErrorCode, deriveErrorDetails } from './error-codes';

interface ErrorResponseBody {
  code: string;
  message: string;
  details?: unknown;
  traceId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const code =
      exception instanceof HttpException
        ? deriveErrorCode(exception)
        : 'INTERNAL_ERROR';
    const details =
      exception instanceof HttpException
        ? deriveErrorDetails(exception)
        : undefined;

    if (status >= 500) {
      this.logger.error(
        { code, traceId: request.id, err: exception },
        'Unhandled exception',
      );
    }

    const body: ErrorResponseBody = {
      code,
      message: code,
      details,
      traceId: request.id,
    };
    response.status(status).json(body);
  }
}
