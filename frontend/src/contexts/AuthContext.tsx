import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import apiClient from '../lib/api';

interface User {
  id: number;
  name: string;
  email?: string;
  role: 'ADMIN' | 'MANAGER' | 'DEKLARANT' | 'CLIENT';
  branchId?: number | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to decode JWT token and get role
  const getRoleFromToken = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch {
      return null;
    }
  };

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (accessToken || refreshToken) {
        try {
          // Determine which endpoint to use based on token role
          const role = accessToken ? getRoleFromToken(accessToken) : null;
          const endpoint = role === 'CLIENT' ? '/auth/client/me' : '/auth/me';
          
          // Avval access token bilan urinib ko'ramiz
          const response = await apiClient.get(endpoint);
          const userData = response.data;
          
          // For CLIENT, add role from token since backend doesn't return it
          if (role === 'CLIENT') {
            userData.role = 'CLIENT';
          }
          
          setUser(userData);
        } catch (error: any) {
          // Agar access token eskirgan bo'lsa, refresh token bilan yangilashga harakat qilamiz
          if (refreshToken && error.response?.status === 401) {
            try {
              const refreshResponse = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api')}/auth/refresh`,
                { refreshToken }
              );
              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;
              localStorage.setItem('accessToken', newAccessToken);
              if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken);
              }
              // Determine endpoint from new token
              const newRole = newAccessToken ? getRoleFromToken(newAccessToken) : null;
              const endpoint = newRole === 'CLIENT' ? '/auth/client/me' : '/auth/me';
              // Yangi token bilan user ma'lumotlarini olamiz
              const userResponse = await apiClient.get(endpoint);
              const userData = userResponse.data;
              
              // For CLIENT, add role from token since backend doesn't return it
              if (newRole === 'CLIENT') {
                userData.role = 'CLIENT';
              }
              
              setUser(userData);
            } catch (refreshError) {
              // Refresh ham ishlamasa, logout qilamiz
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
            }
          } else {
            // Boshqa xatolik bo'lsa, tokenlarni tozalaymiz
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Email bo'sh bo'lsa, undefined yuboramiz
      const response = await apiClient.post('/auth/login', { 
        ...(email && email.trim() !== '' ? { email } : {}),
        password 
      });
      const { accessToken, refreshToken, user: userData } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
    } catch (error: any) {
      console.error('Login API error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

