import type { NextFunction, Request, Response } from 'express';

import { sendError } from '../lib/api-response.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  maxRequests: number;
  name: string;
  windowMs: number;
}

const buckets = new Map<string, RateLimitEntry>();

const getClientKey = (request: Request) => {
  return request.ip || request.socket.remoteAddress || 'unknown';
};

const pruneExpiredBuckets = (now: number) => {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

const createRateLimit = ({ maxRequests, name, windowMs }: RateLimitOptions) => {
  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const bucketKey = `${name}:${getClientKey(request)}`;
    const currentEntry = buckets.get(bucketKey);
    const entry =
      currentEntry && currentEntry.resetAt > now
        ? currentEntry
        : {
            count: 0,
            resetAt: now + windowMs
          };

    entry.count += 1;
    buckets.set(bucketKey, entry);

    response.setHeader('RateLimit-Limit', String(maxRequests));
    response.setHeader('RateLimit-Remaining', String(Math.max(maxRequests - entry.count, 0)));
    response.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (buckets.size > 10_000) {
      pruneExpiredBuckets(now);
    }

    if (entry.count > maxRequests) {
      sendError(
        response,
        {
          code: 'RATE_LIMITED',
          message: 'Too many requests'
        },
        429
      );
      return;
    }

    next();
  };
};

const readRateLimit = createRateLimit({
  maxRequests: Number(process.env.API_READ_RATE_LIMIT_PER_MINUTE ?? 240),
  name: 'read',
  windowMs: 60_000
});

const writeRateLimit = createRateLimit({
  maxRequests: Number(process.env.API_WRITE_RATE_LIMIT_PER_MINUTE ?? 60),
  name: 'write',
  windowMs: 60_000
});

export const apiRateLimit = (request: Request, response: Response, next: NextFunction) => {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    readRateLimit(request, response, next);
    return;
  }

  writeRateLimit(request, response, next);
};
