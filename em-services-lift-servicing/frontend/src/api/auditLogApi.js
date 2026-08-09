import client from './client';

export const fetchAuditLog = (params = {}) => client.get('/audit-log', { params }).then((r) => r.data.data);
