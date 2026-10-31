import { z } from 'zod';
import User from '../models/User.js';

export async function listUsers(req, res) {
  const users = await User.find()
    .select('name email phone role trustScore runnerLimit isActive createdAt')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  return res.json({ users: users.map((user) => ({ ...user, isActive: user.isActive !== false })) });
}

export async function setUserStatus(req, res) {
  const parsed = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'অ্যাকাউন্টের অবস্থা সঠিকভাবে দিন' });

  const user = await User.findOneAndUpdate(
    { _id: req.params.userId, role: { $in: ['customer', 'runner'] } },
    { $set: { isActive: parsed.data.isActive } },
    { new: true, runValidators: true, select: 'name email role isActive' },
  );
  if (!user) return res.status(404).json({ message: 'গ্রাহক বা রানার অ্যাকাউন্টটি পাওয়া যায়নি' });
  return res.json({ user });
}
