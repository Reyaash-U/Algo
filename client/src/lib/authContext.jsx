import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api/apiClient.js';
import { setAccessToken, setOnTokenRefreshed } from '../api/httpClient.js';

// Auth state lives here: `user` (DTO from the contract) + loading/booted flags.
// The access token itself lives in httpClient's module scope (memory only,
// never localStorage) — this context just mirrors "do we have a session".

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false); // true once initial refresh attempt finishes

  // If the silent-refresh interceptor gets a new token (or loses one), keep
  // React state in sync so ProtectedRoute reacts correctly.
  useEffect(() => {
    setOnTokenRefreshed((token) => {
      if (!token) setUser(null);
    });
  }, []);

  // On app boot, try a silent refresh so a returning user with a valid
  // httpOnly cookie doesn't have to log in again.
  useEffect(() => {
    (async () => {
      try {
        const { user, accessToken } = await api.auth.refresh();
        setAccessToken(accessToken);
        setUser(user);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const { user, accessToken } = await api.auth.login({ email, password });
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    const { user, accessToken } = await api.auth.register({ email, password, displayName });
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = { user, booted, isAuthenticated: !!user, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
