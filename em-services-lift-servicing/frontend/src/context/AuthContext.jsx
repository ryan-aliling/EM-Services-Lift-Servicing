import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { TOKEN_STORAGE_KEY } from '../api/client';
import * as authApi from '../api/authApi';

const AuthContext = createContext({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

// Real login flow, replacing the old hardcoded dev user. `user` is null until a valid
// token is confirmed (or there simply isn't one), `isLoading` covers that initial check so
// AuthGate.jsx can show a spinner instead of flashing the login page for a returning user.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Always re-fetch the profile rather than decoding the JWT client-side - this is a
    // fresh server-side lookup (see GET /api/auth/me), so a since-deactivated account is
    // caught immediately instead of trusting a stale decoded payload for up to 8h.
    authApi
      .fetchMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email, password) => {
    const { token, user: loggedInUser } = await authApi.login(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setUser(loggedInUser);
  };

  // No server call needed - plain JWT with no revocation list, per this app's "keep it
  // simple" auth design (8h flat expiry, no refresh token).
  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
