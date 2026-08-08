import axios from 'axios';

// Backend mounts every feature router under /api (see backend/src/server.js), so we
// append it here once instead of repeating it in every feature's API module.
const baseURL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

const client = axios.create({ baseURL });

// Same localStorage key AuthContext.jsx reads/writes - kept as one literal here since this
// is the only other file that needs it, to attach the token to every outgoing request.
export const TOKEN_STORAGE_KEY = 'emservices_token';

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On a 401 (missing/expired/invalid token, or the account was deactivated - see
// requireAuth in backend/src/middleware/auth.js), clear the stale token and hard-reload so
// AuthContext reinitializes clean into the login page. No pub/sub needed for this app's
// size - the tradeoff is any unsaved in-page state is lost on a forced logout.
// Excludes /auth/login itself - a wrong-password 401 there is a normal form error the
// LoginPage needs to display, not a session expiry to react to.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.location.assign('/');
    }
    return Promise.reject(err);
  }
);

export default client;
