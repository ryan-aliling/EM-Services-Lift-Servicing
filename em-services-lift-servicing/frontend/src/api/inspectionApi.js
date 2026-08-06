import client from './client';

// NOTE: backend/src/routes/inspections isn't mounted in server.js yet (still a TODO there),
// so these calls will 404 until that module is built. Shaped to match the lifts API so it
// drops in once the real routes land.
export const fetchInspections = (params = {}) => client.get('/inspections', { params }).then((r) => r.data.data);
export const fetchInspection = (id) => client.get(`/inspections/${id}`).then((r) => r.data.data);
export const createInspection = (payload) => client.post('/inspections', payload).then((r) => r.data.data);
export const updateInspection = (id, payload) => client.put(`/inspections/${id}`, payload).then((r) => r.data.data);
export const deleteInspection = (id) => client.delete(`/inspections/${id}`).then((r) => r.data.data);
