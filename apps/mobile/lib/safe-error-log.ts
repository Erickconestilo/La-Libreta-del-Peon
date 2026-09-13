type ErrorMetadata = {
  name?: unknown;
  status?: unknown;
  code?: unknown;
  requestId?: unknown;
};

const SAFE_CODE_PATTERN = /^[A-Z0-9_.-]{1,64}$/i;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,96}$/;

/** Formats operational error metadata without reading the error message/body. */
export const formatSafeErrorForLog = (error: unknown) => {
  const metadata = error && typeof error === 'object' ? error as ErrorMetadata : null;
  const parts: string[] = [];

  if (error instanceof Error && error.name) {
    parts.push(`name=${error.name}`);
  }

  if (typeof metadata?.status === 'number' && Number.isInteger(metadata.status)) {
    parts.push(`status=${metadata.status}`);
  }

  if (typeof metadata?.code === 'string' && SAFE_CODE_PATTERN.test(metadata.code)) {
    parts.push(`code=${metadata.code}`);
  }

  if (typeof metadata?.requestId === 'string' && SAFE_REQUEST_ID_PATTERN.test(metadata.requestId)) {
    parts.push(`requestId=${metadata.requestId}`);
  }

  return parts.join(' ') || 'type=unknown-error';
};

