import { Config } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  private baseURL = Config.API_BASE_URL;
  private timeout = Config.TIMEOUT;

  // Get authentication token
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('@winkroom_auth_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Create headers with authentication
  private async createHeaders(customHeaders?: Record<string, string>): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...customHeaders,
    };
    return headers;
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
    const headers = await this.createHeaders(customHeaders);

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).message?.startsWith('HTTP error')) throw error;
      console.error('GET request error:', error);
      throw error;
    }
  }

  // Generic POST request
  async post<T>(endpoint: string, data?: any, customHeaders?: Record<string, string>): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.createHeaders(customHeaders);

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
      console.error('POST request error:', error);
      throw error;
    }
  }

  // Generic PUT request
  async put<T>(endpoint: string, data?: any, customHeaders?: Record<string, string>): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.createHeaders(customHeaders);

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
      console.error('PUT request error:', error);
      throw error;
    }
  }

  // Generic DELETE request
  async delete<T>(endpoint: string, customHeaders?: Record<string, string>): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.createHeaders(customHeaders);

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
      console.error('DELETE request error:', error);
      throw error;
    }
  }

  // Upload file with FormData
  async uploadFile<T>(endpoint: string, formData: FormData, customHeaders?: Record<string, string>): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAuthToken();
    
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...customHeaders,
    };

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
      console.error('File upload error:', error);
      throw error;
    }
  }

  // Upload profile picture specifically
  async uploadProfilePicture<T>(formData: FormData): Promise<T> {
    return this.uploadFile<T>('/auth/profile-picture', formData);
  }
}

export const apiService = new ApiService(); 