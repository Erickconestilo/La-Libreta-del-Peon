import { useSession } from '@/src/session/session-provider';

export { getSessionCacheKey } from '@/src/session/session-cache-key';

export const useCurrentSession = () => {
  return useSession();
};
