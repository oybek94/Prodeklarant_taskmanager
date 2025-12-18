import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import apiClient from '../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'DEKLARANT';
  branchId?: number | null;
}

interface AuthContextType {
  user: User | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (accessToken || refreshToken) {
        try {
          // Avval access token bilan urinib ko'ramiz
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
        } catch (error: any) {
          // Agar access token eskirgan bo'lsa, refresh token bilan yangilashga harakat qilamiz
          if (refreshToken && error.response?.status === 401) {
            try {
              const refreshResponse = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/auth/refresh`,
                { refreshToken }
              );
              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;
              localStorage.setItem('accessToken', newAccessToken);
              if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken);
              }
              // Yangi token bilan user ma'lumotlarini olamiz
              const userResponse = await apiClient.get('/auth/me');
              setUser(userResponse.data);
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

  const login = async (password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { password });
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

