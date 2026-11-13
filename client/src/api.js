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
  if (!response.ok) throw new Error(data.message || 'The request could not be completed.');
  return data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  register: (body) => {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      return request('/auth/register', { method: 'POST', body });
    }
    return request('/auth/register', json('POST', body));
  },
  login: (body) => request('/auth/login', json('POST', body)),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  dashboard: () => request('/dashboard'),
  tasks: () => request('/tasks'),
  publicTasks: () => request('/tasks/public'),
  nearby: (latitude, longitude) => request(`/tasks/nearby?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}&radiusKm=25`),
  createTask: (body) => request('/tasks', json('POST', body)),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  bulkDeleteTasks: (data) => request('/tasks/bulk-delete', json('POST', data)),
  acceptTask: (id, location) => request(`/tasks/${id}/accept`, json('POST', location || {})),
  bids: (id) => request(`/tasks/${id}/bids`),
  createBid: (id, body, location) => request(`/tasks/${id}/bids`, json('POST', { ...body, ...(location || {}) })),
  acceptBid: (taskId, bidId) => request(`/tasks/${taskId}/bids/${bidId}/accept`, json('POST', {})),
  verifyPickup: (id, otp) => request(`/tasks/${id}/pickup-otp`, json('POST', { otp })),
  verifyDelivery: (id, otp) => request(`/tasks/${id}/delivery-otp`, json('POST', { otp })),
  updateDeliveryStatus: (id, status) => request(`/tasks/${id}/status`, json('PATCH', { status })),
  cancelTask: (id, reason) => request(`/tasks/${id}/cancel`, json('PATCH', { reason })),
  submitReview: (id, data) => request(`/tasks/${id}/review`, json('POST', data)),
  userReviews: (userId) => request(`/users/${userId}/reviews`),
  reportDispute: (id, reason) => request(`/tasks/${id}/disputes`, json('POST', { reason })),
  resolveDispute: (id, resolution, fault) => request(`/tasks/${id}/disputes/resolve`, json('POST', { resolution, fault })),
  adminUsers: () => request('/admin/users'),
  setUserStatus: (id, isActive) => request(`/admin/users/${id}/status`, json('PATCH', { isActive })),
  setRunnerVerification: (id, verificationStatus) => request(`/admin/users/${id}/verification`, json('PATCH', { verificationStatus })),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminUpdateTask: (id, data) => request(`/admin/tasks/${id}`, json('PATCH', data)),
  adminDeleteTask: (id) => request(`/admin/tasks/${id}`, { method: 'DELETE' }),
  adminBulkDeleteTasks: (taskIds) => request('/admin/tasks/bulk-delete', json('POST', { taskIds })),
  adminReviews: () => request('/admin/reviews'),
  adminDeleteReview: (id) => request(`/admin/reviews/${id}`, { method: 'DELETE' }),
  adminConversations: () => request('/admin/conversations'),
  adminConversationMessages: (id) => request(`/admin/conversations/${id}/messages`),
  adminDeleteConversation: (id) => request(`/admin/conversations/${id}`, { method: 'DELETE' }),
  adminDeleteMessage: (id) => request(`/admin/messages/${id}`, { method: 'DELETE' }),
  adminReports: () => request('/admin/reports'),
  adminUpdateReport: (id, status) => request(`/admin/reports/${id}`, json('PATCH', { status })),
  adminDeleteReport: (id) => request(`/admin/reports/${id}`, { method: 'DELETE' }),
  adminAudit: () => request('/admin/audit'),
  conversations: () => request('/conversations'),
  conversationByTask: (taskId) => request(`/conversations/job/${taskId}`),
  conversationMessages: (conversationId, cursor) => request(`/conversations/${conversationId}/messages${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  sendMessage: (conversationId, payload) => {
    if (payload instanceof FormData) {
      return request(`/conversations/${conversationId}/messages`, { method: 'POST', body: payload });
    }
    return request(`/conversations/${conversationId}/messages`, json('POST', payload));
  },
  deleteMessage: (conversationId, messageId) => request(`/conversations/${conversationId}/messages/${messageId}`, { method: 'DELETE' }),
  markSeen: (conversationId) => request(`/conversations/${conversationId}/seen`, json('POST', {})),
  reportConversation: (conversationId, reason) => request(`/conversations/${conversationId}/report`, json('POST', { reason })),
  moderateConversation: (conversationId, action, enabled) => request(`/conversations/${conversationId}/moderate`, json('POST', { action, enabled })),
  conversationAudit: (conversationId) => request(`/conversations/${conversationId}/audit`),
  notifications: () => request('/notifications'),
  markNotificationRead: (notificationId) => request(`/notifications/${notificationId}/read`, json('POST', {})),
  markAllNotificationsRead: () => request('/notifications/read-all', json('POST', {})),
};
