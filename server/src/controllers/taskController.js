import { z } from 'zod';
import Bid from '../models/Bid.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { createOtp, decryptOtp, encryptOtp, verifyOtp } from '../utils/otp.js';

const pointInput = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().min(3, 'ঠিকানা অন্তত ৩ অক্ষরের হতে হবে').max(240),
});

const createTaskSchema = z.object({
  title: z.string().trim().min(3, 'শিরোনাম অন্তত ৩ অক্ষরের হতে হবে').max(120),
  description: z.string().trim().min(5, 'কাজের বিস্তারিত লিখুন').max(2000),
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
    if (task.pickupOTP) result.pickupOTP = decryptOtp(task.pickupOTP);
    if (task.deliveryOTP) result.deliveryOTP = decryptOtp(task.deliveryOTP);
  }
  return result;
}

function parsedOrRespond(schema, body, res) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message || 'তথ্য সঠিকভাবে পূরণ করুন' });
    return null;
  }
  return parsed.data;
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
  const filter = req.user.role === 'admin'
    ? {}
    : req.user.role === 'customer'
      ? { customerId: req.user._id }
      : { runnerId: req.user._id };
  let taskQuery = Task.find(filter);
  if (req.user.role === 'customer') taskQuery = taskQuery.select('+pickupOTP +deliveryOTP');
  const tasks = await taskQuery
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('customerId', 'name')
    .populate('runnerId', 'name trustScore');
  return res.json({ tasks: tasks.map((task) => publicTask(task, req.user._id)) });
}

export async function nearbyTasks(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Math.min(5, Math.max(3, Number(req.query.radiusKm) || 5));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ message: 'আপনার সঠিক অবস্থান দিন' });
  }

  const tasks = await Task.find({
    status: 'pending',
    customerId: { $ne: req.user._id },
    estimatedPrice: { $lte: req.user.runnerLimit },
    pickupLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .limit(100)
    .populate('customerId', 'name');
  return res.json({ tasks: tasks.map((task) => publicTask(task, req.user._id)) });
}

export async function getTask(req, res) {
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'কাজটি পাওয়া যায়নি' });
  const isCustomer = String(task.customerId) === String(req.user._id);
  const isRunner = String(task.runnerId) === String(req.user._id);
  if (!isCustomer && !isRunner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'এই কাজটি দেখার অনুমতি নেই' });
  }
  const detailed = isCustomer
    ? await Task.findById(task._id).select('+pickupOTP +deliveryOTP')
    : task;
  return res.json({ task: publicTask(detailed, req.user._id) });
}

export async function deleteTask(req, res) {
  const task = await Task.findOneAndDelete({
    _id: req.params.taskId,
    customerId: req.user._id,
    runnerId: null,
    status: 'pending',
    disputeStatus: 'none',
  });
  if (!task) {
    return res.status(409).json({ message: 'শুধু রানার না-নেওয়া অপেক্ষমাণ পোস্ট মুছে ফেলা যাবে' });
  }
  await Bid.deleteMany({ taskId: task._id });
  return res.json({ message: 'কাজের পোস্টটি মুছে ফেলা হয়েছে' });
}

export async function acceptTask(req, res) {
  const taskId = req.params.taskId;
  const lat = Number(req.body.latitude);
  const lng = Number(req.body.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ message: 'কাজ নিতে আপনার অবস্থান শেয়ার করুন' });
  }
  const task = await Task.findOne({
    _id: taskId,
    status: 'pending',
    estimatedPrice: { $lte: req.user.runnerLimit },
    customerId: { $ne: req.user._id },
    pickupLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 5000,
      },
    },
  });
  if (!task) return res.status(409).json({ message: 'কাজটি আর পাওয়া যাচ্ছে না, বাজেটের বেশি, অথবা ৫ কিমির বাইরে' });

  const accepted = await setTaskAccepted(task, req.user, task.estimatedPrice);
  if (!accepted) return res.status(409).json({ message: 'অন্য একজন কাজটি নিয়ে নিয়েছেন' });
  await Bid.updateMany({ taskId: task._id, status: 'pending' }, { $set: { status: 'rejected' } });
  return res.json({ task: publicTask(accepted, req.user._id) });
}

