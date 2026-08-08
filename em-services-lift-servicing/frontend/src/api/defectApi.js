import client from './client';

export const fetchDefects = (params = {}) => client.get('/defects', { params }).then((r) => r.data.data);
export const fetchDefectStats = () => client.get('/defects/stats').then((r) => r.data.data);
export const fetchDefect = (id) => client.get(`/defects/${id}`).then((r) => r.data.data);
export const createDefect = (payload) => client.post('/defects', payload).then((r) => r.data.data);
export const updateDefect = (id, payload) => client.put(`/defects/${id}`, payload).then((r) => r.data.data);
export const deleteDefect = (id) => client.delete(`/defects/${id}`).then((r) => r.data.data);