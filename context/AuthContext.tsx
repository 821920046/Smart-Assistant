import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { syncService } from '../services/sync.js';

interface User {
  id: string;
  email: string;
  aud: string;
  role: string;
}

interface AuthState {
  user: User | null;
  session: { access_token: string; refresh_token: string; } | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ access_token: string; refresh_token: string; } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session from local storage or URL hash on mount
  useEffect(() => {
    // Check for hash parameters (Supabase Auth redirect)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      
      if (access_token && refresh_token) {
        const newSession = { access_token, refresh_token };
        setSession(newSession);
        localStorage.setItem('sb-session', JSON.stringify(newSession));
        
        // Clear hash to clean up URL
        window.history.replaceState(null, '', window.location.pathname);
        
        fetchUser(access_token);
        return;
      }
    }

    const savedSession = localStorage.getItem('sb-session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
        // Simple decode to get user info (or fetch user)
        // For now, let's try to fetch user with the token
        fetchUser(parsed.access_token);
      } catch (e) {
        localStorage.removeItem('sb-session');
      }
    }
  }, []);

  const getSupabaseConfig = () => {
    const config = syncService.getConfig();
    if (config.provider !== 'supabase' || !config.settings.supabaseUrl || !config.settings.supabaseKey) {
      throw new Error('Supabase is not configured. Please configure it in Sync Settings.');
    }
    return {
      url: config.settings.supabaseUrl.replace(/\/$/, ''),
      key: config.settings.supabaseKey
    };
  };

  const fetchUser = async (token: string) => {
    try {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/auth/v1/user`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        // Token invalid
        logout();
      }
    } catch (e) {
      console.error('Failed to fetch user', e);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password: pass })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error_description || data.msg || 'Login failed');
      }

      const newSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token
      };
      setSession(newSession);
      setUser(data.user);
      localStorage.setItem('sb-session', JSON.stringify(newSession));
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password: pass })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || data.error_description || 'Registration failed');
      }

      // Auto login if session is returned (depends on Supabase config "Enable Email Confirmations")
      if (data.access_token) {
        const newSession = {
          access_token: data.access_token,
          refresh_token: data.refresh_token
        };
        setSession(newSession);
        setUser(data.user);
        localStorage.setItem('sb-session', JSON.stringify(newSession));
      } else {
        // Likely needs email confirmation
        throw new Error('Registration successful. Please check your email to confirm.');
      }
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setSession(null);
    localStorage.removeItem('sb-session');
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, session, loading, error, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
