import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { z } from 'zod';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { registrationCodesValid } from './authSecurityController.js';

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
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .refine((value) => !/(.)\1{3,}/i.test(value) && !/(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf)/i.test(value), 'Choose a less common password.'),
  role: z.enum(['customer', 'runner']).default('customer'),
  area: z.string().trim()
    .min(2, 'Please specify your current area or neighborhood (where you live)')
    .max(120, 'Area cannot exceed 120 characters'),
  dateOfBirth: z.coerce.date(),
  emergencyContact: z.string().trim().max(20).optional().default(''),
  avatarUrl: z.string().trim().optional().default(''),
  avatarDataUrl: z.string().optional().default(''),
  emailCode: z.string().regex(/^\d{6}$/).optional(),
  phoneCode: z.string().regex(/^\d{6}$/).optional(),
  termsAccepted: z.coerce.boolean().refine(Boolean, 'You must accept the Terms and Privacy Policy.'),
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

export function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl || '',
    area: user.area || '',
    age: user.age || (user.dateOfBirth ? Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / 31557600000) : null),
    dateOfBirth: user.dateOfBirth || null,
    permissions: user.permissions || [],
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

async function saveAvatarBuffer(buffer, mimeType) {
  if (!isValidImageMagicBytes(buffer)) {
    throw new Error('The uploaded file does not match a valid image signature (JPG, PNG, or WebP).');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) || buffer.length > 2 * 1024 * 1024) throw new Error('Profile photo must be JPG, PNG, or WebP and no larger than 2 MB.');
  const filename = `avatar-${crypto.randomBytes(16).toString('hex')}.jpg`;
  const filePath = path.join(uploadRoot, filename);
  await sharp(buffer).rotate().jpeg({ quality: 88 }).toFile(filePath);
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
    dateOfBirth,
    emergencyContact,
    avatarUrl: inputAvatarUrl,
    avatarDataUrl,
    locationCoordinates,
  } = parsed.data;

  const age = dateOfBirth ? Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / 31557600000) : null;
  if (age !== null && (age < 18 || age > 120)) return res.status(400).json({ message: 'You must be at least 18 years old to join LocoMuv.' });
  if (role === 'runner' && !emergencyContact) return res.status(400).json({ message: 'Runner accounts require an emergency contact.' });
  const easyMode = process.env.NODE_ENV !== 'production' || process.env.EASY_REGISTRATION === 'true';
  const codesEnabled = process.env.ENABLE_AUTH_CODES === 'true';
  if (codesEnabled) {
    if (!parsed.data.emailCode || !parsed.data.phoneCode) return res.status(400).json({ message: 'Email and phone verification codes are required.' });
    if (!(await registrationCodesValid(email, phone, parsed.data.emailCode, parsed.data.phoneCode))) return res.status(400).json({ message: 'Email or phone verification code is invalid or expired.' });
  }

  // Process profile photo (optional)
  let finalAvatarUrl = inputAvatarUrl || '';

  if (req.file) {
    try {
      finalAvatarUrl = await saveAvatarBuffer(req.file.buffer, req.file.mimetype);
    } catch (err) {
      if (!easyMode) return res.status(400).json({ message: err.message || 'Invalid profile photo uploaded.' });
    }
  } else if (avatarDataUrl && avatarDataUrl.startsWith('data:image/')) {
    try {
      const match = avatarDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length <= 2 * 1024 * 1024) finalAvatarUrl = await saveAvatarBuffer(buffer, mimeType);
      }
    } catch (err) {
      if (!easyMode) return res.status(400).json({ message: 'Could not process captured photo.' });
    }
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
      area: area || 'Dhaka',
      age: age || null,
      dateOfBirth: dateOfBirth || null,
      emergencyContact: formattedEmergency,
      locationCoordinates: locationCoordinates ? {
        lat: Number(locationCoordinates.lat) || null,
        lng: Number(locationCoordinates.lng) || null,
      } : null,
      verificationStatus: role === 'runner' ? 'pending' : 'approved',
      emailVerified: codesEnabled ? !!(parsed.data.emailCode && parsed.data.phoneCode) : false,
      phoneVerified: codesEnabled ? !!(parsed.data.emailCode && parsed.data.phoneCode) : false,
    });
    return res.status(201).json({ message: 'Account created. Please sign in.', user: publicUser(user), authenticated: false });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account already exists with this email or phone number.' });
    }
    throw error;
  }
}

export async function updateProfile(req, res) {
  const isFormData = req.body instanceof FormData;
  let name, email, phone, area, avatarFile;
  if (isFormData) {
    name = req.body.get('name');
    email = req.body.get('email');
    phone = req.body.get('phone');
    area = req.body.get('area');
    avatarFile = req.file;
  } else {
    const schema = z.object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
      email: z.string().trim().email('Please enter a valid email address').max(254).optional(),
      phone: z.string().trim().min(10, 'Please enter a valid phone number').max(20).optional(),
      area: z.string().trim().min(2, 'Area must be at least 2 characters').max(120).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    name = parsed.data.name;
    email = parsed.data.email;
    phone = parsed.data.phone;
    area = parsed.data.area;
  }

  const updates = {};
  if (name !== undefined && name !== '') updates.name = name.trim();
  if (email !== undefined && email !== '') updates.email = email.toLowerCase();
  if (phone !== undefined && phone !== '') {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    let normalizedPhone = cleanPhone;
    if (/^01[3-9]\d{8}$/.test(cleanPhone)) normalizedPhone = `+88${cleanPhone}`;
    else if (/^8801[3-9]\d{8}$/.test(cleanPhone)) normalizedPhone = `+${cleanPhone}`;
    if (!/^\+8801[3-9]\d{8}$/.test(normalizedPhone)) return res.status(400).json({ message: 'Please enter a valid Bangladeshi mobile number (e.g. 017XXXXXXXX).' });
    updates.phone = normalizedPhone;
  }
  if (area !== undefined && area !== '') updates.area = area.trim();

  if (avatarFile) {
    try {
      updates.avatarUrl = await saveAvatarBuffer(avatarFile.buffer, avatarFile.mimetype);
    } catch (err) {
      return res.status(400).json({ message: err.message || 'Invalid profile photo uploaded.' });
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  return res.json({ message: 'Profile updated successfully.', user: publicUser(user) });
}

export function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'none', secure: true, path: '/' });
  res.clearCookie('remembered_device', { httpOnly: true, sameSite: 'none', secure: true, path: '/' });
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
