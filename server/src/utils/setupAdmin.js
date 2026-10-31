import 'dotenv/config';
import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../models/User.js';

if (process.env.ALLOW_ADMIN_SETUP !== 'true') {
  throw new Error('Admin তৈরি করতে .env-এ ALLOW_ADMIN_SETUP=true দিয়ে স্পষ্টভাবে অনুমতি দিন');
}

const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD } = process.env;
if (!MONGO_URI) throw new Error('MONGO_URI .env ফাইলে নেই');
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
  throw new Error('ADMIN_NAME, সঠিক ADMIN_EMAIL, ADMIN_PHONE এবং অন্তত ১২ অক্ষরের ADMIN_PASSWORD .env-এ দিতে হবে');
}
if (['admin123', 'password123', 'Demo@12345'].includes(account.data.password)) {
  throw new Error('ADMIN_PASSWORD অন্তত ১২ অক্ষরের এবং demo password থেকে আলাদা হতে হবে');
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
    throw new Error('এই email বা phone দিয়ে account আগে থেকেই আছে; বিদ্যমান account স্বয়ংক্রিয়ভাবে পরিবর্তন করা হয়নি');
  }

  const admin = await User.create({
    name: account.data.name,
    email: account.data.email,
    phone: account.data.phone,
    password: account.data.password,
    role: 'admin',
  });
  console.log(`Admin account তৈরি হয়েছে: ${admin.email}`);
} finally {
  await mongoose.disconnect();
}
