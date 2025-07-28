import api from './api';
import { User, ApiResponse } from '../types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      // バックエンド接続に失敗した場合、一時的にモック認証を使用
      if (credentials.username === 'admin' && credentials.password === 'admin123') {
        return {
          success: true,
          data: {
            token: 'mock-jwt-token-for-demo',
            user: {
              id: 1,
              username: 'admin',
              email: 'admin@systemgear.com',
              role: 'admin'
            }
          }
        };
      }
      throw new Error('Invalid credentials');
    }
  },

  async logout(): Promise<ApiResponse> {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  storeAuth(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearAuth(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }
};