import { z } from 'zod';
import Bid from '../models/Bid.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Conversation from '../models/Conversation.js';
import { createNotification, seedSystemMessageForJob, syncConversationForTask } from './chatController.js';
import { createOtp, decryptOtp, encryptOtp, verifyOtp } from '../utils/otp.js';

const pointInput = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().min(3, 'Address must be at least 3 characters long.').max(240),
});

const createTaskSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters long.').max(120),
  description: z.string().trim().min(5, 'Please describe the task in more detail.').max(2000),
  estimatedPrice: z.number().int().min(1).max(500000),
  pickupLocation: pointInput,
  deliveryLocation: pointInput,
});

const bidSchema = z.object({
  proposedPrice: z.number().int().min(1).max(500000),
  deliveryTime: z.number().int().min(1).max(10080),
});

function point({ latitude, longitude }) {
  return { type: 'Point', coordinates: [longitude, latitude] };
}

function publicTask(task, userId) {
  const result = task.toObject ? task.toObject() : { ...task };
  delete result.pickupOTP;
  delete result.deliveryOTP;
  delete result.otpAttempts;
  delete result.otpLockedUntil;

  if (String(result.customerId?._id || result.customerId) === String(userId)) {
    if (task.pickupOTP) {
      try { result.pickupOTP = decryptOtp(task.pickupOTP); } catch (_) { result.pickupOTP = null; }
    }
    if (task.deliveryOTP) {
      try { result.deliveryOTP = decryptOtp(task.deliveryOTP); } catch (_) { result.deliveryOTP = null; }
    }
  }
  return result;
}

function parsedOrRespond(schema, body, res) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message || 'Please provide valid information.' });
    return null;
  }
  return parsed.data;
}

export function buildTaskListFilter(user) {
  if (!user) return {};
  if (user.role === 'admin') return { status: { $ne: 'deleted' } };
  if (user.role === 'customer') {
    return {
      customerId: user._id,
      status: { $ne: 'deleted' },
      hiddenForCustomer: { $ne: true },
    };
  }
  if (user.role === 'runner') {
    return {
      $or: [
        { status: 'pending', customerId: { $ne: user._id } },
        { runnerId: user._id, status: { $nin: ['cancelled', 'deleted'] } },
      ],
    };
  }
  return {};
}

export function filterTasksForMarketplace(tasks, keyword = '') {
  const normalized = String(keyword || '').trim().toLowerCase();
  if (!normalized) return tasks;

  return tasks.filter((task) => {
    const searchable = [
      task.title,
      task.description,
      task.pickupAddress,
      task.deliveryAddress,
      task.customerId?.name,
      task.runnerId?.name,
    ].filter(Boolean).join(' ').toLowerCase();

    return searchable.includes(normalized);
  });
}

async function setTaskAccepted(task, runner, price) {
  const pickupOTP = createOtp();
  const deliveryOTP = createOtp();
  const result = await Task.findOneAndUpdate(
    { _id: task._id, status: 'pending', disputeStatus: 'none' },
    {
      $set: {
        runnerId: runner._id,
        finalPrice: price,
        status: 'accepted',
        pickupOTP: encryptOtp(pickupOTP),
        deliveryOTP: encryptOtp(deliveryOTP),
        acceptedAt: new Date(),
      },
    },
    { new: true, runValidators: true },
  );
  if (result) {
    await syncConversationForTask(result);
    await seedSystemMessageForJob(result, 'Runner accepted the job', runner._id);
  }
  return result;
}

export async function createTask(req, res) {
  const data = parsedOrRespond(createTaskSchema, req.body, res);
  if (!data) return;
  const task = await Task.create({
    customerId: req.user._id,
    title: data.title,
    description: data.description,
    estimatedPrice: data.estimatedPrice,
    pickupLocation: point(data.pickupLocation),
    deliveryLocation: point(data.deliveryLocation),
    pickupAddress: data.pickupLocation.address,
    deliveryAddress: data.deliveryLocation.address,
  });
  return res.status(201).json(publicTask(task, req.user._id));
}