export async function createBid(req, res) {
  const data = parsedOrRespond(bidSchema, req.body, res);
  if (!data) return;
  const location = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).safeParse(req.body);
  if (!location.success) return res.status(400).json({ message: 'কাজে প্রস্তাব দিতে আপনার অবস্থান শেয়ার করুন' });
  const task = await Task.findOne({
    _id: req.params.taskId,
    status: 'pending',
    disputeStatus: 'none',
    customerId: { $ne: req.user._id },
    pickupLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [location.data.longitude, location.data.latitude],
        },
        $maxDistance: 5000,
      },
    },
  });
  if (!task) return res.status(404).json({ message: 'এই কাজটিতে আর প্রস্তাব দেওয়া যাবে না' });
  if (String(task.customerId) === String(req.user._id)) {
    return res.status(400).json({ message: 'নিজের কাজে প্রস্তাব দেওয়া যাবে না' });
  }
  if (data.proposedPrice > task.estimatedPrice) {
    return res.status(400).json({ message: 'প্রস্তাবিত মূল্য গ্রাহকের বাজেটের বেশি হতে পারবে না' });
  }
  if (data.proposedPrice > req.user.runnerLimit) {
    return res.status(403).json({ message: `আপনার বর্তমান সীমা ৳${req.user.runnerLimit}` });
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
      return res.status(409).json({ message: 'কাজটি ইতিমধ্যে নেওয়া হয়েছে' });
    }
    return res.status(201).json({ bid });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'এই কাজে আপনার একটি প্রস্তাব আগে থেকেই আছে' });
    throw error;
  }
}

export async function listBids(req, res) {
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'কাজটি পাওয়া যায়নি' });
  const isOwner = String(task.customerId) === String(req.user._id);
  const isAssignedRunner = String(task.runnerId) === String(req.user._id);
  const hasSubmittedBid = await Bid.exists({ taskId: task._id, runnerId: req.user._id });
  if (!isOwner && !isAssignedRunner && !hasSubmittedBid && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'এই কাজের প্রস্তাব দেখার অনুমতি নেই' });
  }
  const filter = isOwner
    ? { taskId: task._id }
    : { taskId: task._id, runnerId: req.user._id };
  const bids = await Bid.find(filter)
    .sort({ createdAt: -1 })
    .populate('runnerId', 'name trustScore');
  return res.json({ bids });
}

export async function acceptBid(req, res) {
  const task = await Task.findOne({ _id: req.params.taskId, customerId: req.user._id, status: 'pending' });
  if (!task) return res.status(404).json({ message: 'কাজটি পাওয়া যায়নি বা ইতিমধ্যে নেওয়া হয়েছে' });
  const bid = await Bid.findOne({ _id: req.params.bidId, taskId: task._id, status: 'pending' }).populate('runnerId');
  if (!bid || !bid.runnerId) return res.status(404).json({ message: 'প্রস্তাবটি আর পাওয়া যাচ্ছে না' });
  if (bid.proposedPrice > bid.runnerId.runnerLimit || bid.proposedPrice > task.estimatedPrice) {
    return res.status(409).json({ message: 'রানারের বর্তমান সীমা এই প্রস্তাবের জন্য যথেষ্ট নয়' });
  }

  const accepted = await setTaskAccepted(task, bid.runnerId, bid.proposedPrice);
  if (!accepted) return res.status(409).json({ message: 'অন্য একটি প্রস্তাব ইতিমধ্যে গ্রহণ করা হয়েছে' });
  await Bid.updateMany({ taskId: task._id, _id: { $ne: bid._id }, status: 'pending' }, { $set: { status: 'rejected' } });
  await Bid.updateOne({ _id: bid._id, status: 'pending' }, { $set: { status: 'accepted' } });
  const customerTask = await Task.findById(accepted._id).select('+pickupOTP +deliveryOTP');
  return res.json({ task: publicTask(customerTask, req.user._id) });
}

async function submitOtp(req, res, field, requiredStatus, nextStatus, timestamp) {
  const parsed = z.object({ otp: z.string().regex(/^\d{4}$/, '৪ সংখ্যার OTP লিখুন') }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const task = await Task.findById(req.params.taskId).select(`+${field} +otpAttempts +otpLockedUntil`);
  if (!task || String(task.runnerId) !== String(req.user._id)) {
    return res.status(404).json({ message: 'আপনার জন্য নির্ধারিত কাজটি পাওয়া যায়নি' });
  }
  if (task.disputeStatus === 'open') return res.status(409).json({ message: 'সমস্যাটি পর্যালোচনাধীন, তাই OTP যাচাই স্থগিত' });
  if (task.status !== requiredStatus) return res.status(409).json({ message: 'এই ধাপে OTP যাচাই করা যাবে না' });
  if (!task[field]) return res.status(409).json({ message: 'এই কাজের OTP পাওয়া যায়নি' });
  if (task.otpLockedUntil && task.otpLockedUntil > new Date()) {
    return res.status(429).json({ message: 'অনেকবার ভুল হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন' });
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
      message: attempts >= 5 ? 'অনেকবার ভুল হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন' : 'OTP সঠিক নয়',
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
        runnerLimit: { $min: [5000, { $add: ['$runnerLimit', 100] }] },
      },
    }]);
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
  if (!parsed.success) return res.status(400).json({ message: 'ডেলিভারির পরবর্তী ধাপটি সঠিকভাবে বাছাই করুন' });

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
  if (!task) return res.status(409).json({ message: 'কাজটি এই ধাপে নেই, অথবা সমস্যা পর্যালোচনার জন্য খোলা হয়েছে' });
  return res.json({ task: publicTask(task, req.user._id) });
}

