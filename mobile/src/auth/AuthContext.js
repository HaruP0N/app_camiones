import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setOnUnauthorized, setToken } from '../api';

const TOKEN_KEY = 'inspeccamion_token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      /* sin acceso al almacenamiento seguro */
    }
  }, []);

  // Si la API responde 401 con una sesión activa, se cierra la sesión
  useEffect(() => {
    setOnUnauthorized(() => logout());
  }, [logout]);

  // Restaura la sesión guardada al abrir la app
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          setToken(saved);
          const r = await api.me();
          setUser(r.usuario);
        }
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.login(email, password);
    setToken(r.token);
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, r.token);
    } catch {
      /* la sesión funciona igual, solo no queda guardada */
    }
    setUser(r.usuario);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
