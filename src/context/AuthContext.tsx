'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'patient' | 'caregiver' | 'admin';
  phone?: string;
  avatar?: string;
  profile?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await api('/auth/me');
      const userData = res.data || res.user;
      if (userData) {
        setUser({
          ...userData,
          id: userData.id || userData._id,
        });
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, []);

  // Check if user is already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    localStorage.setItem('token', res.token);
    const userData: User = {
      ...res.user,
      id: res.user.id || res.user._id,
    };
    setUser(userData);
    return userData;
  };

  const register = async (data: RegisterData): Promise<User> => {
    const res = await api('/auth/register', {
      method: 'POST',
      body: data,
    });
    localStorage.setItem('token', res.token);
    const userData: User = {
      ...res.user,
      id: res.user.id || res.user._id,
    };
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
