import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { z } from 'zod';
import Conversation from '../models/Conversation.js';
import ConversationAuditLog from '../models/ConversationAuditLog.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Report from '../models/Report.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return callback(new Error('Only JPG, PNG, and WebP images are allowed.'));
    }
    callback(null, true);
  },
});

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function toPlainUser(user) {
  return {
    _id: String(user._id),
    name: user.name,
    role: user.role,
    email: user.email,
  };
}

export const SAFETY_WARNING = 'For your safety, keep calls and payments inside LocoMuv';

export function detectSafetyIssue(value = '') {
  const text = String(value || '').trim();
  if (!text) {
    return { flagged: false, warning: SAFETY_WARNING, reason: 'none' };
  }

  const normalized = text.toLowerCase().replace(/\s+/g, ' ');
  const phonePattern = /(?:\+?88)?01[3-9]\d{8}|(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}/;
  const paymentPattern = /(bkash|nagad|rocket|roket|cash out|send money|transfer money|payment request|pay now|payment link|send payment|bank payment|bKash|Nagad)/i;
  const flagged = phonePattern.test(normalized) || paymentPattern.test(normalized);

  return {
    flagged,
    warning: flagged ? SAFETY_WARNING : '',
    reason: flagged ? (phonePattern.test(normalized) ? 'phone_number' : 'payment_request') : 'none',
  };
}

export async function createNotification({ userId, kind = 'system', title, message, conversationId = null, taskId = null, link = '' }) {
  if (!userId) return null;
  return Notification.create({
    user: userId,
    kind,
    title,
    message,
    conversation: conversationId,
    task: taskId,
    link,
  });
}

function getJobAccess(task, userId, role) {
  if (role === 'admin') return true;
  if (!task) return false;
  const customer = String(task.customerId) === String(userId);
  const runner = String(task.runnerId) === String(userId);
  return customer || runner;
}

export function getStatusNotificationTargets(task, actorUserId = null) {
  if (!task) return [];
  const ids = [task.customerId, task.runnerId].map((id) => String(id)).filter(Boolean);
  if (!actorUserId) return ids;
  return ids.filter((id) => id !== String(actorUserId));
}

export async function ensureConversationForTask(taskId) {
  const task = await Task.findById(taskId).lean();
  if (!task) return null;
  if (!task.runnerId || !task.customerId) return null;
  let conversation = await Conversation.findOne({ job: task._id });
  if (!conversation) {
    conversation = await Conversation.create({
      job: task._id,
      participants: [task.customerId, task.runnerId],
      lastMessage: 'Conversation started',
      lastMessageAt: new Date(),
      unreadCount: {
        [String(task.customerId)]: 0,
        [String(task.runnerId)]: 0,
      },
      status: ['completed', 'cancelled'].includes(task.status) ? 'read_only' : 'active',
    });
  }
  return conversation;
}

export async function addSystemMessage(taskId, content) {
  const conversation = await ensureConversationForTask(taskId);
  if (!conversation) return null;
  const message = await Message.create({
    conversation: conversation._id,
    sender: null,
    type: 'system',
    text: content,
    status: 'sent',
    createdAt: new Date(),
  });
  await Conversation.updateOne({ _id: conversation._id }, {
    $set: {
      lastMessage: content,
      lastMessageAt: new Date(),
      status: ['completed', 'cancelled'].includes((await Task.findById(taskId).lean())?.status || '') ? 'read_only' : conversation.status,
    },
  });
  return message;
}

function readOnlyForTask(task) {
  if (!task) return false;
  const completed = task.completedAt ? new Date(task.completedAt).getTime() : null;
  const cancelled = task.cancelledAt ? new Date(task.cancelledAt).getTime() : null;
  if (task.status === 'completed' && completed) {
    return Date.now() - completed > 48 * 60 * 60 * 1000;
  }
  if (task.status === 'cancelled' && cancelled) {
    return true; // Cancelled tasks make the chat read-only
  }
  return false;
}

export async function loadMyConversations(req, res) {
  const conversations = await Conversation.find({ participants: req.user._id })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name role')
    .populate('job', 'title status customerId runnerId completedAt cancelledAt');

  const payload = await Promise.all(conversations.map(async (conversation) => {
    const otherUser = conversation.participants.find((participant) => String(participant._id) !== String(req.user._id));
    const lastMessage = await Message.findOne({ conversation: conversation._id }).sort({ createdAt: -1 }).lean();
    const unreadCount = Number(conversation.unreadCount?.get?.(String(req.user._id)) || 0);
    const job = conversation.job;
    return {
      _id: conversation._id,
      job: {
        _id: job?._id,
        title: job?.title || 'Job',
        status: job?.status || 'active',
      },
      otherUser: otherUser ? { _id: otherUser._id, name: otherUser.name, role: otherUser.role } : null,
      lastMessage: lastMessage ? {
        _id: lastMessage._id,
        clientId: lastMessage.clientId,
        type: lastMessage.type,
        text: lastMessage.text,
        imageUrl: lastMessage.imageUrl,
        sender: lastMessage.sender,
        createdAt: lastMessage.createdAt,
      } : null,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount,
      status: conversation.status,
      readOnly: readOnlyForTask(job),
    };
  }));

  return res.json({ conversations: payload });
}

