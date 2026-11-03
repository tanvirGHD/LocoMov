import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Please log in to continue.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || typeof payload !== 'object' || typeof payload.id !== 'string') {
      return res.status(401).json({ message: 'Session is invalid. Please log in again.' });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'User not found. Please log in again.' });
    if (!user.isActive) return res.status(403).json({ message: 'This account has been deactivated by an admin.' });
    req.user = user;
    req.userId = user._id;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that.' });
    }
    return next();
  };
}
