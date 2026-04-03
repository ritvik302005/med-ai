import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  demoLogin as demoLoginRequest,
  getCurrentUser,
  normalizeAuthUser,
  signIn as signInRequest,
  signUp as signUpRequest,
  type UserRole,
} from '../services/api';

export interface CustomUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
  avatar?: string;
  theme?: string;
  language?: string;
  role: UserRole;
  token: string;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<CustomUser>;
  signUp: (name: string, email: string, password: string) => Promise<CustomUser>;
  demoLogin: (role: UserRole) => Promise<CustomUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'medai_token';

function persistUser(user: CustomUser) {
  localStorage.setItem(TOKEN_STORAGE_KEY, user.token);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    const restoreUser = async () => {
      try {
        const currentUser = await getCurrentUser(token);
        const normalizedUser = {
          ...normalizeAuthUser(currentUser),
          token,
        };
        setUser(normalizedUser);
        persistUser(normalizedUser);
      } catch (error) {
        console.error('Unable to restore user session:', error);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void restoreUser();
  }, []);

  const completeAuth = (authUser: Awaited<ReturnType<typeof signInRequest>>) => {
    const normalizedUser = normalizeAuthUser(authUser);
    setUser(normalizedUser);
    persistUser(normalizedUser);
    return normalizedUser;
  };

  const signIn = async (email: string, password: string) => {
    const authUser = await signInRequest(email, password);
    return completeAuth(authUser);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const authUser = await signUpRequest(name, email, password);
    return completeAuth(authUser);
  };

  const demoLogin = async (role: UserRole) => {
    const authUser = await demoLoginRequest(role);
    return completeAuth(authUser);
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, demoLogin, logout }}>
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
