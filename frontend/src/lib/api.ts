import axios, { AxiosError } from 'axios';

// Production'da faqat environment variable yoki /api, development'da localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

// Timeout 60s — sekin backend yoki tarmoqda so'rovlar tugashiga vaqt beradi; token faqat 401/refresh muvaffaqiyatsiz bo'lganda tozalanadi
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
  timeout: 60000,
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
    // Timeout — tokenni tozalamaymiz, faqat xato qaytaramiz (foydalanuvchi sahifani yangilashi yoki qayta urinishi mumkin)
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const errorMsg = 'Server javob bermadi (vaqt tugadi). Iltimos, sahifani yangilang yoki keyinroq qayta urinib ko\'ring.';
      console.error('Timeout Error:', errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    // Tarmoq xatosi — tokenni tozalamaymiz (vaqtincha tarmoq uzilishi bo‘lishi mumkin)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      const errorMsg = 'Serverga ulanib bo\'lmadi. Internetingiz va serverni tekshiring, sahifani yangilang yoki keyinroq qayta urinib ko\'ring.';
      console.error('Network Error:', errorMsg);
      return Promise.reject(new Error(errorMsg));
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

