import { Config } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Authentication service for handling login, register, and social authentication

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  bio?: string;
  authType?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isActive?: boolean;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private baseURL = Config.API_BASE_URL;
  private tokenKey = '@winkroom_auth_token';
  private userKey = '@winkroom_user_data';

  // Manual Authentication
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Sending login request to:', `${this.baseURL}/auth/login`);
      console.log('Login payload:', credentials);
      
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('Login response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `Login failed (${response.status})`;
        } catch (parseError) {
          errorMessage = `Login failed (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Login success response:', responseData);
      
      // Handle different response structures
      let authData: AuthResponse;
      if (responseData.data && responseData.data.user && responseData.data.token) {
        // Backend returns { message, data: { user, token, message } }
        authData = {
          user: responseData.data.user,
          token: responseData.data.token,
        };
      } else if (responseData.user && responseData.token) {
        // Backend returns { user, token } directly
        authData = responseData;
      } else {
        throw new Error('Invalid response format from server');
      }
      
      await this.storeAuthData(authData);
      return authData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      console.log('Sending registration request to:', `${this.baseURL}/auth/register`);
      console.log('Registration payload:', credentials);
      
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('Registration response status:', response.status);
      console.log('Registration response headers:', response.headers);

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `Registration failed (${response.status})`;
        } catch (parseError) {
          errorMessage = `Registration failed (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Registration success response:', responseData);
      
      // Handle different response structures
      let authData: AuthResponse;
      if (responseData.data && responseData.data.user && responseData.data.token) {
        // Backend returns { message, data: { user, token, message } }
        authData = {
          user: responseData.data.user,
          token: responseData.data.token,
        };
      } else if (responseData.user && responseData.token) {
        // Backend returns { user, token } directly
        authData = responseData;
      } else {
        throw new Error('Invalid response format from server');
      }
      
      await this.storeAuthData(authData);
      return authData;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Social Authentication
  async socialSignIn(provider: 'google' | 'apple', profile: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseURL}/auth/social-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          profile,
        }),
      });

      if (!response.ok) {
        let errorMessage = `${provider} sign-in failed`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `${provider} sign-in failed (${response.status})`;
        } catch (parseError) {
          errorMessage = `${provider} sign-in failed (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      
      // Handle different response structures
      let authData: AuthResponse;
      if (responseData.data && responseData.data.user && responseData.data.token) {
        // Backend returns { message, data: { user, token, message } }
        authData = {
          user: responseData.data.user,
          token: responseData.data.token,
        };
      } else if (responseData.user && responseData.token) {
        // Backend returns { user, token } directly
        authData = responseData;
      } else {
        throw new Error('Invalid response format from server');
      }
      
      await this.storeAuthData(authData);
      return authData;
    } catch (error) {
      console.error(`${provider} sign-in error:`, error);
      throw error;
    }
  }

  // Legacy methods for backward compatibility
  async googleSignIn(accessToken: string): Promise<AuthResponse> {
    // This method is deprecated, use socialSignIn instead
    throw new Error('Use socialSignIn method with provider and profile data');
  }

  async appleSignIn(identityToken: string): Promise<AuthResponse> {
    // This method is deprecated, use socialSignIn instead
    throw new Error('Use socialSignIn method with provider and profile data');
  }

  // Token Management
  async storeAuthData(authData: AuthResponse): Promise<void> {
    try {
      await AsyncStorage.setItem(this.tokenKey, authData.token);
      await AsyncStorage.setItem(this.userKey, JSON.stringify(authData.user));
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }

  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.tokenKey);
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(this.userKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      const token = await this.getStoredToken();
      
      // Call backend logout endpoint
      if (token) {
        const response = await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        console.log('Logout response status:', response.status);
      }
      
      // Clear local storage regardless of backend response
      await AsyncStorage.removeItem(this.tokenKey);
      await AsyncStorage.removeItem(this.userKey);
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear local storage even if backend call fails
      try {
        await AsyncStorage.removeItem(this.tokenKey);
        await AsyncStorage.removeItem(this.userKey);
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }

  // API request helper with authentication
  async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getStoredToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }
}

export const authService = new AuthService(); 