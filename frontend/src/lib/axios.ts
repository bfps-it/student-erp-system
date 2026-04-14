import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// BFPS ERP Ecosystem - Axios Client Configuration
// Handles automatic JWT bearing and interception

type FailedQueueItem = {
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
};

// Singleton Axios Instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Enable if using httpOnly cookies for refresh token
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request Interceptor: Attach Token theoretically stored in Memory or HttpOnly Cookie
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // In actual implementation, we might grab the access token from an in-memory store
    // Ensure we don't overwrite if manually set
    // const token = memoryStore.getAccessToken();
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Handle 401s and Errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to hit the refresh endpoint
        const refreshResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        
        // Setup new token in memory here
        // memoryStore.setAccessToken(newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Dispatch event to context to force logout
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('unauthorized'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Standardize error message formatting for shadcn Toasts
    if (error.response?.data && (error.response.data as any).error) {
      error.message = (error.response.data as any).error.message;
    }
    
    return Promise.reject(error);
  }
);

export default api;
