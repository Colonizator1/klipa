import { HttpException, HttpStatus } from '@nestjs/common';

export class RateLimitExceededException extends HttpException {
  constructor(retryAfterSeconds: number) {
    super(
      { code: 'RATE_LIMITED', retryAfterSeconds },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