export async function getConversationMessages(req, res) {
  const conversation = await Conversation.findById(req.params.id).populate('job', 'title status customerId runnerId completedAt cancelledAt disputeStatus');
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });

  const hasOpenIssue = conversation.job?.disputeStatus === 'open';
  const hasReport = await Report.exists({ conversation: conversation._id });

  if (req.user.role === 'admin' && (hasOpenIssue || hasReport)) {
    await ConversationAuditLog.create({
      conversation: conversation._id,
      task: conversation.job?._id || null,
      viewer: req.user._id,
      action: 'view',
      reason: hasOpenIssue ? 'dispute_open' : 'report_exists',
    });
  }

  const hasAccess = getJobAccess(conversation.job, req.user._id, req.user.role);
  if (!hasAccess && req.user.role !== 'admin') return res.status(403).json({ message: 'You are not allowed to access this conversation.' });
  if (req.user.role !== 'admin' && (hasOpenIssue || hasReport)) {
    return res.status(403).json({ message: 'This conversation is under admin review.' });
  }

  const cursor = req.query.cursor ? new Date(req.query.cursor) : null;
  const filter = { conversation: conversation._id };
  if (cursor && !Number.isNaN(cursor.getTime())) {
    filter.createdAt = { $lt: cursor };
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('sender', 'name role')
    .lean();

  messages.reverse();
  const adjusted = messages.map((message) => ({
    _id: message._id,
    clientId: message.clientId || null,
    conversation: message.conversation,
    sender: message.sender ? { _id: message.sender._id, name: message.sender.name, role: message.sender.role } : null,
    type: message.type,
    text: message.text,
    imageUrl: message.imageUrl,
    status: message.status,
    createdAt: message.createdAt,
  }));

  return res.json({
    conversation: {
      _id: conversation._id,
      jobId: conversation.job?._id,
      jobTitle: conversation.job?.title || 'Job',
      readOnly: readOnlyForTask(conversation.job),
      status: conversation.status,
      participants: conversation.participants,
      mutedUsers: conversation.mutedUsers || [],
      blockedUsers: conversation.blockedUsers || [],
    },
    messages: adjusted,
    hasMore: adjusted.length === 30,
  });
}

