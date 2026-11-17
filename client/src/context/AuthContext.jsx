import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await api.me();
    setUser(currentUser);
    return currentUser;
  }, []);
  const login = async (body) => {
    const result = await api.login(body);
    if (result.authenticated) setUser(result.user);
    return result;
  };
  const verifyLogin = async (body) => {
    const result = await api.verifyLogin(body);
    setUser(result.user);
    return result;
  };
  const register = async (body) => {
    const result = await api.register(body);
    if (result.authenticated) setUser(result.user);
    return result;
  };
  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
