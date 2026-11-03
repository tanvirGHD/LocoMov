// Run: node clearStaleOtps.mjs  (from the server/ directory)
import { createDecipheriv, createHash } from 'crypto';
import mongoose from 'mongoose';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URI = 'mongodb+srv://LocoMuv:jH0zLa5XSZ6efIEE@cluster0.y15rh.mongodb.net/LocoMuv?retryWrites=true&w=majority';
const OTP_SECRET = 'locomuv-otp-secret-change-me';

function currentKey() {
  return createHash('sha256').update('ParaSync OTP encryption key v1:').update(OTP_SECRET).digest();
}

function canDecrypt(encrypted) {
  try {
    const [iv, tag, ciphertext] = encrypted.split('.');
    if (!iv || !tag || !ciphertext) return false;
    const decipher = createDecipheriv('aes-256-gcm', currentKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]);
    return true;
  } catch (_) {
    return false;
  }
}

async function run() {
  console.log('Connecting to Atlas...');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('Connected.');

  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');
  const tasks = await Task.find({
    $or: [
      { pickupOTP: { $exists: true, $ne: null } },
      { deliveryOTP: { $exists: true, $ne: null } }
    ]
  }).lean();

  console.log(`Found ${tasks.length} tasks with OTP fields.`);
  let cleared = 0;

  for (const task of tasks) {
    const unset = {};
    if (task.pickupOTP && !canDecrypt(task.pickupOTP)) {
      unset.pickupOTP = '';
      console.log(`  Task ${task._id}: clearing bad pickupOTP`);
    }
    if (task.deliveryOTP && !canDecrypt(task.deliveryOTP)) {
      unset.deliveryOTP = '';
      console.log(`  Task ${task._id}: clearing bad deliveryOTP`);
    }
    if (Object.keys(unset).length > 0) {
      await Task.updateOne({ _id: task._id }, { $unset: unset });
      cleared++;
    }
  }

  console.log(`Done. Cleared stale OTPs from ${cleared} task(s).`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error('Error:', err.message); process.exit(1); });

