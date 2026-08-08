import client from './client';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data.data);
export const register = (payload) => client.post('/auth/register', payload).then((r) => r.data.data);
export const fetchMe = () => client.get('/auth/me').then((r) => r.data.data);
export const listUsers = () => client.get('/auth/users').then((r) => r.data.data);
export const createUser = (payload) => client.post('/auth/users', payload).then((r) => r.data.data);
export const deactivateUser = (id) => client.patch(`/auth/users/${id}/deactivate`).then((r) => r.data.data);
