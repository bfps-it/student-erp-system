'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/axios';
import { useRouter } from 'next/navigation';

export interface User {
  id: number;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginToken: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  // Load state on mount
  useEffect(() => {
    // Check if there is an active session
    const loadSession = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data?.success) {
          setUser(response.data.data.user);
        }
      } catch (error) {
        // Token might be missing or expired
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    // Listen for global unauthorized events triggering logout
    const handleUnauthorized = () => logout(false);
    window.addEventListener('unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, []);

  // Update Axios interceptor memory reference
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    });

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, [accessToken]);

  const loginToken = (token: string, userData: User) => {
    setAccessToken(token);
    setUser(userData);
  };

  const logout = async (callApi = true) => {
    try {
      if (callApi) {
        await api.post('/auth/logout');
      }
    } catch {
      // Ignore errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
