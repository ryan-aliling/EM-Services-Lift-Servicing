import client from './client';

// NOTE: backend/src/routes/scheduling isn't mounted in server.js yet (still a TODO there),
// so these calls will 404 until that module is built. Shaped to match the lifts API so it
// drops in once the real routes land.
export const fetchSchedules = (params = {}) => client.get('/scheduling', { params }).then((r) => r.data.data);
export const fetchSchedule = (id) => client.get(`/scheduling/${id}`).then((r) => r.data.data);
export const createSchedule = (payload) => client.post('/scheduling', payload).then((r) => r.data.data);
export const updateSchedule = (id, payload) => client.put(`/scheduling/${id}`, payload).then((r) => r.data.data);
export const deleteSchedule = (id) => client.delete(`/scheduling/${id}`).then((r) => r.data.data);
