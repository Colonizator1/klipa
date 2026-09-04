export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  traceId?: string;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.code);
    this.status = status;
    this.body = body;
  }
}

const API_BASE = '/api/v1';

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body: ApiErrorBody =
      data && typeof data === 'object' && 'code' in data
        ? (data as ApiErrorBody)
        : { code: 'UNKNOWN_ERROR', message: 'UNKNOWN_ERROR' };
    throw new ApiRequestError(response.status, body);
  }

  return data as T;
}
