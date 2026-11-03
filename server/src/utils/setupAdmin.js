import 'dotenv/config';
import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../models/User.js';

if (process.env.ALLOW_ADMIN_SETUP !== 'true') {
  throw new Error('Set ALLOW_ADMIN_SETUP=true in your environment to create an admin account.');
}

const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD } = process.env;
if (!MONGO_URI) throw new Error('MONGO_URI is missing from the environment file.');
const account = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(10).max(20),
  password: z.string().min(12).max(128),
}).safeParse({
  name: ADMIN_NAME,
  email: ADMIN_EMAIL,
  phone: ADMIN_PHONE,
  password: ADMIN_PASSWORD,
});
if (!account.success) {
  throw new Error('Provide ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, and a valid ADMIN_PASSWORD with at least 12 characters.');
}
if (['admin123', 'password123', 'Demo@12345'].includes(account.data.password)) {
  throw new Error('ADMIN_PASSWORD must be at least 12 characters and different from common demo passwords.');
}

try {
  await mongoose.connect(MONGO_URI);
  const existingUser = await User.exists({
    $or: [
      { email: account.data.email.toLowerCase() },
      { phone: account.data.phone },
    ],
  });
  if (existingUser) {
    throw new Error('An account with this email or phone already exists and was not changed automatically.');
  }

  const admin = await User.create({
    name: account.data.name,
    email: account.data.email,
    phone: account.data.phone,
    password: account.data.password,
    role: 'admin',
  });
  console.log(`Admin account created: ${admin.email}`);
} finally {
  await mongoose.disconnect();
}
