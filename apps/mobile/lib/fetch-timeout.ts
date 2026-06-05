type FetchWithTimeoutInit = RequestInit & {
  timeoutMessage?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 18000;

const resolveTimeoutMs = (value: number | undefined) => {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return value;
};

export const fetchWithTimeout = async (
  input: Parameters<typeof fetch>[0],
  init: FetchWithTimeoutInit = {}
) => {
  const { signal, timeoutMessage, timeoutMs, ...requestInit } = init;
  const controller = new AbortController();
  let didTimeout = false;

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, resolveTimeoutMs(timeoutMs));

  const abortFromParent = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  try {
    return await fetch(input, {
      ...requestInit,
      signal: controller.signal
    });
  } catch (error) {
    if (didTimeout) {
      throw new Error(timeoutMessage ?? 'La conexión tardó demasiado. Reintenta en unos segundos.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromParent);
  }
};
