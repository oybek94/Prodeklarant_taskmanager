import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface ClientUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

interface ClientAuthContextType {
  client: ClientUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const ClientAuthProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<ClientUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if client is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('clientAccessToken');
      
      if (accessToken) {
        try {
          // Verify token by getting dashboard data
          const response = await axios.get(`${API_BASE_URL}/client/dashboard`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          
          if (response.data.client) {
            setClient(response.data.client);
          }
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem('clientAccessToken');
          localStorage.removeItem('clientRefreshToken');
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/client/login`, {
        email,
        password,
      });
      
      const { accessToken, refreshToken, client: clientData } = response.data;
      
      localStorage.setItem('clientAccessToken', accessToken);
      localStorage.setItem('clientRefreshToken', refreshToken);
      setClient(clientData);
    } catch (error: any) {
      console.error('Client login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('clientAccessToken');
    localStorage.removeItem('clientRefreshToken');
    setClient(null);
  };

  return (
    <ClientAuthContext.Provider
      value={{
        client,
        login,
        logout,
        isLoading,
        isAuthenticated: !!client,
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};

