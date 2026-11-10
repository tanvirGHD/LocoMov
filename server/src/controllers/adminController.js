import { z } from 'zod';
import AuditLog from '../models/AuditLog.js';
import Bid from '../models/Bid.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

function parsedOrRespond(schema, body, res) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message || 'Please provide valid information.' });
    return null;
  }
  return parsed.data;
}

async function writeAudit(actorId, action, targetType, targetId, metadata = {}) {
  if (!targetId) return;
  await AuditLog.create({
    actor: actorId,
    action,
    targetType,
    targetId,
    metadata,
  });
}

export async function listUsers(req, res) {
  const users = await User.find()
    .select('name email phone role avatarUrl area age emergencyContact trustScore runnerLimit isActive verificationStatus avgRating reviewCount createdAt')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  return res.json({ users: users.map((user) => ({
    ...user,
    isActive: user.isActive !== false,
    verificationStatus: user.verificationStatus || 'approved',
  })) });
}

export async function setUserStatus(req, res) {
  const parsed = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Please provide a valid account status.' });

  const user = await User.findOneAndUpdate(
    { _id: req.params.userId, role: { $in: ['customer', 'runner'] } },
    { $set: { isActive: parsed.data.isActive } },
    { new: true, runValidators: true, select: 'name email role isActive verificationStatus' },
  );
  if (!user) return res.status(404).json({ message: 'The customer or runner account could not be found.' });
  await writeAudit(req.user._id, parsed.data.isActive ? 'user.reactivate' : 'user.suspend', 'user', user._id, { isActive: parsed.data.isActive });
  return res.json({ user });
}

export async function setRunnerVerification(req, res) {
  const data = parsedOrRespond(z.object({
    verificationStatus: z.enum(['pending', 'approved', 'rejected']),
  }), req.body, res);
  if (!data) return;

  const user = await User.findOneAndUpdate(
    { _id: req.params.userId, role: 'runner' },
    { $set: { verificationStatus: data.verificationStatus } },
    { new: true, select: 'name email role isActive verificationStatus' },
  );
  if (!user) return res.status(404).json({ message: 'Runner account not found.' });
  await writeAudit(req.user._id, `user.verify.${data.verificationStatus}`, 'user', user._id, data);
  return res.json({ user });
}

export async function deleteUser(req, res) {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (user.role === 'admin') return res.status(403).json({ message: 'Admin accounts cannot be deleted from here.' });
  if (String(user._id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot delete your own account.' });

  await Task.updateMany(
    { $or: [{ customerId: user._id }, { runnerId: user._id }], status: { $in: ['pending', 'accepted', 'picked-up', 'in-transit', 'arriving'] } },
    { $set: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'Account deleted by admin', cancelledBy: req.user._id } },
  );
  await User.deleteOne({ _id: user._id });
  await writeAudit(req.user._id, 'user.delete', 'user', user._id, { email: user.email, role: user.role });
  return res.json({ success: true, userId: user._id });
}

const taskEditSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  estimatedPrice: z.coerce.number().int().min(1).max(500000).optional(),
  pickupAddress: z.string().trim().min(3).max(240).optional(),
  deliveryAddress: z.string().trim().min(3).max(240).optional(),
  status: z.enum(['pending', 'accepted', 'picked-up', 'in-transit', 'arriving', 'completed', 'cancelled']).optional(),
});

export async function adminUpdateTask(req, res) {
  const data = parsedOrRespond(taskEditSchema, req.body, res);
  if (!data) return;
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  Object.assign(task, data);
  await task.save();
  await writeAudit(req.user._id, 'task.update', 'task', task._id, data);
  return res.json({ task });
}

async function hardDeleteTaskById(taskId, actorId) {
  const task = await Task.findById(taskId);
  if (!task) return false;
  const conversation = await Conversation.findOne({ job: task._id });
  if (conversation) {
    await Message.deleteMany({ conversation: conversation._id });
    await Conversation.deleteOne({ _id: conversation._id });
  }
  await Bid.deleteMany({ taskId: task._id });
  await Review.deleteMany({ task: task._id });
  await Task.deleteOne({ _id: task._id });
  await writeAudit(actorId, 'task.delete', 'task', task._id, { title: task.title });
  return true;
}

