import { createContext, useCallback, useEffect, useState } from 'react';
import { authService } from '../features/auth/authService';
import { session } from '../utils/storage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(session.get()));
  const [error, setError] = useState(null);
  const clear = useCallback(() => {
    session.clear();
    setUser(null);
    setError(null);
  }, []);
  const restore = useCallback(async () => {
    if (!session.get()) return;
    setLoading(true);
    setError(null);
    try {
      setUser(await authService.me());
    } catch (failure) {
      if ([401, 403].includes(failure.response?.status)) clear();
      else setError(failure);
    } finally {
      setLoading(false);
    }
  }, [clear]);
  useEffect(() => {
    window.addEventListener('session-expired', clear);
    restore();
    return () => window.removeEventListener('session-expired', clear);
  }, [clear, restore]);
  async function login(credentials) {
    const token = await authService.login(credentials);
    session.set(token.access_token);
    try {
      setUser(await authService.me());
    } catch (failure) {
      clear();
      throw failure;
    }
  }
  async function logout() {
    try { await authService.logout(); } catch { /* The local session still ends. */ }
    finally { clear(); }
  }
  return <AuthContext.Provider value={{ user, setUser, loading, error, restore, clear, login, logout }}>
    {children}
  </AuthContext.Provider>;
}
