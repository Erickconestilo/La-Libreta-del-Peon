type AuthProvider = 'guest' | 'supabase';
type UserRole = 'admin' | 'topografo' | 'visitante';

export interface AuthenticatedUser {
  authProvider: AuthProvider;
  email: string | null;
  id: string;
  role: UserRole;
  projectIds: string[] | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