export async function adminDeleteTask(req, res) {
  const deleted = await hardDeleteTaskById(req.params.taskId, req.user._id);
  if (!deleted) return res.status(404).json({ message: 'Task not found.' });
  return res.json({ success: true, taskId: req.params.taskId });
}

export async function adminBulkDeleteTasks(req, res) {
  const data = parsedOrRespond(z.object({
    taskIds: z.array(z.string().min(1)).min(1).max(100),
  }), req.body, res);
  if (!data) return;
  let deleted = 0;
  for (const taskId of data.taskIds) {
    if (await hardDeleteTaskById(taskId, req.user._id)) deleted += 1;
  }
  return res.json({ success: true, deleted });
}

export async function listReviews(req, res) {
  const reviews = await Review.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('reviewer', 'name role')
    .populate('reviewee', 'name role avgRating reviewCount')
    .populate('task', 'title status')
    .lean();
  return res.json({ reviews });
}

export async function deleteReview(req, res) {
  const review = await Review.findById(req.params.reviewId);
  if (!review) return res.status(404).json({ message: 'Review not found.' });
  await Review.deleteOne({ _id: review._id });

  const stats = await Review.aggregate([
    { $match: { reviewee: review.reviewee } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avgRating = stats[0] ? Math.round(stats[0].avgRating * 10) / 10 : 5;
  const reviewCount = stats[0] ? stats[0].count : 0;
  await User.updateOne({ _id: review.reviewee }, { $set: { avgRating, reviewCount } });
  if (review.task) {
    await Task.updateOne({ _id: review.task, customerId: review.reviewer }, { $set: { customerRating: null, customerReviewComment: '' } });
  }
  await writeAudit(req.user._id, 'review.delete', 'review', review._id, { task: review.task, rating: review.rating });
  return res.json({ success: true, reviewId: review._id });
}

export async function listConversations(req, res) {
  const conversations = await Conversation.find()
    .sort({ lastMessageAt: -1 })
    .limit(200)
    .populate('participants', 'name role')
    .populate('job', 'title status')
    .lean();
  return res.json({ conversations });
}

export async function adminListMessages(req, res) {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
  const messages = await Message.find({ conversation: conversation._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('sender', 'name role')
    .lean();
  return res.json({ messages: messages.reverse() });
}

export async function adminDeleteConversation(req, res) {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
  await Message.deleteMany({ conversation: conversation._id });
  await Conversation.deleteOne({ _id: conversation._id });
  await writeAudit(req.user._id, 'conversation.delete', 'conversation', conversation._id, { job: conversation.job });
  return res.json({ success: true, conversationId: conversation._id });
}

export async function adminDeleteMessage(req, res) {
  const message = await Message.findById(req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  await Message.deleteOne({ _id: message._id });
  const io = req.app.get('io');
  if (io) io.to(`conversation:${message.conversation}`).emit('message:deleted', { messageId: String(message._id) });
  await writeAudit(req.user._id, 'message.delete', 'message', message._id, { conversation: message.conversation });
  return res.json({ success: true, messageId: message._id });
}

export async function listReports(req, res) {
  const reports = await Report.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('reporter', 'name role')
    .populate('conversation')
    .lean();
  return res.json({ reports });
}

export async function updateReport(req, res) {
  const data = parsedOrRespond(z.object({
    status: z.enum(['open', 'reviewed']),
  }), req.body, res);
  if (!data) return;
  const report = await Report.findByIdAndUpdate(req.params.reportId, { $set: { status: data.status } }, { new: true });
  if (!report) return res.status(404).json({ message: 'Report not found.' });
  await writeAudit(req.user._id, 'report.update', 'report', report._id, data);
  return res.json({ report });
}

export async function deleteReport(req, res) {
  const report = await Report.findById(req.params.reportId);
  if (!report) return res.status(404).json({ message: 'Report not found.' });
  await Report.deleteOne({ _id: report._id });
  await writeAudit(req.user._id, 'report.delete', 'report', report._id, {});
  return res.json({ success: true, reportId: report._id });
}

export async function listAuditLogs(req, res) {
  const logs = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('actor', 'name role email')
    .lean();
  return res.json({ logs });
}
