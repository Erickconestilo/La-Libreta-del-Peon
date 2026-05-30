import type { UserRole } from '../../../../shared/types.js';

export interface AuthenticatedUser {
  authProvider: 'guest' | 'supabase';
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
