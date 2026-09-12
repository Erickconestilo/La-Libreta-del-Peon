type AuthProvider = 'guest' | 'supabase';
type UserRole = 'admin' | 'topografo' | 'visitante';
type ProjectAccessLevel = 'read' | 'write';

export interface AuthenticatedUser {
  authProvider: AuthProvider;
  email: string | null;
  id: string;
  role: UserRole;
  projectIds: string[] | null;
  projectAccess?: Record<string, ProjectAccessLevel> | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
