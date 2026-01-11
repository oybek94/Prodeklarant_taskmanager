import axios, { AxiosError } from 'axios';

// Production'da faqat environment variable yoki /api, development'da localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // For now, we'll use localStorage for refresh token
  timeout: 30000, // 30 seconds timeout (remote database uchun oshirildi)
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors
});

// Request interceptor: Add access token to headers
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 and refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    // Timeout error handling
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const errorMsg = 'Backend serverga javob bermayapti. Iltimos, backend server ishlayotganini tekshiring (http://localhost:3001).';
      console.error('Timeout Error:', errorMsg);
      // Timeout bo'lsa, darhol login sahifasiga yo'naltiramiz (agar login sahifasida bo'lmasak)
      if (window.location.pathname !== '/login' && window.location.pathname !== '/client/login') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Kichik kechikish bilan login sahifasiga yo'naltiramiz (xatolik xabari ko'rsatish uchun)
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
      return Promise.reject(new Error(errorMsg));
    }
    // Network error handling
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('Network Error: Backend serverga ulanib bo\'lmayapti. Iltimos, backend server ishlayotganini tekshiring.');
      // Network xatolik bo'lsa ham, login sahifasiga yo'naltiramiz
      if (window.location.pathname !== '/login' && window.location.pathname !== '/client/login') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
      return Promise.reject(new Error('Backend serverga ulanib bo\'lmayapti. Iltimos, server ishlayotganini tekshiring.'));
    }
    
    const originalRequest = error.config as any;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      // Agar refresh token ham yo'q bo'lsa, darhol login sahifasiga yo'naltiramiz
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Faqat login sahifasida bo'lmasak, login sahifasiga yo'naltiramiz
        if (window.location.pathname !== '/login' && window.location.pathname !== '/client/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        isRefreshing = false;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

