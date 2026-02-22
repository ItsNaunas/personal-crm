const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: string,
  path: string,
  orgId: string | null,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (orgId) {
    headers['x-org-id'] = orgId;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorBody: unknown;
    let message = `Request failed: ${res.status} ${res.statusText}`;
    try {
      errorBody = await res.json();
      if (
        errorBody &&
        typeof errorBody === 'object' &&
        'message' in errorBody
      ) {
        const m = (errorBody as { message: string | string[] }).message;
        message = Array.isArray(m) ? m.join(', ') : String(m);
      }
    } catch {
      // ignore JSON parse error
    }
    throw new ApiError(message, res.status, errorBody);
  }

  // Handle 204 No Content or empty body (e.g. some DELETE endpoints return 200 with no body)
  if (res.status === 204) {
    return undefined as T;
  }
  const contentLength = res.headers.get('content-length');
  if (contentLength === '0') {
    return undefined as T;
  }

  try {
    return (await res.json()) as T;
  } catch {
    // Empty or invalid JSON body on success (e.g. 200 with no body) — treat as no content
    return undefined as T;
  }
}

export function createApiClient(orgId: string | null) {
  return {
    get<T>(path: string): Promise<T> {
      return request<T>('GET', path, orgId);
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return request<T>('POST', path, orgId, body);
    },
    patch<T>(path: string, body?: unknown): Promise<T> {
      return request<T>('PATCH', path, orgId, body);
    },
    delete<T>(path: string, body?: unknown): Promise<T> {
      return request<T>('DELETE', path, orgId, body);
    },
  };
}

/** Fetches the default org ID - does not need x-org-id */
export async function fetchDefaultOrg(): Promise<{ orgId: string }> {
  const res = await fetch(`${BASE_URL}/org/default`);
  if (!res.ok) {
    let message = 'Could not load organization. Check API is running and DEFAULT_ORG_ID is set.';
    try {
      const body = await res.json() as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }
  return res.json();
}
