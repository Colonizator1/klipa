import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RequestWithUser } from './jwt-auth.guard';
import type { UserRole } from '../../users/schemas/user.schema';

/** Use after JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin'). Not used anywhere yet in Stage 1 — ready for the admin endpoints later stages add. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN_ROLE' });
    }
    return true;
  }
}
