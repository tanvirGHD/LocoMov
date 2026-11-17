import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

if (process.env.NODE_ENV !== 'development') throw new Error('Demo accounts can only be created when NODE_ENV=development.');
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing from the environment.');
const accounts = [
  { name: 'Demo Customer', email: process.env.DEMO_CUSTOMER_EMAIL, phone: process.env.DEMO_CUSTOMER_PHONE, password: process.env.DEMO_CUSTOMER_PASSWORD, role: 'customer' },
  { name: 'Demo Runner', email: process.env.DEMO_RUNNER_EMAIL, phone: process.env.DEMO_RUNNER_PHONE, password: process.env.DEMO_RUNNER_PASSWORD, role: 'runner' },
].filter((account) => account.email && account.phone && account.password);
if (!accounts.length) throw new Error('Development demo account variables are not configured.');

try {
  await mongoose.connect(process.env.MONGO_URI);
  for (const account of accounts) {
    if (await User.exists({ $or: [{ email: account.email.toLowerCase() }, { phone: account.phone }] })) continue;
    await User.create({ ...account, email: account.email.toLowerCase(), verificationStatus: account.role === 'runner' ? 'pending' : 'approved' });
    console.log(`Created development ${account.role} demo account.`);
  }
} finally {
  await mongoose.disconnect();
}
