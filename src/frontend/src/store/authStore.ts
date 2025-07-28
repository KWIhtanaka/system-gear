import { create } from 'zustand';
import { AuthState, User } from '../types';
import { authService } from '../services/auth';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: authService.getStoredUser(),
  token: authService.getStoredToken(),
  isAuthenticated: !!authService.getStoredToken(),

  login: (token: string, user: User) => {
    authService.storeAuth(token, user);
    set({ 
      user, 
      token, 
      isAuthenticated: true 
    });
  },

  logout: () => {
    authService.clearAuth();
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false 
    });
  }
}));