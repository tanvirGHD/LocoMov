import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import Review from '../models/Review.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

export function isValidImageMagicBytes(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // WebP: RIFF .... WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return true;
  }
  return false;
}

const registerSchema = z.object({
  name: z.string().trim()
    .min(2, 'Full name must be at least 2 characters long')
    .max(80, 'Full name cannot exceed 80 characters'),
  email: z.string().trim().email('Please enter a valid email address').max(254),
  phone: z.string().trim().min(10, 'Please enter a valid phone number').max(20),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  role: z.enum(['customer', 'runner']).default('customer'),
  area: z.string().trim()
    .min(2, 'Please specify your current area or neighborhood (where you live)')
    .max(120, 'Area cannot exceed 120 characters'),
  age: z.coerce.number()
    .int('Age must be a whole number')
    .min(18, 'You must be at least 18 years old to join LocoMuv')
    .max(120, 'Please enter a valid age'),
  emergencyContact: z.string().trim().max(20).optional().default(''),
  avatarUrl: z.string().trim().optional().default(''),
  avatarDataUrl: z.string().optional().default(''),
  locationCoordinates: z.union([
    z.string().transform((val) => {
      try {
        const parsed = JSON.parse(val);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        return null;
      }
      return null;
    }),
    z.object({
      lat: z.number().optional().nullable(),
      lng: z.number().optional().nullable(),
    }),
  ]).optional().nullable(),
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
    avatarUrl: user.avatarUrl || '',
    area: user.area || '',
    age: user.age || null,
    emergencyContact: user.emergencyContact || '',
    locationCoordinates: user.locationCoordinates || null,
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

function saveAvatarBuffer(buffer, mimeType) {
  if (!isValidImageMagicBytes(buffer)) {
    throw new Error('The uploaded file does not match a valid image signature (JPG, PNG, or WebP).');
  }
  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  const ext = mimeToExt[mimeType] || '.jpg';
  const filename = `avatar-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const filePath = path.join(uploadRoot, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
}

export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const {
    name,
    email,
    phone,
    password,
    role,
    area,
    age,
    emergencyContact,
    avatarUrl: inputAvatarUrl,
    avatarDataUrl,
    locationCoordinates,
  } = parsed.data;

  // Process profile photo
  let finalAvatarUrl = inputAvatarUrl || '';

  if (req.file) {
    try {
      finalAvatarUrl = saveAvatarBuffer(req.file.buffer, req.file.mimetype);
    } catch (err) {
      return res.status(400).json({ message: err.message || 'Invalid profile photo uploaded.' });
    }
  } else if (avatarDataUrl && avatarDataUrl.startsWith('data:image/')) {
    // Handle camera capture data URL
    try {
      const match = avatarDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 5 * 1024 * 1024) {
          return res.status(400).json({ message: 'Captured photo exceeds 5 MB limit.' });
        }
        finalAvatarUrl = saveAvatarBuffer(buffer, mimeType);
      }
    } catch (err) {
      return res.status(400).json({ message: 'Could not process captured photo.' });
    }
  }

  if (!finalAvatarUrl) {
    return res.status(400).json({ message: 'A real profile photo of yourself is required to register.' });
  }

  // Format and validate phone
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  let normalizedPhone = cleanPhone;
  if (/^01[3-9]\d{8}$/.test(cleanPhone)) {
    normalizedPhone = `+88${cleanPhone}`;
  } else if (/^8801[3-9]\d{8}$/.test(cleanPhone)) {
    normalizedPhone = `+${cleanPhone}`;
  }

  if (!/^\+8801[3-9]\d{8}$/.test(normalizedPhone)) {
    return res.status(400).json({ message: 'Please enter a valid Bangladeshi mobile number (e.g. 017XXXXXXXX).' });
  }

  // Validate emergency contact if provided
  let formattedEmergency = '';
  if (emergencyContact) {
    const cleanEmergency = emergencyContact.replace(/[^\d+]/g, '');
    if (/^01[3-9]\d{8}$/.test(cleanEmergency)) {
      formattedEmergency = `+88${cleanEmergency}`;
    } else if (/^8801[3-9]\d{8}$/.test(cleanEmergency)) {
      formattedEmergency = `+${cleanEmergency}`;
    } else if (/^\+8801[3-9]\d{8}$/.test(cleanEmergency)) {
      formattedEmergency = cleanEmergency;
    } else {
      return res.status(400).json({ message: 'Emergency contact must be a valid Bangladeshi mobile number.' });
    }
  }

  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { phone: normalizedPhone }],
  });
  if (existing) {
    return res.status(409).json({ message: 'An account already exists with this email or phone number.' });
  }

  try {
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: normalizedPhone,
      password,
      role,
      avatarUrl: finalAvatarUrl,
      area,
      age,
      emergencyContact: formattedEmergency,
      locationCoordinates: locationCoordinates ? {
        lat: Number(locationCoordinates.lat) || null,
        lng: Number(locationCoordinates.lng) || null,
      } : null,
      verificationStatus: role === 'runner' ? 'pending' : 'approved',
    });

    createSession(res, user);
    return res.status(201).json(publicUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account already exists with this email or phone number.' });
    }
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
