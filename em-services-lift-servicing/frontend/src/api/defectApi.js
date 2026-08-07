import client from './client';

// NOTE: backend/src/routes/defects isn't mounted in server.js yet (still a TODO there), so
// these calls will 404 until that module is built. Shaped to match the lifts API so it drops
// in once the real routes land.
export const fetchDefects = (params = {}) => client.get('/defects', { params }).then((r) => r.data.data);
export const fetchDefect = (id) => client.get(`/defects/${id}`).then((r) => r.data.data);
export const createDefect = (payload) => client.post('/defects', payload).then((r) => r.data.data);
export const updateDefect = (id, payload) => client.put(`/defects/${id}`, payload).then((r) => r.data.data);
export const deleteDefect = (id) => client.delete(`/defects/${id}`).then((r) => r.data.data);
