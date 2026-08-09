import client from './client';

// Scheduling is now live (backend/src/routes/scheduling, mounted in server.js).
// Shaped to match the Lifts API's { success, message, data } envelope
// (backend/src/utils/apiResponse.js) so both feature modules read the same way.
export const fetchSchedules = (params = {}) => client.get('/scheduling', { params }).then((r) => r.data.data);
export const fetchSchedule = (id) => client.get(`/scheduling/${id}`).then((r) => r.data.data);
export const createSchedule = (payload) => client.post('/scheduling', payload).then((r) => r.data.data);
export const updateSchedule = (id, payload) => client.put(`/scheduling/${id}`, payload).then((r) => r.data.data);
export const deleteSchedule = (id) => client.delete(`/scheduling/${id}`).then((r) => r.data.data);
export const importSchedules = (rows) => client.post('/scheduling/import', { rows }).then((r) => r.data.data);
