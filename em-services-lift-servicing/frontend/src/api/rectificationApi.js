import client from './client';

export const fetchRectifications = (params = {}) =>
  client.get('/rectifications', { params }).then((r) => r.data.data);
export const fetchRectification = (id) => client.get(`/rectifications/${id}`).then((r) => r.data.data);
export const createRectification = (payload) => client.post('/rectifications', payload).then((r) => r.data.data);
export const updateRectification = (id, payload) =>
  client.put(`/rectifications/${id}`, payload).then((r) => r.data.data);
export const endorseRectification = (id, endorsedBy) =>
  client.patch(`/rectifications/${id}/endorse`, { endorsedBy }).then((r) => r.data.data);
export const deleteRectification = (id) => client.delete(`/rectifications/${id}`).then((r) => r.data.data);