export async function listTasks(req, res) {
  const filter = buildTaskListFilter(req.user);
  if (req.user.role === 'admin') {
    const status = String(req.query.status || '').trim();
    if (status && ['pending', 'accepted', 'picked-up', 'in-transit', 'arriving', 'completed', 'cancelled', 'deleted'].includes(status)) {
      filter.status = status;
    }
  }

  let taskQuery = Task.find(filter);
  if (req.user.role === 'customer') taskQuery = taskQuery.select('+pickupOTP +deliveryOTP');
  const tasks = await taskQuery
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('customerId', 'name')
    .populate('runnerId', 'name trustScore avgRating reviewCount');

  const list = tasks.map((task) => publicTask(task, req.user._id));
  if (req.user.role !== 'runner') {
    return res.json({ tasks: list });
  }

  const keyword = String(req.query.q || req.query.keyword || '').trim();
  const location = String(req.query.location || '').trim();
  const queries = [keyword, location].filter(Boolean);
  const filtered = queries.length === 0 ? list : list.filter((task) => {
    const haystack = [
      task.title,
      task.description,
      task.pickupAddress,
      task.deliveryAddress,
      task.customerId?.name,
    ].filter(Boolean).join(' ').toLowerCase();
    return queries.every((query) => haystack.includes(query.toLowerCase()));
  });

  return res.json({ tasks: filtered });
}

export async function nearbyTasks(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Math.min(100, Math.max(3, Number(req.query.radiusKm) || 25));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ message: 'Please share a valid location.' });
  }

  const query = {
    status: 'pending',
    customerId: { $ne: req.user._id },
    pickupLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  };
  if (req.user.runnerLimit) {
    query.estimatedPrice = { $lte: req.user.runnerLimit };
  }

  const tasks = await Task.find(query)
    .limit(100)
    .populate('customerId', 'name');
  return res.json({ tasks: tasks.map((task) => publicTask(task, req.user._id)) });
}

export async function getTask(req, res) {
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  const isCustomer = String(task.customerId) === String(req.user._id);
  const isRunner = String(task.runnerId) === String(req.user._id);
  if (!isCustomer && !isRunner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You are not allowed to view this task.' });
  }
  const detailed = isCustomer
    ? await Task.findById(task._id).select('+pickupOTP +deliveryOTP')
    : task;
  return res.json({ task: publicTask(detailed, req.user._id) });
}

export async function deleteTask(req, res) {
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });

  const isCustomer = String(task.customerId) === String(req.user._id);
  if (!isCustomer && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You are not allowed to delete this task.' });
  }

  // Open (no runner yet): customer can delete it permanently from their list
  if (task.status === 'pending' && !task.runnerId) {
    task.status = 'deleted';
    task.deletedAt = new Date();
    await task.save();
    await Bid.deleteMany({ taskId: task._id });
    return res.json({ message: 'Task post deleted successfully.', taskId: task._id });
  }

  // Completed or delivered: customer can delete from own view only (soft delete: hiddenForCustomer)
  if (task.status === 'completed') {
    task.hiddenForCustomer = true;
    await task.save();
    return res.json({ message: 'Completed task removed from your view.', taskId: task._id });
  }

  // Cancelled: customer can remove from own view
  if (task.status === 'cancelled') {
    task.hiddenForCustomer = true;
    await task.save();
    return res.json({ message: 'Cancelled task removed from your view.', taskId: task._id });
  }

  // Accepted or in progress: must be cancelled, not deleted
  return res.status(400).json({ message: 'In-progress tasks cannot be deleted. Please cancel the task instead.' });
}

export async function bulkDeleteTasks(req, res) {
  const { taskIds, deleteAll } = req.body || {};
  const baseFilter = { customerId: req.user._id };
  if (!deleteAll && Array.isArray(taskIds) && taskIds.length > 0) {
    baseFilter._id = { $in: taskIds };
  }

  // Open pending tasks without assigned runner: mark deleted
  const openResult = await Task.updateMany(
    { ...baseFilter, status: 'pending', runnerId: null },
    { $set: { status: 'deleted', deletedAt: new Date() } }
  );

  // Completed or cancelled tasks: hide for customer only
  const hiddenResult = await Task.updateMany(
    { ...baseFilter, status: { $in: ['completed', 'cancelled'] } },
    { $set: { hiddenForCustomer: true } }
  );

  return res.json({
    success: true,
    deletedOpen: openResult.modifiedCount,
    hiddenCompleted: hiddenResult.modifiedCount,
    message: 'Selected tasks deleted/hidden successfully.',
  });
}

