import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'চালিয়ে যেতে লগইন করুন' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || typeof payload !== 'object' || typeof payload.id !== 'string') {
      return res.status(401).json({ message: 'সেশনটি সঠিক নয়, আবার লগইন করুন' });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'ব্যবহারকারী পাওয়া যায়নি, আবার লগইন করুন' });
    if (!user.isActive) return res.status(403).json({ message: 'এই অ্যাকাউন্টটি প্রশাসক নিষ্ক্রিয় করেছেন' });
    req.user = user;
    req.userId = user._id;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'সেশন শেষ, আবার লগইন করুন' });
    }
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'এই কাজের অনুমতি আপনার নেই' });
    }
    return next();
  };
}
