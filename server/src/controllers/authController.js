import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'নাম অন্তত ২ অক্ষরের হতে হবে').max(80),
  email: z.string().trim().email('সঠিক ইমেইল দিন').max(254),
  phone: z.string().trim().min(10, 'সঠিক ফোন নম্বর দিন').max(20),
  password: z.string().min(8, 'পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে').max(128),
  role: z.enum(['customer', 'runner']).default('customer'),
});

const loginSchema = z.object({
  email: z.string().trim().email('সঠিক ইমেইল দিন'),
  password: z.string().min(1, 'পাসওয়ার্ড লিখুন').max(128),
});

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    trustScore: user.trustScore,
    runnerLimit: user.runnerLimit,
  };
}

function createSession(res, user) {
  const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  const { name, email, phone, password, role } = parsed.data;
  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { phone }],
  });
  if (existing) return res.status(409).json({ message: 'এই ইমেইল বা ফোন নম্বর দিয়ে অ্যাকাউন্ট আছে' });

  try {
    const user = await User.create({ name, email, phone, password, role });
    createSession(res, user);
    return res.status(201).json(publicUser(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'এই ইমেইল বা ফোন নম্বর দিয়ে অ্যাকাউন্ট আছে' });
    throw error;
  }
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'ইমেইল ও পাসওয়ার্ড সঠিকভাবে লিখুন' });

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+password');
  if (!user || !(await user.verifyPassword(parsed.data.password))) {
    return res.status(401).json({ message: 'ইমেইল বা পাসওয়ার্ড ভুল' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'এই অ্যাকাউন্টটি প্রশাসক নিষ্ক্রিয় করেছেন' });

  createSession(res, user);
  return res.json(publicUser(user));
}

export function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  return res.json({ message: 'লগআউট হয়েছে' });
}

export async function me(req, res) {
  return res.json(publicUser(req.user));
}
