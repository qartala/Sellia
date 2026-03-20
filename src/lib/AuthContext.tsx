import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

interface User {
  id: number;
  email: string;
  name: string;
  company: string;
  role: string;
  timezone?: string;
  language?: string;
  has_dashboard?: number | boolean;
  has_chats?: number | boolean;
  has_flows?: number | boolean;
  has_ads?: number | boolean;
  has_integrations?: number | boolean;
  has_settings?: number | boolean;
  plan?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; company: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Check if user has a valid token on mount
    if (api.isAuthenticated()) {
      api.getMe()
        .then((userData) => {
          if (mounted) setUser(userData);
        })
        .catch((err) => {
          console.error("Autenticación fallida al cargar el perfil:", err);
          // Nos aseguramos de no limpiar el token en errores de red (e.g. abortos por HMR)
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else {
      if (mounted) setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.login({ email, password });
    setUser(result.user);
  };

  const register = async (data: { email: string; password: string; name: string; company: string }) => {
    const result = await api.register(data);
    setUser(result.user);
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
