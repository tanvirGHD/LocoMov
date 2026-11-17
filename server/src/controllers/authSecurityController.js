import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import { makeCode, hashCode, codeMatches, sendEmailCode, sendSmsCode, verifyTurnstile, notifyEmailChange } from '../utils/verification.js';
import { publicUser } from './authController.js';
import jwt from 'jsonwebtoken';

const codeSchema = z.object({ email: z.string().trim().email().max(254), code: z.string().regex(/^\d{6}$/), rememberDevice: z.boolean().optional() });
const loginCodes = new Map();
const genericResetMessage = 'If an account exists, a verification code has been sent.';
const normalized = (email) => email.trim().toLowerCase();

async function issue({ subject, purpose, user, payload, send }) {
  const existing = await VerificationCode.findOne({ subject, purpose });
  const now = Date.now();
  const recent = await VerificationCode.countDocuments({ subject, purpose, createdAt: { $gte: new Date(now - 60 * 60 * 1000) } });
  if (existing && now - existing.createdAt.getTime() < 60_000) return { error: 'Please wait before requesting another code.' };
  if (recent >= 5) return { error: 'Code request limit reached. Try again later.' };
  const code = makeCode();
  await VerificationCode.findOneAndUpdate({ subject, purpose }, { subject, purpose, user, payload, hash: hashCode(subject, purpose, code), expiresAt: new Date(now + 5 * 60_000), attempts: 0, createdAt: new Date(now) }, { upsert: true, new: true, setDefaultsOnInsert: true });
  try {
    await send(code);
  } catch (err) {
    if (process.env.NODE_ENV === 'production' && process.env.EASY_REGISTRATION !== 'true') throw err;
    console.info(`[DEV] Code for ${purpose} (${subject}): ${code}`);
  }
  return { code };
}

export async function login(req, res) {
  const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128), turnstileToken: z.string().optional(), rememberDevice: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  const turnstileOk = await verifyTurnstile(parsed.data.turnstileToken, req.ip).catch(() => process.env.NODE_ENV !== 'production');
  if (!parsed.success || !turnstileOk) return res.status(400).json({ message: 'Please complete the security check.' });
  const email = normalized(parsed.data.email);
  const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil');
  if (user?.lockUntil && user.lockUntil > new Date()) {
    const minutes = Math.max(1, Math.ceil((user.lockUntil - Date.now()) / 60_000));
    return res.status(423).json({ message: `Too many failed attempts. Try again in ${minutes} minutes.`, lockMinutes: minutes });
  }
  if (!user || !(await user.verifyPassword(parsed.data.password))) {
    if (user) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) { user.lockUntil = new Date(Date.now() + 15 * 60_000); user.failedLoginAttempts = 0; }
      await user.save();
    }
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'This account is inactive.' });
  user.failedLoginAttempts = 0; user.lockUntil = null; await user.save();

  const codesEnabled = process.env.ENABLE_AUTH_CODES === 'true';
  if (codesEnabled) {
    const device = req.cookies?.remembered_device;
    if (device && !['admin', 'super_admin', 'sub_admin'].includes(user.role)) {
      const digest = crypto.createHash('sha256').update(device).digest('hex');
      if (user.trustedDevices.some((item) => item.tokenHash === digest && item.expiresAt > new Date())) {
        res.cookie('token', jwt.sign({ id: String(user._id), version: user.sessionVersion }, process.env.JWT_SECRET, { expiresIn: '7d' }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 864e5, path: '/' });
        return res.json({ user: publicUser(user), authenticated: true });
      }
    }
    const result = await issue({ subject: email, purpose: 'login', user: user._id, send: (code) => sendEmailCode(email, code, 'login') });
    if (result.error) return res.status(429).json({ message: result.error });
    loginCodes.set(email, { rememberDevice: parsed.data.rememberDevice === true && !['admin', 'super_admin', 'sub_admin'].includes(user.role) });
    const canRememberDevice = !['admin', 'super_admin', 'sub_admin'].includes(user.role);
    const devCode = process.env.NODE_ENV !== 'production' ? result.code : undefined;
    return res.json({ message: devCode ? `Verification code sent. (dev: ${devCode})` : 'Verification code sent.', requiresCode: true, email, canRememberDevice, devCode });
  }

  const remember = parsed.data.rememberDevice === true && !['admin', 'super_admin', 'sub_admin'].includes(user.role);
  if (remember) {
    const device = crypto.randomBytes(32).toString('hex');
    user.trustedDevices = [...user.trustedDevices.filter((item) => item.expiresAt > new Date()), { tokenHash: crypto.createHash('sha256').update(device).digest('hex'), expiresAt: new Date(Date.now() + 30 * 864e5) }];
    res.cookie('remembered_device', device, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 864e5, path: '/' });
    await user.save();
  }
  res.cookie('token', jwt.sign({ id: String(user._id), version: user.sessionVersion }, process.env.JWT_SECRET, { expiresIn: '7d' }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 864e5, path: '/' });
  return res.json({ user: publicUser(user), authenticated: true });
}

