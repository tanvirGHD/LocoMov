async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (!(typeof FormData !== 'undefined' && options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'অনুরোধটি সম্পন্ন করা যায়নি');
  return data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  register: (body) => request('/auth/register', json('POST', body)),
  login: (body) => request('/auth/login', json('POST', body)),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  dashboard: () => request('/dashboard'),
  tasks: () => request('/tasks'),
  nearby: (latitude, longitude) => request(`/tasks/nearby?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}&radiusKm=5`),
  createTask: (body) => request('/tasks', json('POST', body)),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  acceptTask: (id, location) => request(`/tasks/${id}/accept`, json('POST', location)),
  bids: (id) => request(`/tasks/${id}/bids`),
  createBid: (id, body, location) => request(`/tasks/${id}/bids`, json('POST', { ...body, ...location })),
  acceptBid: (taskId, bidId) => request(`/tasks/${taskId}/bids/${bidId}/accept`, json('POST', {})),
  verifyPickup: (id, otp) => request(`/tasks/${id}/pickup-otp`, json('POST', { otp })),
  verifyDelivery: (id, otp) => request(`/tasks/${id}/delivery-otp`, json('POST', { otp })),
  updateDeliveryStatus: (id, status) => request(`/tasks/${id}/status`, json('PATCH', { status })),
  cancelTask: (id, reason) => request(`/tasks/${id}/cancel`, json('POST', { reason })),
  reportDispute: (id, reason) => request(`/tasks/${id}/disputes`, json('POST', { reason })),
  resolveDispute: (id, resolution, fault) => request(`/tasks/${id}/disputes/resolve`, json('POST', { resolution, fault })),
  adminUsers: () => request('/admin/users'),
  setUserStatus: (id, isActive) => request(`/admin/users/${id}/status`, json('PATCH', { isActive })),
};
