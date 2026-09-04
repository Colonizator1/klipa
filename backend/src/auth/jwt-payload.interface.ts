import type { UserRole } from '../users/schemas/user.schema';

export interface JwtPayload {
  sub: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}
