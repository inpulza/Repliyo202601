import React, { createContext, useCallback, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { isTerminalSessionResponse } from '@/lib/sessionRecovery';
import {
  apiFetch,
  registerDashboardSessionEndHandler,
} from '@/lib/authenticatedApiClient';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  brandId: string | null;
  profileImageUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const redirectStartedRef = useRef(false);

  const endDashboardSession = useCallback(() => {
    setUser(null);
    if (redirectStartedRef.current) return;

    redirectStartedRef.current = true;
    window.location.replace('/login');
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      window.location.replace('/');
    } catch (error) {
      console.error('Logout failed:', error);
      setUser(null);
      window.location.replace('/');
    }
  };

  const refreshAuth = async () => {
    await checkAuth();
  };

  const fetchWithAuth = async (url: string, options?: RequestInit): Promise<Response> => {
    const res = await apiFetch(url, {
      ...options,
      credentials: 'include',
    });

    if (await isTerminalSessionResponse(res)) {
      endDashboardSession();
      throw new Error('Session expired');
    }

    return res;
  };

  useEffect(() => {
    return registerDashboardSessionEndHandler(endDashboardSession);
  }, [endDashboardSession]);

  useEffect(() => {
    checkAuth();

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkAuth();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        logout,
        refreshAuth,
        fetchWithAuth,
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