export async function sendConversationMessage(req, res) {
  const conversation = await Conversation.findById(req.params.id).populate('job', 'title status customerId runnerId completedAt cancelledAt');
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
  if (!getJobAccess(conversation.job, req.user._id, req.user.role)) {
    return res.status(403).json({ message: 'You are not allowed to send in this conversation.' });
  }
  if (readOnlyForTask(conversation.job)) {
    return res.status(409).json({ message: 'This conversation is read-only.' });
  }

  const otherUser = conversation.participants.find((participant) => String(participant) !== String(req.user._id));
  if (conversation.blockedUsers?.some((userId) => String(userId) === String(req.user._id))) {
    return res.status(403).json({ message: 'You are blocked in this conversation.' });
  }
  if (conversation.blockedUsers?.some((userId) => String(userId) === String(otherUser))) {
    return res.status(403).json({ message: 'This user is blocked in this conversation.' });
  }
  if (conversation.mutedUsers?.some((userId) => String(userId) === String(otherUser))) {
    return res.status(403).json({ message: 'This user is muted in this conversation.' });
  }

  const textInput = req.body?.text ?? '';
  const allowedText = z.string().trim().max(3000).optional().default('');
  const payload = { text: allowedText.parse(textInput) };
  const clientId = String(req.body?.clientId || '').trim() || null;
  const hasFile = Boolean(req.file);

  if (!hasFile && !payload.text) {
    return res.status(400).json({ message: 'Please type a message or attach an image.' });
  }

  const safeText = escapeHtml(payload.text).trim();
  const safety = detectSafetyIssue(safeText);

  if (clientId) {
    const existing = await Message.findOne({ conversation: conversation._id, clientId, sender: req.user._id }).lean();
    if (existing) {
      const existingPayload = {
        ...existing,
        sender: { _id: req.user._id, name: req.user.name, role: req.user.role },
      };
      return res.status(200).json({
        message: existingPayload,
        safetyWarning: safety.flagged ? safety.warning : '',
      });
    }
  }

  let message;
  let relativeUrl = '';

  if (hasFile) {
    const extension = path.extname(req.file.originalname || '.png').toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
    const filePath = path.join(uploadRoot, filename);
    fs.writeFileSync(filePath, req.file.buffer);
    relativeUrl = `/uploads/${filename}`;
    message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      clientId,
      type: 'image',
      imageUrl: relativeUrl,
      text: 'Uploaded an image',
      status: 'sent',
    });

    await Conversation.updateOne({ _id: conversation._id }, {
      $set: {
        lastMessage: 'Image',
        lastMessageAt: new Date(),
      },
      $inc: { [`unreadCount.${String(otherUser)}`]: 1 },
    });
  } else {
    message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      clientId,
      type: 'text',
      text: safeText,
      status: 'sent',
    });

    await Conversation.updateOne({ _id: conversation._id }, {
      $set: {
        lastMessage: safeText,
        lastMessageAt: new Date(),
      },
      $inc: { [`unreadCount.${String(otherUser)}`]: 1 },
    });
  }

  if (otherUser) {
    await createNotification({
      userId: otherUser,
      kind: 'message',
      title: 'New message',
      message: hasFile
        ? `${req.user.name || 'A participant'} sent a new image in ${conversation.job?.title || 'your job'}.`
        : `${req.user.name || 'A participant'} sent: ${safeText.slice(0, 120)}`,
      conversationId: conversation._id,
      taskId: conversation.job?._id || null,
      link: '/dashboard',
    });
  }

  if (safety.flagged) {
    const adminUsers = await User.find({ role: 'admin' }).lean();
    for (const admin of adminUsers) {
      await createNotification({
        userId: admin._id,
        kind: 'safety_flag',
        title: 'Safety alert',
        message: `Flagged text in ${conversation.job?.title || 'job'}: ${safeText.slice(0, 180)}`,
        conversationId: conversation._id,
        taskId: conversation.job?._id || null,
        link: '/dashboard',
      });
    }
  }

  const messagePayload = {
    ...message.toObject(),
    clientId: clientId || message.clientId,
    imageUrl: relativeUrl || message.imageUrl || '',
    sender: { _id: req.user._id, name: req.user.name, role: req.user.role },
  };

  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${conversation._id}`).except(`user:${String(req.user._id)}`).emit('message:new', { message: messagePayload });
  }

  return res.status(201).json({
    message: messagePayload,
    safetyWarning: safety.flagged ? safety.warning : '',
  });
}

export async function deleteConversationMessage(req, res) {
  const message = await Message.findById(req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  const conversation = await Conversation.findById(message.conversation);
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
  if (String(message.sender) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You can only delete your own messages.' });
  }
  await Message.deleteOne({ _id: message._id });
  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${conversation._id}`).emit('message:deleted', { messageId: String(message._id) });
  }
  return res.json({ success: true, messageId: message._id });
}

export async function markConversationSeen(req, res) {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
  if (!conversation.participants.some((participant) => String(participant) === String(req.user._id))) {
    return res.status(403).json({ message: 'You are not allowed to access this conversation.' });
  }

  await Message.updateMany({
    conversation: conversation._id,
    sender: { $ne: req.user._id },
    status: { $ne: 'seen' },
  }, { $set: { status: 'seen' } });

  await Conversation.updateOne({ _id: conversation._id }, {
    $set: { [`unreadCount.${String(req.user._id)}`]: 0 },
  });

  return res.json({ success: true });
}

