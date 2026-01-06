import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import apiClient from '../lib/api';

interface User {
  id: number;
  name: string;
  email?: string;
  role: 'ADMIN' | 'MANAGER' | 'DEKLARANT' | 'CLIENT' | 'CERTIFICATE_WORKER' | 'WORKER' | 'OPERATOR' | 'ACCOUNTANT' | 'OWNER';
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:39',message:'checkAuth started',data:{hasAccessToken:!!localStorage.getItem('accessToken'),hasRefreshToken:!!localStorage.getItem('refreshToken')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (accessToken || refreshToken) {
        try {
          // Determine which endpoint to use based on token role
          const role = accessToken ? getRoleFromToken(accessToken) : null;
          const endpoint = role === 'CLIENT' ? '/auth/client/me' : '/auth/me';
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:50',message:'Before API call',data:{endpoint,role,startTime:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          // Avval access token bilan urinib ko'ramiz
          const response = await apiClient.get(endpoint);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:52',message:'API call succeeded',data:{endpoint,status:response.status,elapsed:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          const userData = response.data;
          
          // For CLIENT, add role from token since backend doesn't return it
          if (role === 'CLIENT') {
            userData.role = 'CLIENT';
          }
          
          setUser(userData);
        } catch (error: any) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:59',message:'API call failed',data:{errorCode:error.code,errorMessage:error.message,status:error.response?.status,isTimeout:error.code==='ECONNABORTED'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          // Timeout yoki network xatolik bo'lsa, darhol user null qilamiz
          if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message?.includes('timeout')) {
            console.error('Timeout/Network error in checkAuth:', error.message);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setIsLoading(false);
            return;
          }
          // Agar access token eskirgan bo'lsa, refresh token bilan yangilashga harakat qilamiz
          if (refreshToken && error.response?.status === 401) {
            try {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:63',message:'Attempting refresh',data:{refreshStartTime:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
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
              setUser(null);
            }
          } else {
            // Boshqa xatolik bo'lsa, tokenlarni tozalaymiz
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
          }
        }
      } else {
        // Token yo'q bo'lsa, user null qilamiz
        setUser(null);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:107',message:'Login started',data:{hasEmail:!!email,loginStartTime:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    try {
      // Email bo'sh bo'lsa, undefined yuboramiz
      const response = await apiClient.post('/auth/login', { 
        ...(email && email.trim() !== '' ? { email } : {}),
        password 
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:114',message:'Login succeeded',data:{status:response.status,elapsed:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const { accessToken, refreshToken, user: userData } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
    } catch (error: any) {
      console.error('Login API error:', error);
      // Timeout yoki network xatolik bo'lsa, maxsus xabar qaytaramiz
      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message?.includes('timeout')) {
        throw new Error('Backend serverga ulanib bo\'lmayapti. Iltimos, server ishlayotganini tekshiring.');
      }
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

