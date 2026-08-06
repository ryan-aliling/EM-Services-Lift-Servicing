import client from './client';

// NOTE: backend/src/routes/rectifications isn't mounted in server.js yet (still a TODO
// there), so these calls will 404 until that module is built. Shaped to match the lifts API
// so it drops in once the real routes land.
export const fetchRectifications = (params = {}) =>
  client.get('/rectifications', { params }).then((r) => r.data.data);
export const fetchRectification = (id) => client.get(`/rectifications/${id}`).then((r) => r.data.data);
export const createRectification = (payload) => client.post('/rectifications', payload).then((r) => r.data.data);
export const updateRectification = (id, payload) =>
  client.put(`/rectifications/${id}`, payload).then((r) => r.data.data);
export const deleteRectification = (id) => client.delete(`/rectifications/${id}`).then((r) => r.data.data);
