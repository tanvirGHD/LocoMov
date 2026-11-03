import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import Review from '../models/Review.js';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(80),
  email: z.string().trim().email('Please enter a valid email').max(254),
  phone: z.string().trim().min(10, 'Please enter a valid phone number').max(20),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(128),
  role: z.enum(['customer', 'runner']).default('customer'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(1, 'Please enter your password').max(128),
});

export function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    trustScore: user.trustScore,
    runnerLimit: user.runnerLimit,
    avgRating: Number((user.avgRating ?? 5.0).toFixed(1)),
    reviewCount: user.reviewCount ?? 0,
    isActive: user.isActive !== false,
    verificationStatus: user.verificationStatus || 'approved',
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
  if (existing) return res.status(409).json({ message: 'An account already exists with this email or phone number.' });

  try {
      const user = await User.create({
        name,
        email,
        phone,
        password,
        role,
        verificationStatus: role === 'runner' ? 'pending' : 'approved',
      });
    createSession(res, user);
    return res.status(201).json(publicUser(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account already exists with this email or phone number.' });
    throw error;
  }
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Please enter a valid email and password.' });

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+password');
  if (!user || !(await user.verifyPassword(parsed.data.password))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'This account has been deactivated by an admin.' });

  createSession(res, user);
  return res.json(publicUser(user));
}

export function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  return res.json({ message: 'Logged out successfully.' });
}

export async function me(req, res) {
  return res.json(publicUser(req.user));
}

export async function getUserReviews(req, res) {
  const reviews = await Review.find({ reviewee: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('reviewer', 'name role')
    .lean();
  return res.json({ reviews });
}
