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

// Template-based draft note generator (see the matching backend controller
// for why this isn't a live AI call) — takes the in-progress form fields and
// returns a starting-point notes string for staff to edit/approve.
export const generateDraftNotes = (payload) =>
  client.post('/scheduling/draft-notes', payload).then((r) => r.data.data);