export async function acceptTask(req, res) {
  const taskId = req.params.taskId;
  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  if (String(task.customerId) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot accept your own task.' });
  }
  if (task.status !== 'pending') {
    return res.status(409).json({ message: 'This task is no longer available or was already accepted.' });
  }
  if (req.user.verificationStatus && req.user.verificationStatus !== 'approved') {
    return res.status(403).json({ message: 'Your runner account is waiting for admin verification.' });
  }
  if (req.user.runnerLimit && task.estimatedPrice > req.user.runnerLimit) {
    return res.status(403).json({ message: `This task budget (৳${task.estimatedPrice}) exceeds your runner limit (৳${req.user.runnerLimit}).` });
  }

  const lat = Number(req.body.latitude);
  const lng = Number(req.body.longitude);
  if (process.env.NODE_ENV === 'production' && Number.isFinite(lat) && Number.isFinite(lng)) {
    const nearby = await Task.findOne({
      _id: taskId,
      status: 'pending',
      pickupLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 50000,
        },
      },
    });
    if (!nearby) {
      return res.status(409).json({ message: 'This task is outside your active service radius (50 km).' });
    }
  }

  const accepted = await setTaskAccepted(task, req.user, task.estimatedPrice);
  if (!accepted) return res.status(409).json({ message: 'Another runner already accepted this task.' });
  await Bid.updateMany({ taskId: task._id, status: 'pending' }, { $set: { status: 'rejected' } });
  return res.json({ task: publicTask(accepted, req.user._id) });
}

export async function createBid(req, res) {
  const data = parsedOrRespond(bidSchema, req.body, res);
  if (!data) return;

  const task = await Task.findById(req.params.taskId);
  if (!task || task.status !== 'pending' || task.disputeStatus !== 'none') {
    return res.status(404).json({ message: 'Bids are no longer accepted for this task.' });
  }
  if (req.user.verificationStatus && req.user.verificationStatus !== 'approved') {
    return res.status(403).json({ message: 'Your runner account is waiting for admin verification.' });
  }
  if (String(task.customerId) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot bid on your own task.' });
  }
  if (data.proposedPrice > task.estimatedPrice) {
    return res.status(400).json({ message: 'The proposed price cannot exceed the customer budget.' });
  }
  if (req.user.runnerLimit && data.proposedPrice > req.user.runnerLimit) {
    return res.status(403).json({ message: `Your current bid limit is ৳${req.user.runnerLimit}.` });
  }

  try {
    const bid = await Bid.create({
      taskId: task._id,
      runnerId: req.user._id,
      proposedPrice: data.proposedPrice,
      deliveryTime: data.deliveryTime,
    });
    const stillOpen = await Task.exists({ _id: task._id, status: 'pending', disputeStatus: 'none' });
    if (!stillOpen) {
      await Bid.deleteOne({ _id: bid._id });
      return res.status(409).json({ message: 'This task was accepted before your bid was created.' });
    }
    return res.status(201).json({ bid });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You already submitted a bid for this task.' });
    throw error;
  }
}

export async function listBids(req, res) {
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  const isOwner = String(task.customerId) === String(req.user._id);
  const isAssignedRunner = String(task.runnerId) === String(req.user._id);
  const hasSubmittedBid = await Bid.exists({ taskId: task._id, runnerId: req.user._id });
  if (!isOwner && !isAssignedRunner && !hasSubmittedBid && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You are not allowed to view bids for this task.' });
  }
  const filter = isOwner
    ? { taskId: task._id }
    : { taskId: task._id, runnerId: req.user._id };
  const bids = await Bid.find(filter)
    .sort({ createdAt: -1 })
    .populate('runnerId', 'name trustScore avgRating reviewCount');
  return res.json({ bids });
}

export async function acceptBid(req, res) {
  const task = await Task.findOne({ _id: req.params.taskId, customerId: req.user._id, status: 'pending' });
  if (!task) return res.status(404).json({ message: 'Task not found or already assigned.' });
  const bid = await Bid.findOne({ _id: req.params.bidId, taskId: task._id, status: 'pending' }).populate('runnerId');
  if (!bid || !bid.runnerId) return res.status(404).json({ message: 'This bid is no longer available.' });
  if (bid.proposedPrice > bid.runnerId.runnerLimit || bid.proposedPrice > task.estimatedPrice) {
    return res.status(409).json({ message: 'The runner limit is not sufficient for this bid.' });
  }

  const accepted = await setTaskAccepted(task, bid.runnerId, bid.proposedPrice);
  if (!accepted) return res.status(409).json({ message: 'Another bid was accepted before this one.' });
  await Bid.updateMany({ taskId: task._id, _id: { $ne: bid._id }, status: 'pending' }, { $set: { status: 'rejected' } });
  await Bid.updateOne({ _id: bid._id, status: 'pending' }, { $set: { status: 'accepted' } });
  const customerTask = await Task.findById(accepted._id).select('+pickupOTP +deliveryOTP');
  return res.json({ task: publicTask(customerTask, req.user._id) });
}

