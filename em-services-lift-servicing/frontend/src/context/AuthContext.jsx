import { createContext, useContext } from 'react';

// TODO: replace with real auth once a login system exists and the backend issues JWTs with
// a `role` claim (backend/src/routes/lifts/liftRoutes.js has a matching TODO to re-add
// requireAuth/requireRole once this lands). Until then, every user in dev is treated as an
// Admin so the write-access UI (Add/Edit/Delete) can be built and tested.
const AuthContext = createContext({ user: { name: 'Dev User', role: 'Admin' } });

export function AuthProvider({ children }) {
  const value = { user: { name: 'Dev User', role: 'Admin' } };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
