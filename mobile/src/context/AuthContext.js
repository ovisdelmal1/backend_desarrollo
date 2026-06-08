import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, clearTokens } from '../services/api';
import { getProfile, logout } from '../services/loteApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registerDraft, setRegisterDraft] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const profile = await getProfile();
          setUser(profile);
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      registerDraft,
      setRegisterDraft,
      signOut: async () => {
        try {
          await logout();
        } catch (error) {
          console.warn('[AuthContext] logout error:', error);
          // Continuamos limpiando local aunque el servidor falle
        } finally {
          setUser(null);
          setRegisterDraft({});
        }
      },
    }),
    [user, loading, registerDraft]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
