import { Config } from '@/constants/Config';

class ApiService {
  private baseURL = Config.API_BASE_URL;
  private timeout = Config.TIMEOUT;

  private createHeaders(customHeaders?: Record<string, string>): HeadersInit {
    return { 'Content-Type': 'application/json', ...customHeaders };
  }

  async checkBackend(): Promise<boolean> {
    const url = Config.getHealthUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Math.min(this.timeout, 8000));
    try {
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  }

  async get<T>(endpoint: string, customHeaders?: Record<string, string>): Promise<T | null> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.createHeaders(customHeaders);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) return null;
        const body = await response.text();
        const err = new Error(`HTTP error! status: ${response.status}`);
        (err as Error & { url?: string; status?: number; body?: string }).url = url;
        (err as Error & { url?: string; status?: number; body?: string }).status = response.status;
        (err as Error & { url?: string; status?: number; body?: string }).body = body;
        throw err;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).message?.startsWith('HTTP error')) throw error;
      throw error;
    }
  }

  // Generic POST request
  async post<T>(endpoint: string, data?: any, customHeaders?: Record<string, string>): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.createHeaders(customHeaders);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Generic PUT request
  async put<T>(endpoint: string, data?: any, customHeaders?: Record<string, string>): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.createHeaders(customHeaders);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Generic DELETE request
  async delete<T>(endpoint: string, customHeaders?: Record<string, string>): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.createHeaders(customHeaders);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async uploadFile<T>(endpoint: string, formData: FormData, customHeaders?: Record<string, string>): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = { ...customHeaders };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

export const apiService = new ApiService(); 