export async function reportConversation(req, res) {
  const parsed = z.object({ reason: z.string().trim().min(5).max(1000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Please provide a valid report reason.' });

  const conversation = await Conversation.findById(req.params.id).populate('job', 'title disputeStatus');
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });

  const hasAccess = conversation.participants.some((participant) => String(participant) === String(req.user._id));
  if (!hasAccess && req.user.role !== 'admin') return res.status(403).json({ message: 'You cannot report this conversation.' });

  const report = await Report.create({
    conversation: conversation._id,
    reporter: req.user._id,
    reason: escapeHtml(parsed.data.reason),
  });

  const adminUsers = await User.find({ role: 'admin' }).lean();
  for (const admin of adminUsers) {
    await createNotification({
      userId: admin._id,
      kind: 'dispute',
      title: 'Conversation report',
      message: `A report was filed for ${conversation.job?.title || 'this job'}: ${escapeHtml(parsed.data.reason).slice(0, 180)}`,
      conversationId: conversation._id,
      taskId: conversation.job?._id || null,
      link: '/dashboard',
    });
  }

  return res.status(201).json({ report });
}

export async function getConversationByJob(req, res) {
  const task = await Task.findById(req.params.taskId).lean();
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  if (!getJobAccess(task, req.user._id, req.user.role)) return res.status(403).json({ message: 'You cannot see this task conversation.' });
  const conversation = await ensureConversationForTask(task._id);
  if (!conversation) return res.status(404).json({ message: 'No active conversation found for that job yet.' });
  return res.json({ conversation });
}

export async function seedSystemMessageForJob(task, text, actorUserId = null) {
  if (!task?.runnerId || !task?.customerId) return null;
  const conversation = await ensureConversationForTask(task._id);
  if (!conversation) return null;
  const message = await Message.create({
    conversation: conversation._id,
    sender: null,
    type: 'system',
    text,
    status: 'sent',
  });
  await Conversation.updateOne({ _id: conversation._id }, {
    $set: {
      lastMessage: text,
      lastMessageAt: new Date(),
    },
  });

  const recipients = getStatusNotificationTargets(task, actorUserId);
  for (const userId of recipients) {
    await createNotification({
      userId,
      kind: 'status',
      title: 'Job update',
      message: `${text} — ${task.title || 'job update'}`,
      conversationId: conversation._id,
      taskId: task._id,
      link: '/dashboard',
    });
  }

  return message;
}

export async function getConversationUnreadSummary(req, res) {
  const conversations = await Conversation.find({ participants: req.user._id }).lean();
  const total = conversations.reduce((sum, item) => sum + Number(item.unreadCount?.[String(req.user._id)] || 0), 0);
  return res.json({ unreadCount: total });
}

export async function listNotifications(req, res) {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(25).lean();
  return res.json({ notifications });
}

export async function markNotificationRead(req, res) {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  notification.readAt = new Date();
  await notification.save();
  return res.json({ success: true, notification });
}

export async function markAllNotificationsRead(req, res) {
  await Notification.updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  return res.json({ success: true });
}

export async function getConversationAuditLog(req, res) {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });

  const hasAccess = req.user.role === 'admin' || conversation.participants.some((participant) => String(participant) === String(req.user._id));
  if (!hasAccess) return res.status(403).json({ message: 'You are not allowed to access this audit log.' });

  const logs = await ConversationAuditLog.find({ conversation: conversation._id }).sort({ createdAt: -1 }).populate('viewer', 'name role').lean();
  return res.json({ logs });
}

export async function toggleConversationModeration(req, res) {
  const parsed = z.object({
    action: z.enum(['mute', 'block']),
    enabled: z.boolean(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Please provide valid moderation settings.' });

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });

  const isParticipant = conversation.participants.some((participant) => String(participant) === String(req.user._id));
  if (!isParticipant) return res.status(403).json({ message: 'You are not allowed to moderate this conversation.' });

  const targetUserId = conversation.participants.find((participant) => String(participant) !== String(req.user._id));
  const targetKey = parsed.data.action === 'mute' ? 'mutedUsers' : 'blockedUsers';
  const current = new Set((conversation[targetKey] || []).map((id) => String(id)));

  if (parsed.data.enabled) {
    current.add(String(targetUserId));
  } else {
    current.delete(String(targetUserId));
  }

  await Conversation.updateOne({ _id: conversation._id }, { $set: { [targetKey]: Array.from(current).map((id) => id) } });
  return res.json({ success: true, action: parsed.data.action, enabled: parsed.data.enabled, targetUserId: targetUserId ? String(targetUserId) : null });
}

export async function syncConversationForTask(task) {
  if (!task || !task.customerId || !task.runnerId) return null;
  const conversation = await ensureConversationForTask(task._id);
  if (!conversation) return null;
  const readOnly = ['completed', 'cancelled'].includes(task.status) && readOnlyForTask(task);
  await Conversation.updateOne({ _id: conversation._id }, { $set: { status: readOnly ? 'read_only' : 'active' } });
  return conversation;
}

export function registerSocketChatHandlers(io) {
  io.on('connection', async (socket) => {
    const userId = socket.userId;
    const user = await User.findById(userId).lean();
    if (!user) {
      socket.disconnect();
      return;
    }

    socket.join(`user:${String(userId)}`);
    io.emit('presence', { userId: String(userId), status: 'online' });

    socket.on('join:conversation', async ({ conversationId }) => {
      if (!conversationId) return;
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some((id) => String(id) === String(userId))) {
        return socket.emit('conversation:error', { message: 'You are not allowed to join this conversation.' });
      }
      socket.join(`conversation:${conversationId}`);
      socket.emit('conversation:joined', { conversationId });
    });

    socket.on('typing:start', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:start', { userId: String(userId), conversationId });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId: String(userId), conversationId });
    });

    socket.on('disconnect', () => {
      io.emit('presence', { userId: String(userId), status: 'offline' });
    });
  });
}
