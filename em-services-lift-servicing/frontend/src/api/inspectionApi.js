import client from './client';

export const fetchInspections = (params = {}) => client.get('/inspections', { params }).then((r) => r.data.data);
export const fetchInspectionStats = () => client.get('/inspections/stats').then((r) => r.data.data);
export const fetchInspection = (id) => client.get(`/inspections/${id}`).then((r) => r.data.data);
export const createInspection = (payload) => client.post('/inspections', payload).then((r) => r.data.data);
export const updateInspection = (id, payload) => client.put(`/inspections/${id}`, payload).then((r) => r.data.data);
export const notifyContractor = (id) => client.patch(`/inspections/${id}/notify-contractor`).then((r) => r.data);
export const deleteInspection = (id) => client.delete(`/inspections/${id}`).then((r) => r.data);
