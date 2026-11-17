import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, logout, me, getUserReviews, updateProfile } from '../controllers/authController.js';
import { login as beginLogin, verifyLoginCode, registerCodes, forgotPassword, resetPassword, sendAccountChangeCode, completeAccountChange, updatePassword } from '../controllers/authSecurityController.js';
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
  listPublicTasks,
  nearbyTasks,
  openDispute,
  resolveDispute,
  verifyDeliveryOtp,
  verifyPickupOtp,
  updateDeliveryStatus,
} from '../controllers/taskController.js';
import { requireAuth, requireRole, requireApprovedRunner } from '../middleware/auth.js';
import { requireAdminPermission, enforceAdminPermissionWhenAdmin, auditAdminAction } from '../middleware/admin.js';
import { handleAvatarUpload } from '../middleware/upload.js';
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
  createSubAdmin,
  listSubAdmins,
  deleteSubAdmin,
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

const codeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Code request limit reached. Try again later.' } });
const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many code attempts. Try again later.' } });
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many attempts. Try again later.' } });
router.post('/auth/register/codes', codeLimiter, wrap(registerCodes));
router.get('/auth/config', (_req, res) => res.json({ turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '' }));
router.post('/auth/register', authLimiter, handleAvatarUpload, wrap(register));
router.post('/auth/login', codeLimiter, authLimiter, wrap(beginLogin));
router.post('/auth/login/verify', verifyLimiter, wrap(verifyLoginCode));
router.post('/auth/forgot-password', forgotLimiter, wrap(forgotPassword));
router.post('/auth/reset-password', verifyLimiter, wrap(resetPassword));
router.post('/auth/logout', logout);
router.get('/auth/me', requireAuth, wrap(me));

