import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';

let memoryServer;

export async function ensureDemoUsers() {
  if (process.env.NODE_ENV === 'production') return;

  const demoAccounts = [
    { name: 'Demo Customer', email: 'customer@gmail.com', phone: '+8801712345671', password: 'customer', role: 'customer' },
    { name: 'Demo Runner', email: 'runner@gmail.com', phone: '+8801812345672', password: 'runner12', role: 'runner' },
    { name: 'Demo Admin', email: 'admin@gmail.com', phone: '+8801912345673', password: 'admin123', role: 'admin' },
  ];

  for (const account of demoAccounts) {
    const existing = await User.findOne({ $or: [{ email: account.email }, { phone: account.phone }] });

    if (!existing) {
      await User.create({
        name: account.name,
        email: account.email,
        phone: account.phone,
        password: account.password,
        role: account.role,
        isActive: true,
        trustScore: account.role === 'runner' ? 100 : 0,
        runnerLimit: account.role === 'runner' ? 50000 : 0,
      });
      continue;
    }

    const runnerLimitNeeded = account.role === 'runner' && (!existing.runnerLimit || existing.runnerLimit < 50000);
    const needsActivation = existing.isActive !== true || existing.role !== account.role || existing.name !== account.name || runnerLimitNeeded;
    if (needsActivation) {
      await User.updateOne({ _id: existing._id }, {
        $set: {
          name: account.name,
          role: account.role,
          isActive: true,
          trustScore: account.role === 'runner' ? 100 : existing.trustScore || 0,
          runnerLimit: account.role === 'runner' ? Math.max(50000, existing.runnerLimit || 0) : existing.runnerLimit || 0,
        },
      });
    }
  }
}

export async function connectDB() {
  const configuredUri = process.env.MONGO_URI;

  if (configuredUri) {
    try {
      console.log(`Connecting to configured MongoDB database...`);
      await mongoose.connect(configuredUri, {
        serverSelectionTimeoutMS: 15000,
      });
      console.log(`MongoDB connected successfully to ${configuredUri.includes('@') ? configuredUri.split('@')[1] : configuredUri}`);
      await ensureDemoUsers();
      return;
    } catch (error) {
      console.error(`MongoDB connection failed for configured MONGO_URI: ${error.message}`);
      if (configuredUri.includes('mongodb+srv://') || configuredUri.includes('mongodb.net')) {
        console.warn('CRITICAL: Atlas connection failed. Please check network/credentials/whitelist.');
      }
    }
  }

  const localUris = [
    'mongodb://127.0.0.1:27017/locomuv',
    'mongodb://localhost:27017/locomuv',
  ];

  for (const localUri of localUris) {
    try {
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
      console.log(`MongoDB connected via local instance: ${localUri}`);
      await ensureDemoUsers();
      return;
    } catch (error) {
      // local mongodb not running, try next
    }
  }

  if (process.env.NODE_ENV !== 'production' && !memoryServer) {
    console.warn('No persistent MongoDB instance available. Using in-memory fallback (data will reset on restart).');
    memoryServer = await MongoMemoryServer.create();
    await mongoose.connect(memoryServer.getUri());
    await ensureDemoUsers();
    console.log('MongoDB connected using in-memory fallback.');
    return;
  }

  throw new Error('MongoDB is unavailable and no persistent database is configured.');
}
