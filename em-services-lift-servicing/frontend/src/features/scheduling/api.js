const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function fetchSchedules(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE_URL}/api/scheduling${query ? `?${query}` : ''}`).then(handle);
}

export function createSchedule(payload) {
  return fetch(`${API_BASE_URL}/api/scheduling`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function updateSchedule(id, payload) {
  return fetch(`${API_BASE_URL}/api/scheduling/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function deleteSchedule(id) {
  return fetch(`${API_BASE_URL}/api/scheduling/${id}`, { method: 'DELETE' }).then(handle);
}