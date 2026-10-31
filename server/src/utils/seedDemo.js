import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';

const mongoUri = process.env.MONGO_URI;
if (process.env.NODE_ENV === 'production') {
  throw new Error('Production environment-এ demo account তৈরি করা যাবে না');
}
if (!mongoUri) throw new Error('MONGO_URI .env ফাইলে নেই');

const databaseHost = new URL(mongoUri).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(databaseHost)) {
  throw new Error('Demo account শুধু local MongoDB-তে তৈরি করা যাবে; MONGO_URI localhost-এ সেট করুন');
}

const demoAccounts = [
  { name: 'Demo Customer', email: 'customer@gmail.com', phone: '01712345671', password: 'customer', role: 'customer' },
  { name: 'Demo Runner', email: 'runner@gmail.com', phone: '01812345672', password: 'runner12', role: 'runner' },
  { name: 'Demo Admin', email: 'admin@gmail.com', phone: '01912345673', password: 'admin123', role: 'admin' },
];

try {
  await mongoose.connect(mongoUri);
  for (const account of demoAccounts) {
    if (await User.exists({ $or: [{ email: account.email }, { phone: account.phone }] })) {
      throw new Error(`Demo account-এর email বা phone আগে থেকেই আছে: ${account.email}`);
    }
    const now = new Date();
    const password = await bcrypt.hash(account.password, 12);
    await User.collection.insertOne({
      name: account.name,
      email: account.email,
      phone: `+88${account.phone}`,
      password,
      role: account.role,
      isActive: true,
      trustScore: account.role === 'runner' ? 100 : 0,
      runnerLimit: account.role === 'runner' ? 500 : 0,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created ${account.role}: ${account.email}`);
  }
} finally {
  await mongoose.disconnect();
}
