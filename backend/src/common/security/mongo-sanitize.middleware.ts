import type { NextFunction, Request, RequestHandler, Response } from 'express';

const PROHIBITED_KEY = /^\$|\./;

// Strips $-operator and dotted-path keys from req.body/query/params to block
// Mongo operator injection. Mutates in place rather than reassigning
// req.query — Express 5 made `req.query` a getter-only property, and the
// `express-mongo-sanitize` package (last released for Express 4) does
// `req.query = ...`, which throws on every request under Nest 11.
function sanitizeInPlace(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(sanitizeInPlace);
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (PROHIBITED_KEY.test(key)) {
      delete record[key];
      continue;
    }
    sanitizeInPlace(record[key]);
  }
}

export function mongoSanitize(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    sanitizeInPlace(req.body);
    sanitizeInPlace(req.query);
    sanitizeInPlace(req.params);
    next();
  };
}
