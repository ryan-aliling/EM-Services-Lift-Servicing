import client from './client';

export const fetchLifts = (params = {}) => client.get('/lifts', { params }).then((r) => r.data.data);
export const fetchLiftStats = () => client.get('/lifts/stats').then((r) => r.data.data);
export const fetchLift = (id) => client.get(`/lifts/${id}`).then((r) => r.data.data);
export const createLift = (payload) => client.post('/lifts', payload).then((r) => r.data.data);
export const updateLift = (id, payload) => client.put(`/lifts/${id}`, payload).then((r) => r.data.data);
export const deleteLift = (id) => client.delete(`/lifts/${id}`).then((r) => r.data.data);
