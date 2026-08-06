import axios from 'axios';

// Backend mounts every feature router under /api (see backend/src/server.js), so we
// append it here once instead of repeating it in every feature's API module.
const baseURL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

const client = axios.create({ baseURL });

export default client;