export async function verifyLoginCode(req, res) {
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter the 6 digit verification code.' });
  const email = normalized(parsed.data.email);
  const record = await VerificationCode.findOne({ subject: email, purpose: 'login' });
  if (!record || record.expiresAt <= new Date() || record.attempts >= 5 || !codeMatches(email, 'login', parsed.data.code, record.hash)) {
    if (record) { record.attempts += 1; if (record.attempts >= 5) await record.deleteOne(); else await record.save(); }
    return res.status(400).json({ message: 'The verification code is invalid or expired.' });
  }
  const user = await User.findById(record.user);
  await record.deleteOne();
  if (!user?.isActive) return res.status(403).json({ message: 'This account is inactive.' });
  const remember = loginCodes.get(email)?.rememberDevice && parsed.data.rememberDevice !== false && !['admin', 'super_admin', 'sub_admin'].includes(user.role);
  loginCodes.delete(email);
  if (remember) {
    const device = crypto.randomBytes(32).toString('hex');
    user.trustedDevices = [...user.trustedDevices.filter((item) => item.expiresAt > new Date()), { tokenHash: crypto.createHash('sha256').update(device).digest('hex'), expiresAt: new Date(Date.now() + 30 * 864e5) }];
    res.cookie('remembered_device', device, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 864e5, path: '/' });
    await user.save();
  }
  res.cookie('token', jwt.sign({ id: String(user._id), version: user.sessionVersion }, process.env.JWT_SECRET, { expiresIn: '7d' }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 864e5, path: '/' });
  if (!user.emailVerified) await User.updateOne({ _id: user._id }, { $set: { emailVerified: true } });
  return res.json({ user: publicUser(user), authenticated: true });
}

