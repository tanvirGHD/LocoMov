import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, me, getUserReviews } from '../controllers/authController.js';
import {
  acceptBid,
  acceptTask,
  bulkDeleteTasks,
  cancelTask,
  createBid,
  createTask,
  createTaskReview,
  dashboard,
  deleteTask,
  getTask,
  listBids,
  listTasks,
  nearbyTasks,
  openDispute,
  resolveDispute,
  verifyDeliveryOtp,
  verifyPickupOtp,
  updateDeliveryStatus,
} from '../controllers/taskController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  adminBulkDeleteTasks,
  adminDeleteConversation,
  adminDeleteMessage,
  adminDeleteTask,
  adminListMessages,
  adminUpdateTask,
  deleteReport,
  deleteReview,
  deleteUser,
  listAuditLogs,
  listConversations,
  listReports,
  listReviews,
  listUsers,
  setRunnerVerification,
  setUserStatus,
  updateReport,
} from '../controllers/adminController.js';
import {
  deleteConversationMessage,
  getConversationAuditLog,
  getConversationByJob,
  getConversationMessages,
  getConversationUnreadSummary,
  listNotifications,
  loadMyConversations,
  markAllNotificationsRead,
  markNotificationRead,
  markConversationSeen,
  reportConversation,
  sendConversationMessage,
  toggleConversationModeration,
  upload,
} from '../controllers/chatController.js';

const router = Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
});
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Rate limit reached. Please try again shortly.' },
});

router.post('/auth/register', authLimiter, wrap(register));
router.post('/auth/login', authLimiter, wrap(login));
router.post('/auth/logout', logout);
router.get('/auth/me', requireAuth, wrap(me));

router.use(requireAuth);
router.get('/dashboard', wrap(dashboard));
router.get('/admin/users', requireRole('admin'), wrap(listUsers));
router.patch('/admin/users/:userId/status', requireRole('admin'), actionLimiter, wrap(setUserStatus));
router.patch('/admin/users/:userId/verification', requireRole('admin'), actionLimiter, wrap(setRunnerVerification));
router.delete('/admin/users/:userId', requireRole('admin'), actionLimiter, wrap(deleteUser));
router.patch('/admin/tasks/:taskId', requireRole('admin'), actionLimiter, wrap(adminUpdateTask));
router.delete('/admin/tasks/:taskId', requireRole('admin'), actionLimiter, wrap(adminDeleteTask));
router.post('/admin/tasks/bulk-delete', requireRole('admin'), actionLimiter, wrap(adminBulkDeleteTasks));
router.get('/admin/reviews', requireRole('admin'), wrap(listReviews));
router.delete('/admin/reviews/:reviewId', requireRole('admin'), actionLimiter, wrap(deleteReview));
router.get('/admin/conversations', requireRole('admin'), wrap(listConversations));
router.get('/admin/conversations/:id/messages', requireRole('admin'), wrap(adminListMessages));
router.delete('/admin/conversations/:id', requireRole('admin'), actionLimiter, wrap(adminDeleteConversation));
router.delete('/admin/messages/:messageId', requireRole('admin'), actionLimiter, wrap(adminDeleteMessage));
router.get('/admin/reports', requireRole('admin'), wrap(listReports));
router.patch('/admin/reports/:reportId', requireRole('admin'), actionLimiter, wrap(updateReport));
router.delete('/admin/reports/:reportId', requireRole('admin'), actionLimiter, wrap(deleteReport));
router.get('/admin/audit', requireRole('admin'), wrap(listAuditLogs));
router.get('/tasks/nearby', requireRole('runner'), wrap(nearbyTasks));
router.get('/tasks', wrap(listTasks));
router.post('/tasks', requireRole('customer'), actionLimiter, wrap(createTask));
router.post('/tasks/bulk-delete', requireRole('customer'), actionLimiter, wrap(bulkDeleteTasks));
router.get('/tasks/:taskId', wrap(getTask));
router.delete('/tasks/:taskId', actionLimiter, wrap(deleteTask));
router.post('/tasks/:taskId/accept', requireRole('runner'), actionLimiter, wrap(acceptTask));
router.post('/tasks/:taskId/bids', requireRole('runner'), actionLimiter, wrap(createBid));
router.get('/tasks/:taskId/bids', wrap(listBids));
router.post('/tasks/:taskId/bids/:bidId/accept', requireRole('customer'), actionLimiter, wrap(acceptBid));
router.post('/tasks/:taskId/pickup-otp', requireRole('runner'), actionLimiter, wrap(verifyPickupOtp));
router.patch('/tasks/:taskId/status', requireRole('runner'), actionLimiter, wrap(updateDeliveryStatus));
router.post('/tasks/:taskId/delivery-otp', requireRole('runner'), actionLimiter, wrap(verifyDeliveryOtp));
router.patch('/tasks/:taskId/cancel', actionLimiter, wrap(cancelTask));
router.post('/tasks/:taskId/cancel', actionLimiter, wrap(cancelTask));
router.post('/tasks/:taskId/review', actionLimiter, wrap(createTaskReview));
router.get('/users/:id/reviews', wrap(getUserReviews));
router.post('/tasks/:taskId/disputes', actionLimiter, wrap(openDispute));
router.post('/tasks/:taskId/disputes/resolve', requireRole('admin'), actionLimiter, wrap(resolveDispute));

router.get('/conversations', requireAuth, wrap(loadMyConversations));
router.get('/conversations/unread', requireAuth, wrap(getConversationUnreadSummary));
router.get('/conversations/job/:taskId', requireAuth, wrap(getConversationByJob));
router.get('/conversations/:id/messages', requireAuth, wrap(getConversationMessages));
router.delete('/conversations/:id/messages/:messageId', requireAuth, actionLimiter, wrap(deleteConversationMessage));
router.get('/conversations/:id/audit', requireAuth, wrap(getConversationAuditLog));
router.post('/conversations/:id/messages', requireAuth, upload.single('image'), wrap(sendConversationMessage));
router.post('/conversations/:id/seen', requireAuth, wrap(markConversationSeen));
router.post('/conversations/:id/report', requireAuth, wrap(reportConversation));
router.post('/conversations/:id/moderate', requireAuth, wrap(toggleConversationModeration));
router.get('/notifications', requireAuth, wrap(listNotifications));
router.post('/notifications/:id/read', requireAuth, wrap(markNotificationRead));
router.post('/notifications/read-all', requireAuth, wrap(markAllNotificationsRead));

export default router;