router.get('/tasks/public', wrap(listPublicTasks));
router.use(requireAuth);
router.get('/dashboard', wrap(dashboard));
router.post('/auth/account/change-code', codeLimiter, wrap(sendAccountChangeCode));
router.post('/auth/account/change-code/verify', verifyLimiter, wrap(completeAccountChange));
router.patch('/auth/account/password', actionLimiter, wrap(updatePassword));
router.patch('/auth/account/profile', requireAuth, actionLimiter, handleAvatarUpload, wrap(updateProfile));
router.use('/admin', auditAdminAction);
router.get('/admin/users', requireAdminPermission('users'), wrap(listUsers));
router.patch('/admin/users/:userId/status', requireAdminPermission('users'), actionLimiter, wrap(setUserStatus));
router.patch('/admin/users/:userId/verification', requireAdminPermission('runner_approval'), actionLimiter, wrap(setRunnerVerification));
router.delete('/admin/users/:userId', requireAdminPermission('users'), actionLimiter, wrap(deleteUser));
router.get('/admin/sub-admins', requireAdminPermission('users'), wrap(listSubAdmins));
router.post('/admin/sub-admins', requireAdminPermission('users'), actionLimiter, wrap(createSubAdmin));
router.delete('/admin/sub-admins/:userId', requireAdminPermission('users'), actionLimiter, wrap(deleteSubAdmin));
router.patch('/admin/tasks/:taskId', requireAdminPermission('tasks'), actionLimiter, wrap(adminUpdateTask));
router.delete('/admin/tasks/:taskId', requireAdminPermission('tasks'), actionLimiter, wrap(adminDeleteTask));
router.post('/admin/tasks/bulk-delete', requireAdminPermission('tasks'), actionLimiter, wrap(adminBulkDeleteTasks));
router.get('/admin/reviews', requireAdminPermission('tasks'), wrap(listReviews));
router.delete('/admin/reviews/:reviewId', requireAdminPermission('tasks'), actionLimiter, wrap(deleteReview));
router.get('/admin/conversations', requireAdminPermission('reports'), wrap(listConversations));
router.get('/admin/conversations/:id/messages', requireAdminPermission('reports'), wrap(adminListMessages));
router.delete('/admin/conversations/:id', requireAdminPermission('reports'), actionLimiter, wrap(adminDeleteConversation));
router.delete('/admin/messages/:messageId', requireAdminPermission('reports'), actionLimiter, wrap(adminDeleteMessage));
router.get('/admin/reports', requireAdminPermission('reports'), wrap(listReports));
router.patch('/admin/reports/:reportId', requireAdminPermission('reports'), actionLimiter, wrap(updateReport));
router.delete('/admin/reports/:reportId', requireAdminPermission('reports'), actionLimiter, wrap(deleteReport));
router.get('/admin/audit', requireAdminPermission('reports'), wrap(listAuditLogs));
router.get('/tasks/nearby', requireRole('runner'), requireApprovedRunner, wrap(nearbyTasks));
router.get('/tasks', auditAdminAction, enforceAdminPermissionWhenAdmin('tasks'), wrap(listTasks));
router.post('/tasks', requireRole('customer'), actionLimiter, wrap(createTask));
router.post('/tasks/bulk-delete', requireRole('customer'), actionLimiter, wrap(bulkDeleteTasks));
router.get('/tasks/:taskId', auditAdminAction, enforceAdminPermissionWhenAdmin('tasks'), wrap(getTask));
router.delete('/tasks/:taskId', auditAdminAction, enforceAdminPermissionWhenAdmin('tasks'), actionLimiter, wrap(deleteTask));
router.post('/tasks/:taskId/accept', requireRole('runner'), requireApprovedRunner, actionLimiter, wrap(acceptTask));
router.post('/tasks/:taskId/bids', requireRole('runner'), requireApprovedRunner, actionLimiter, wrap(createBid));
router.get('/tasks/:taskId/bids', auditAdminAction, enforceAdminPermissionWhenAdmin('tasks'), wrap(listBids));
router.post('/tasks/:taskId/bids/:bidId/accept', requireRole('customer'), actionLimiter, wrap(acceptBid));
router.post('/tasks/:taskId/pickup-otp', requireRole('runner'), requireApprovedRunner, actionLimiter, wrap(verifyPickupOtp));
router.patch('/tasks/:taskId/status', requireRole('runner'), requireApprovedRunner, actionLimiter, wrap(updateDeliveryStatus));
router.post('/tasks/:taskId/delivery-otp', requireRole('runner'), requireApprovedRunner, actionLimiter, wrap(verifyDeliveryOtp));
router.patch('/tasks/:taskId/cancel', auditAdminAction, enforceAdminPermissionWhenAdmin('tasks'), actionLimiter, wrap(cancelTask));
router.post('/tasks/:taskId/cancel', auditAdminAction, enforceAdminPermissionWhenAdmin('tasks'), actionLimiter, wrap(cancelTask));
router.post('/tasks/:taskId/review', actionLimiter, wrap(createTaskReview));
router.get('/users/:id/reviews', wrap(getUserReviews));
router.post('/tasks/:taskId/disputes', actionLimiter, wrap(openDispute));
router.post('/tasks/:taskId/disputes/resolve', auditAdminAction, requireAdminPermission('tasks'), actionLimiter, wrap(resolveDispute));

const reportAdminPermission = enforceAdminPermissionWhenAdmin('reports');
router.get('/conversations', requireAuth, reportAdminPermission, wrap(loadMyConversations));
router.get('/conversations/unread', requireAuth, reportAdminPermission, wrap(getConversationUnreadSummary));
router.get('/conversations/job/:taskId', requireAuth, reportAdminPermission, wrap(getConversationByJob));
router.get('/conversations/:id/messages', requireAuth, reportAdminPermission, wrap(getConversationMessages));
router.delete('/conversations/:id/messages/:messageId', requireAuth, reportAdminPermission, actionLimiter, wrap(deleteConversationMessage));
router.get('/conversations/:id/audit', requireAuth, reportAdminPermission, wrap(getConversationAuditLog));
router.post('/conversations/:id/messages', requireAuth, auditAdminAction, reportAdminPermission, upload.single('image'), wrap(sendConversationMessage));
router.post('/conversations/:id/seen', requireAuth, auditAdminAction, reportAdminPermission, wrap(markConversationSeen));
router.post('/conversations/:id/report', requireAuth, auditAdminAction, reportAdminPermission, wrap(reportConversation));
router.post('/conversations/:id/moderate', requireAuth, auditAdminAction, requireAdminPermission('reports'), wrap(toggleConversationModeration));
router.get('/notifications', requireAuth, wrap(listNotifications));
router.post('/notifications/:id/read', requireAuth, wrap(markNotificationRead));
router.post('/notifications/read-all', requireAuth, wrap(markAllNotificationsRead));

export default router;
