import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from '../guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedUser => {
    return context.switchToHttp().getRequest<RequestWithUser>().user;
  },
);
