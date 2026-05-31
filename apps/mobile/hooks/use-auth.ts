import { useSession } from '@/src/session/session-provider';

export const useCurrentSession = () => {
  return useSession();
};