export async function cancelTask(req, res) {
  const task = await Task.findOne({ _id: req.params.taskId, status: { $in: ['pending', 'accepted'] } });
  if (!task) return res.status(409).json({ message: 'এই কাজটি এখন বাতিল করা যাবে না' });
  const isCustomer = String(task.customerId) === String(req.user._id);
  const isAssignedRunner = String(task.runnerId) === String(req.user._id);
  if (!isCustomer && !isAssignedRunner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'এই কাজটি বাতিল করার অনুমতি নেই' });
  }
  const reason = z.string().trim().max(500).safeParse(req.body.reason || '');
  if (!reason.success) return res.status(400).json({ message: 'বাতিলের কারণ ৫০০ অক্ষরের মধ্যে লিখুন' });
  const updated = await Task.findOneAndUpdate(
    { _id: task._id, status: task.status },
    { $set: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: reason.data } },
    { new: true },
  );
  if (!updated) return res.status(409).json({ message: 'কাজটি ইতিমধ্যে পরিবর্তিত হয়েছে' });
  await Bid.updateMany({ taskId: task._id, status: 'pending' }, { $set: { status: 'rejected' } });
  if (isAssignedRunner) await penalizeRunner(req.user._id, 10, 100);
  return res.json({ task: publicTask(updated, req.user._id) });
}

export async function openDispute(req, res) {
  const data = parsedOrRespond(z.object({
    reason: z.string().trim().min(10, 'সমস্যার বিস্তারিত অন্তত ১০ অক্ষরের হতে হবে').max(1000),
  }), req.body, res);
  if (!data) return;
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'কাজটি পাওয়া যায়নি' });
  if (![String(task.customerId), String(task.runnerId)].includes(String(req.user._id))) {
    return res.status(403).json({ message: 'শুধু এই কাজের গ্রাহক বা রানার সমস্যা জানাতে পারবেন' });
  }
  if (!['accepted', 'picked-up', 'in-transit', 'arriving', 'completed'].includes(task.status) || task.disputeStatus === 'open') {
    return res.status(409).json({ message: 'এই কাজের জন্য এখন সমস্যা জানানো যাবে না' });
  }
  const updated = await Task.findOneAndUpdate(
    { _id: task._id, disputeStatus: { $ne: 'open' } },
    { $set: { disputeStatus: 'open', disputeReason: data.reason, disputeBy: req.user._id } },
    { new: true },
  );
  if (!updated) return res.status(409).json({ message: 'একটি সমস্যা ইতিমধ্যে জানানো হয়েছে' });
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
  if (!task) return res.status(404).json({ message: 'খোলা সমস্যা পাওয়া যায়নি' });
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
  if (!updated) return res.status(409).json({ message: 'সমস্যাটি ইতিমধ্যে নিষ্পত্তি হয়েছে' });
  if (data.fault === 'runner' && task.runnerId) await penalizeRunner(task.runnerId, 15, 150);
  return res.json({ task: publicTask(updated, req.user._id) });
}

export async function dashboard(req, res) {
  const taskFilter = req.user.role === 'admin'
    ? {}
    : req.user.role === 'customer'
      ? { customerId: req.user._id }
      : { runnerId: req.user._id };
  const [total, pending, active, completed, recentTasks] = await Promise.all([
    Task.countDocuments(taskFilter),
    Task.countDocuments({ ...taskFilter, status: 'pending' }),
    Task.countDocuments({ ...taskFilter, status: { $in: ['accepted', 'picked-up', 'in-transit', 'arriving'] } }),
    Task.countDocuments({ ...taskFilter, status: 'completed' }),
    Task.find(taskFilter).sort({ createdAt: -1 }).limit(5).populate('customerId', 'name').populate('runnerId', 'name'),
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