async function submitOtp(req, res, field, requiredStatus, nextStatus, timestamp) {
  const parsed = z.object({ otp: z.string().regex(/^\d{4}$/, 'Please enter a 4-digit OTP.') }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const task = await Task.findById(req.params.taskId).select(`+${field} +otpAttempts +otpLockedUntil`);
  if (!task || String(task.runnerId) !== String(req.user._id)) {
    return res.status(404).json({ message: 'The assigned task for you could not be found.' });
  }
  if (task.disputeStatus === 'open') return res.status(409).json({ message: 'OTP verification is paused while the dispute is being reviewed.' });
  if (task.status !== requiredStatus) return res.status(409).json({ message: 'OTP verification is not available at this step.' });
  if (!task[field]) return res.status(409).json({ message: 'No OTP is available for this task.' });
  if (task.otpLockedUntil && task.otpLockedUntil > new Date()) {
    return res.status(429).json({ message: 'Too many failed attempts. Please try again in 15 minutes.' });
  }

  if (!verifyOtp(task[field], parsed.data.otp)) {
    const now = new Date();
    const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    const failed = await Task.findOneAndUpdate(
      { _id: task._id, status: requiredStatus, otpLockedUntil: { $not: { $gt: now } } },
      [{
        $set: {
          otpAttempts: {
            $cond: [
              { $gte: [{ $add: [{ $ifNull: ['$otpAttempts', 0] }, 1] }, 5] },
              0,
              { $add: [{ $ifNull: ['$otpAttempts', 0] }, 1] },
            ],
          },
          otpLockedUntil: {
            $cond: [
              { $gte: [{ $add: [{ $ifNull: ['$otpAttempts', 0] }, 1] }, 5] },
              lockUntil,
              null,
            ],
          },
        },
      }],
      { new: true, select: '+otpAttempts +otpLockedUntil' },
    );
    const attempts = failed?.otpLockedUntil > now ? 5 : failed?.otpAttempts ?? 5;
    return res.status(attempts >= 5 ? 429 : 400).json({
      message: attempts >= 5 ? 'Too many failed attempts. Please try again in 15 minutes.' : 'The OTP is incorrect.',
    });
  }

  const updated = await Task.findOneAndUpdate(
    { _id: task._id, runnerId: req.user._id, status: requiredStatus },
    {
      $set: { status: nextStatus, [timestamp]: new Date(), otpAttempts: 0, otpLockedUntil: null },
    },
    { new: true },
  );
  if (!updated) return res.status(409).json({ message: 'কাজটি ইতিমধ্যে পরিবর্তিত হয়েছে' });

  if (nextStatus === 'completed') {
    await User.updateOne({ _id: req.user._id }, [{
      $set: {
        trustScore: { $min: [100, { $add: ['$trustScore', 1] }] },
        runnerLimit: { $min: [500000, { $add: ['$runnerLimit', 500] }] },
      },
    }]);
  }
  await syncConversationForTask(updated);
  if (nextStatus === 'picked-up') {
    await seedSystemMessageForJob(updated, 'Pickup OTP verified', req.user._id);
  }
  if (nextStatus === 'completed') {
    await seedSystemMessageForJob(updated, 'Delivered', req.user._id);
  }
  return res.json({ task: publicTask(updated, req.user._id) });
}

export async function verifyPickupOtp(req, res) {
  return submitOtp(req, res, 'pickupOTP', 'accepted', 'picked-up', 'pickedUpAt');
}

export async function verifyDeliveryOtp(req, res) {
  return submitOtp(req, res, 'deliveryOTP', 'arriving', 'completed', 'completedAt');
}

export async function updateDeliveryStatus(req, res) {
  const parsed = z.object({ status: z.enum(['in-transit', 'arriving']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Please select the next delivery stage correctly.' });

  const transitions = {
    'in-transit': { from: 'picked-up', timestamp: 'departedAt' },
    arriving: { from: 'in-transit', timestamp: 'arrivingAt' },
  };
  const { from, timestamp } = transitions[parsed.data.status];
  const task = await Task.findOneAndUpdate(
    {
      _id: req.params.taskId,
      runnerId: req.user._id,
      status: from,
      disputeStatus: { $ne: 'open' },
    },
    { $set: { status: parsed.data.status, [timestamp]: new Date() } },
    { new: true, runValidators: true },
  );
  if (!task) return res.status(409).json({ message: 'This task is not in that stage or has an open review.' });
  await syncConversationForTask(task);
  if (parsed.data.status === 'in-transit') {
    await seedSystemMessageForJob(task, 'Runner is on the way', req.user._id);
  }
  if (parsed.data.status === 'arriving') {
    await seedSystemMessageForJob(task, 'Runner has arrived near the destination', req.user._id);
  }
  return res.json({ task: publicTask(task, req.user._id) });
}

export async function cancelTask(req, res) {
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });

  const isCustomer = String(task.customerId) === String(req.user._id);
  const isAssignedRunner = String(task.runnerId) === String(req.user._id);
  if (!isCustomer && !isAssignedRunner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You are not allowed to cancel this task.' });
  }

  if (task.status === 'completed') {
    return res.status(409).json({ message: 'Completed tasks cannot be cancelled.' });
  }
  if (task.status === 'cancelled') {
    return res.status(409).json({ message: 'This task is already cancelled.' });
  }
  if (task.status === 'deleted') {
    return res.status(409).json({ message: 'This task was already deleted.' });
  }

  const reason = z.string().trim().max(500).safeParse(req.body.reason || '');
  if (!reason.success) return res.status(400).json({ message: 'Please keep the cancellation reason under 500 characters.' });

  const cancellationText = reason.data || (isCustomer ? 'Cancelled by customer' : 'Cancelled by runner');

  const updated = await Task.findOneAndUpdate(
    { _id: task._id, status: task.status },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: req.user._id,
        cancellationReason: cancellationText,
      },
    },
    { new: true },
  );
  if (!updated) return res.status(409).json({ message: 'The task was changed before this action completed.' });

  if (req.user.role === 'admin') {
    const { default: AuditLog } = await import('../models/AuditLog.js');
    await AuditLog.create({
      actor: req.user._id,
      action: 'task.cancel',
      targetType: 'task',
      targetId: updated._id,
      metadata: { reason: cancellationText },
    });
  }

  await Bid.updateMany({ taskId: task._id, status: 'pending' }, { $set: { status: 'rejected' } });

  if (updated.runnerId) {
    await Conversation.updateOne({ job: updated._id }, { $set: { status: 'read_only' } });
    await syncConversationForTask(updated);
    await seedSystemMessageForJob(updated, `The job was cancelled: ${cancellationText}`, req.user._id);

    const notifyTarget = isCustomer ? updated.runnerId : updated.customerId;
    await createNotification({
      userId: notifyTarget,
      kind: 'status',
      title: 'Task cancelled',
      message: `Task "${updated.title}" was cancelled by ${isCustomer ? 'the customer' : 'the runner'}. Reason: ${cancellationText}`,
      taskId: updated._id,
      link: '/dashboard',
    });

    if (isAssignedRunner) await penalizeRunner(req.user._id, 10, 100);
  }

  return res.json({ task: publicTask(updated, req.user._id), message: 'Task cancelled successfully.' });
}

