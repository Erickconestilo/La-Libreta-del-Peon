import type { AuthProvider, UserRole } from '../../../../shared/types.js';

export interface AuthenticatedUser {
  authProvider: AuthProvider;
  email: string | null;
  id: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
