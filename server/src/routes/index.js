import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, me } from '../controllers/authController.js';
import {
  acceptBid,
  acceptTask,
  cancelTask,
  createBid,
  createTask,
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
import { listUsers, setUserStatus } from '../controllers/adminController.js';

const router = Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'অনেকবার চেষ্টা হয়েছে, ১৫ মিনিট পরে আবার চেষ্টা করুন' },
});
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'অনুরোধের সীমা পেরিয়ে গেছে, একটু পরে চেষ্টা করুন' },
});

router.post('/auth/register', authLimiter, wrap(register));
router.post('/auth/login', authLimiter, wrap(login));
router.post('/auth/logout', logout);
router.get('/auth/me', requireAuth, wrap(me));

router.use(requireAuth);
router.get('/dashboard', wrap(dashboard));
router.get('/admin/users', requireRole('admin'), wrap(listUsers));
router.patch('/admin/users/:userId/status', requireRole('admin'), actionLimiter, wrap(setUserStatus));
router.get('/tasks/nearby', requireRole('runner'), wrap(nearbyTasks));
router.get('/tasks', wrap(listTasks));
router.post('/tasks', requireRole('customer'), actionLimiter, wrap(createTask));
router.get('/tasks/:taskId', wrap(getTask));
router.delete('/tasks/:taskId', requireRole('customer'), actionLimiter, wrap(deleteTask));
router.post('/tasks/:taskId/accept', requireRole('runner'), actionLimiter, wrap(acceptTask));
router.post('/tasks/:taskId/bids', requireRole('runner'), actionLimiter, wrap(createBid));
router.get('/tasks/:taskId/bids', wrap(listBids));
router.post('/tasks/:taskId/bids/:bidId/accept', requireRole('customer'), actionLimiter, wrap(acceptBid));
router.post('/tasks/:taskId/pickup-otp', requireRole('runner'), actionLimiter, wrap(verifyPickupOtp));
router.patch('/tasks/:taskId/status', requireRole('runner'), actionLimiter, wrap(updateDeliveryStatus));
router.post('/tasks/:taskId/delivery-otp', requireRole('runner'), actionLimiter, wrap(verifyDeliveryOtp));
router.post('/tasks/:taskId/cancel', actionLimiter, wrap(cancelTask));
router.post('/tasks/:taskId/disputes', actionLimiter, wrap(openDispute));
router.post('/tasks/:taskId/disputes/resolve', requireRole('admin'), actionLimiter, wrap(resolveDispute));

export default router;