export async function createTaskReview(req, res) {
  const schema = z.object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional().default(''),
  });
  const data = parsedOrRespond(schema, req.body, res);
  if (!data) return;

  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  if (!['completed', 'delivered'].includes(task.status)) {
    return res.status(400).json({ message: 'Reviews can only be submitted after delivery is completed.' });
  }

  const isCustomer = String(task.customerId) === String(req.user._id);
  if (!isCustomer) {
    return res.status(403).json({ message: 'Only the customer for this job can submit a review.' });
  }

  const revieweeId = task.runnerId;
  if (!revieweeId) {
    return res.status(400).json({ message: 'No runner was assigned to this task.' });
  }

  const existing = await Review.findOne({ task: task._id, reviewer: req.user._id });
  if (existing) {
    return res.status(409).json({ message: 'You have already reviewed this task.' });
  }

  const review = await Review.create({
    task: task._id,
    reviewer: req.user._id,
    reviewee: revieweeId,
    rating: data.rating,
    comment: data.comment,
  });

  task.customerRating = data.rating;
  task.customerReviewComment = data.comment;
  await task.save();

  const stats = await Review.aggregate([
    { $match: { reviewee: revieweeId } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avgRating = stats[0] ? Math.round(stats[0].avgRating * 10) / 10 : data.rating;
  const reviewCount = stats[0] ? stats[0].count : 1;
  await User.updateOne({ _id: revieweeId }, { $set: { avgRating, reviewCount } });

  try {
    await createNotification({
      userId: revieweeId,
      kind: 'review',
      title: 'New review received',
      message: `${req.user.name || 'User'} left a ${data.rating}★ rating for "${task.title}".`,
      taskId: task._id,
      link: '/dashboard',
    });
  } catch (_) {}

  return res.status(201).json({ review, task: publicTask(task, req.user._id), message: 'Thank you for your review!' });
}

export async function openDispute(req, res) {
  const data = parsedOrRespond(z.object({
    reason: z.string().trim().min(10, 'Please provide at least 10 characters for the issue details.').max(1000),
  }), req.body, res);
  if (!data) return;
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  if (![String(task.customerId), String(task.runnerId)].includes(String(req.user._id))) {
    return res.status(403).json({ message: 'Only the customer or runner for this task can raise an issue.' });
  }
  if (!['accepted', 'picked-up', 'in-transit', 'arriving', 'completed'].includes(task.status) || task.disputeStatus === 'open') {
    return res.status(409).json({ message: 'This task is not eligible to report an issue right now.' });
  }
  const updated = await Task.findOneAndUpdate(
    { _id: task._id, disputeStatus: { $ne: 'open' } },
    { $set: { disputeStatus: 'open', disputeReason: data.reason, disputeBy: req.user._id } },
    { new: true },
  );
  if (!updated) return res.status(409).json({ message: 'An issue has already been reported for this task.' });
  return res.json({ task: publicTask(updated, req.user._id) });
}

async function penalizeRunner(runnerId, scorePenalty, limitPenalty) {
  await User.updateOne({ _id: runnerId }, [
    { $set: {
      trustScore: { $max: [0, { $subtract: ['$trustScore', scorePenalty] }] },
      runnerLimit: { $max: [0, { $subtract: ['$runnerLimit', limitPenalty] }] },
    } },
  ]);
}

export async function resolveDispute(req, res) {
  const data = parsedOrRespond(z.object({
    resolution: z.string().trim().min(5).max(1000),
    fault: z.enum(['runner', 'customer', 'none']),
  }), req.body, res);
  if (!data) return;
  const task = await Task.findOne({ _id: req.params.taskId, disputeStatus: 'open' });
  if (!task) return res.status(404).json({ message: 'No open dispute was found.' });
  const updated = await Task.findOneAndUpdate(
    { _id: task._id, disputeStatus: 'open' },
    {
      $set: {
        disputeStatus: 'resolved',
        disputeResolution: data.resolution,
        status: ['accepted', 'picked-up', 'in-transit', 'arriving'].includes(task.status) ? 'cancelled' : task.status,
        cancelledAt: ['accepted', 'picked-up', 'in-transit', 'arriving'].includes(task.status) ? new Date() : task.cancelledAt,
      },
    },
    { new: true },
  );
  if (!updated) return res.status(409).json({ message: 'This dispute was already resolved.' });
  if (data.fault === 'runner' && task.runnerId) await penalizeRunner(task.runnerId, 15, 150);
  return res.json({ task: publicTask(updated, req.user._id) });
}

export async function dashboard(req, res) {
  const taskFilter = req.user.role === 'admin'
    ? { status: { $ne: 'deleted' } }
    : req.user.role === 'customer'
      ? { customerId: req.user._id, status: { $ne: 'deleted' }, hiddenForCustomer: { $ne: true } }
      : { runnerId: req.user._id, status: { $nin: ['cancelled', 'deleted'] } };

  const [total, pending, active, completed, recentTasks] = await Promise.all([
    Task.countDocuments(taskFilter),
    Task.countDocuments({ ...taskFilter, status: 'pending' }),
    Task.countDocuments({ ...taskFilter, status: { $in: ['accepted', 'picked-up', 'in-transit', 'arriving'] } }),
    Task.countDocuments({ ...taskFilter, status: 'completed' }),
    Task.find(taskFilter).sort({ createdAt: -1 }).limit(5).populate('customerId', 'name').populate('runnerId', 'name avgRating reviewCount trustScore'),
  ]);
  const chart = await Task.aggregate([
    { $match: { ...taskFilter, createdAt: { $gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return res.json({
    stats: { total, pending, active, completed },
    activity: chart.map(({ _id, count }) => ({ date: _id, count })),
    recentTasks: recentTasks.map((task) => publicTask(task, req.user._id)),
  });
}
