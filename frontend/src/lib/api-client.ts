/**
 * Enhanced API Client for production environments.
 * Handles authentication, unified error responses, and configuration.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface FastAPIValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('fincast_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    const headers = new Headers(options.headers || {});
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (!headers.has('Content-Type') && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
      headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      
      if (response.status === 401) {
        // Handle unauthorized (logout or redirect to login)
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
          localStorage.removeItem('fincast_token');
          // Optional: redirect to login
          // window.location.href = '/auth/login';
        }
      }

      if (!response.ok) {
        let errorMsg = 'An unexpected error occurred';
        try {
          const errorData = await response.json();
          if (Array.isArray(errorData.detail)) {
            // Handle FastAPI validation error list
            errorMsg = (errorData.detail as FastAPIValidationError[]).map((err) => `${err.loc.join('.')}: ${err.msg}`).join(', ');
          } else {
            errorMsg = errorData.detail || errorData.message || response.statusText;
          }
        } catch {
          errorMsg = response.statusText;
        }
        throw new Error(errorMsg);
      }

      // If response is empty (e.g., 204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request Error [${endpoint}]:`, error);
      throw error;
    }
  }

  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Makes a GET request and returns both the parsed JSON body and the raw
   * response headers. Useful for endpoints that return metadata in headers
   * (e.g., X-Total-Count for paginated lists).
   */
  async getWithHeaders<T>(endpoint: string, options?: RequestInit): Promise<{ data: T; headers: Headers }> {
    const token = this.getAuthToken();
    const headers = new Headers(options?.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorMsg = 'An unexpected error occurred';
      try {
        const errorData = await response.json();
        errorMsg = Array.isArray(errorData.detail)
          ? (errorData.detail as FastAPIValidationError[]).map((e) => `${e.loc.join('.')}: ${e.msg}`).join(', ')
          : errorData.detail || response.statusText;
      } catch {
        errorMsg = response.statusText;
      }
      throw new Error(errorMsg);
    }

    const data: T = await response.json();
    return { data, headers: response.headers };
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const requestBody = (body instanceof FormData || body instanceof URLSearchParams) 
      ? body 
      : (body ? JSON.stringify(body) : undefined);
      
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: requestBody as BodyInit,
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const requestBody = (body instanceof FormData || body instanceof URLSearchParams) 
      ? body 
      : (body ? JSON.stringify(body) : undefined);

    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: requestBody as BodyInit,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(BACKEND_URL);
