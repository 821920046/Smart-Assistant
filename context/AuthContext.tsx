import React, { createContext, useContext, ReactNode } from 'react';

// Simplified Auth Context since Supabase auth is removed
// This ensures components using useAuth don't crash, but user is always null.

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
  // Always return null user/session
  const user = null;
  const session = null;
  const loading = false;
  const error = null;

  const login = async () => {
    console.warn('Auth functionality has been removed.');
    return Promise.resolve();
  };

  const register = async () => {
    console.warn('Auth functionality has been removed.');
    return Promise.resolve();
  };

  const logout = () => {
    // No-op
  };

  const clearError = () => {
    // No-op
  };

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
