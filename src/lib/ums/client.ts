interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ErrorResponse {
  error: string;
  detail?: string;
  status: number;
}

class UmsError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'UmsError';
    this.status = status;
    this.detail = detail;
  }
}

async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new UmsError('Request timeout', 408);
    }
    throw error;
  }
}

async function fetchWithRetries(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { retries = 2, retryDelay = 1000, ...fetchOptions } = options;

  let lastError: Error | undefined;

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions);

      if (!response.ok && i < retries && response.status >= 500) {
        // Retry on server errors
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * Math.pow(2, i))
        );
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * Math.pow(2, i))
        );
        continue;
      }
    }
  }

  throw lastError || new UmsError('Unknown error', 500);
}

export async function umsRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_UMS_GRAPH_BASE_URL || 'http://127.0.0.1:8091';
  const url = `${baseUrl}${endpoint}`;

  // Get auth token if available
  let authHeader: Record<string, string> = {};
  try {
    const { getIdToken } = await import('../auth/token');
    const token = await getIdToken();
    if (token) {
      authHeader = { Authorization: `Bearer ${token}` };
    }
  } catch (error) {
    console.warn('Auth not available, proceeding without token');
  }

  try {
    const response = await fetchWithRetries(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: ErrorResponse;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        };
      }
      throw new UmsError(
        errorData.error || 'Request failed',
        response.status,
        errorData.detail
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof UmsError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new UmsError(error.message, 500);
    }
    throw new UmsError('Unknown error', 500);
  }
}

export { UmsError };
export type { FetchOptions, ErrorResponse };