export async function registerCodes(req, res) {
  const schema = z.object({ email: z.string().trim().email().max(254), phone: z.string().trim().min(10).max(20), channel: z.enum(['email', 'phone', 'both']).optional(), turnstileToken: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  const turnstileOk = await verifyTurnstile(parsed.data.turnstileToken, req.ip).catch(() => process.env.NODE_ENV !== 'production');
  if (!parsed.success || !turnstileOk) return res.status(400).json({ message: 'Please enter valid details and complete the security check.' });
  const email = normalized(parsed.data.email);
  let phone = parsed.data.phone.replace(/\D/g, '');
  if (/^01[3-9]\d{8}$/.test(phone)) phone = `+88${phone}`;
  else if (/^8801[3-9]\d{8}$/.test(phone)) phone = `+${phone}`;
  else if (!/^\+8801[3-9]\d{8}$/.test(phone)) return res.status(400).json({ message: 'Please enter a valid Bangladeshi mobile number.' });
  if (await User.exists({ $or: [{ email }, { phone }] })) return res.status(409).json({ message: 'An account already exists with this email or phone number.' });
  const channel = parsed.data.channel || 'both';
  let emailResult = null;
  let smsResult = null;
  if (channel === 'email' || channel === 'both') emailResult = await issue({ subject: email, purpose: 'register_email', send: (code) => sendEmailCode(email, code, 'register_email') }).catch((e) => ({ error: e?.message || 'email_failed' }));
  if (channel === 'phone' || channel === 'both') smsResult = await issue({ subject: phone, purpose: 'register_phone', send: (code) => sendSmsCode(phone, code) }).catch((e) => ({ error: e?.message || 'sms_failed' }));
  const failed = [emailResult, smsResult].filter((r) => r?.error);
  const dev = process.env.NODE_ENV !== 'production';
  if (failed.length && (channel === 'both' ? failed.length === 2 : true)) {
    if (process.env.NODE_ENV === 'production' && process.env.EASY_REGISTRATION !== 'true') {
      return res.status(429).json({ message: failed[0]?.error || 'Could not send verification code.' });
    }
  }
  const devCode = dev ? (emailResult?.code || smsResult?.code) : undefined;
  return res.json({ message: devCode ? `Code ready (dev: ${devCode}). Use it to verify or continue.` : 'Verification code request sent.', devMode: dev, devCode, channel });
}

export async function forgotPassword(req, res) {
  const parsed = z.object({ email: z.string().trim().email().max(254), turnstileToken: z.string().optional() }).safeParse(req.body);
  if (!parsed.success || !(await verifyTurnstile(parsed.data.turnstileToken, req.ip))) return res.json({ message: genericResetMessage });
  const email = normalized(parsed.data.email);
  const user = await User.findOne({ email });
  if (user) await issue({ subject: email, purpose: 'forgot_password', user: user._id, send: (code) => sendEmailCode(email, code, 'forgot_password') }).catch(() => {});
  return res.json({ message: genericResetMessage });
}

export async function resetPassword(req, res) {
  const parsed = z.object({ email: z.string().trim().email(), code: z.string().regex(/^\d{6}$/), password: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).refine((value) => !/(.)\1{3,}/i.test(value) && !/(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf)/i.test(value)) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid code and a strong password.' });
  const email = normalized(parsed.data.email);
  const record = await VerificationCode.findOne({ subject: email, purpose: 'forgot_password' });
  if (!record || record.expiresAt <= new Date() || record.attempts >= 5 || !codeMatches(email, 'forgot_password', parsed.data.code, record.hash)) {
    if (record) { record.attempts += 1; if (record.attempts >= 5) await record.deleteOne(); else await record.save(); }
    return res.status(400).json({ message: 'The verification code is invalid or expired.' });
  }
  const user = await User.findById(record.user).select('+password');
  if (!user) return res.json({ message: genericResetMessage });
  user.password = parsed.data.password; user.sessionVersion += 1; user.trustedDevices = []; await user.save(); await record.deleteOne();
  return res.json({ message: 'Password updated. Please sign in again.' });
}

export async function registrationCodesValid(email, phone, emailCode, phoneCode) {
  const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '88').replace(/^/, '+');
  const [emailRecord, phoneRecord] = await Promise.all([
    VerificationCode.findOne({ subject: normalized(email), purpose: 'register_email' }),
    VerificationCode.findOne({ subject: normalizedPhone, purpose: 'register_phone' }),
  ]);
  const valid = [emailRecord, phoneRecord].every(Boolean)
    && codeMatches(normalized(email), 'register_email', emailCode, emailRecord.hash)
    && codeMatches(normalizedPhone, 'register_phone', phoneCode, phoneRecord.hash)
    && emailRecord.expiresAt > new Date() && phoneRecord.expiresAt > new Date()
    && emailRecord.attempts < 5 && phoneRecord.attempts < 5;
  if (!valid) {
    for (const record of [emailRecord, phoneRecord].filter(Boolean)) { record.attempts += 1; if (record.attempts >= 5) await record.deleteOne(); else await record.save(); }
    return false;
  }
  await Promise.all([emailRecord.deleteOne(), phoneRecord.deleteOne()]);
  return true;
}

export async function sendAccountChangeCode(req, res) {
  const parsed = z.object({ kind: z.enum(['email', 'phone']), value: z.string().trim().min(5).max(254) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid new email or phone number.' });
  const kind = parsed.data.kind;
  const target = kind === 'email' ? normalized(parsed.data.value) : parsed.data.value.replace(/\D/g, '').replace(/^0/, '88').replace(/^/, '+');
  if (kind === 'email' && !z.string().email().safeParse(target).success) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (kind === 'phone' && !/^\+8801[3-9]\d{8}$/.test(target)) return res.status(400).json({ message: 'Enter a valid Bangladeshi phone number.' });
  const query = kind === 'email' ? { email: target } : { phone: target };
  if (await User.exists({ ...query, _id: { $ne: req.user._id } })) return res.status(409).json({ message: 'That email or phone number is already in use.' });
  const purpose = kind === 'email' ? 'change_email' : 'change_phone';
  const send = kind === 'email' ? (code) => sendEmailCode(target, code, purpose) : (code) => sendSmsCode(target, code);
  const result = await issue({ subject: target, purpose, user: req.user._id, payload: { kind, oldEmail: req.user.email }, send });
  if (result.error) return res.status(429).json({ message: result.error });
  return res.json({ message: 'Verification code sent.' });
}

export async function completeAccountChange(req, res) {
  const parsed = z.object({ kind: z.enum(['email', 'phone']), value: z.string().trim().min(5).max(254), code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid value and verification code.' });
  const kind = parsed.data.kind;
  const target = kind === 'email' ? normalized(parsed.data.value) : parsed.data.value.replace(/\D/g, '').replace(/^0/, '88').replace(/^/, '+');
  const purpose = kind === 'email' ? 'change_email' : 'change_phone';
  const record = await VerificationCode.findOne({ subject: target, purpose, user: req.user._id });
  if (!record || record.expiresAt <= new Date() || record.attempts >= 5 || !codeMatches(target, purpose, parsed.data.code, record.hash)) {
    if (record) { record.attempts += 1; if (record.attempts >= 5) await record.deleteOne(); else await record.save(); }
    return res.status(400).json({ message: 'The verification code is invalid or expired.' });
  }
  const oldEmail = req.user.email;
  if (kind === 'email') { req.user.email = target; req.user.emailVerified = true; }
  else { req.user.phone = target; req.user.phoneVerified = true; }
  req.user.sessionVersion += 1; req.user.trustedDevices = [];
  await req.user.save(); await record.deleteOne();
  await notifyEmailChange(oldEmail, kind).catch(() => {});
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  return res.json({ message: `${kind === 'email' ? 'Email' : 'Phone'} updated. Please sign in again.` });
}

export async function updatePassword(req, res) {
  const parsed = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).refine((value) => !/(.)\1{3,}/i.test(value) && !/(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf)/i.test(value)) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter your current password and a valid new password.' });
  const user = await User.findById(req.user._id).select('+password');
  if (!await user.verifyPassword(parsed.data.currentPassword)) return res.status(401).json({ message: 'Current password is incorrect.' });
  const oldEmail = user.email;
  user.password = parsed.data.newPassword; user.sessionVersion += 1; user.trustedDevices = [];
  await user.save(); await notifyEmailChange(oldEmail, 'password').catch(() => {});
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  return res.json({ message: 'Password updated. Please sign in again.' });
}
