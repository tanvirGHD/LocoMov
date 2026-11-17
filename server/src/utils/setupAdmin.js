import 'dotenv/config';
import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../models/User.js';

const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!MONGO_URI) throw new Error('MONGO_URI is missing from the environment.');
const credentials = z.object({ email: z.string().trim().email().max(254), password: z.string().min(12).max(128) }).safeParse({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
if (!credentials.success) throw new Error('Set valid ADMIN_EMAIL and ADMIN_PASSWORD environment variables (password must be at least 12 characters).');

try {
  await mongoose.connect(MONGO_URI);
  const indexes = await User.collection.indexes();
  const phoneIndex = indexes.find((index) => index.key?.phone === 1);
  if (phoneIndex && phoneIndex.sparse !== true) await User.collection.dropIndex(phoneIndex.name);
  await User.collection.createIndex({ phone: 1 }, { unique: true, sparse: true, name: 'phone_1' });
  const email = credentials.data.email.toLowerCase();
  const existing = await User.exists({ email });
  if (existing) {
    console.log('An account already exists for ADMIN_EMAIL; no account was created or changed.');
  } else {
    await User.create({ name: 'Super Admin', email, password: credentials.data.password, role: 'super_admin', isActive: true, emailVerified: true });
    console.log('Super admin account created.');
  }
} finally {
  await mongoose.disconnect();
}
