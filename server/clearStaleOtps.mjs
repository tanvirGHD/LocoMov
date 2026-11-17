// Run: node clearStaleOtps.mjs  (from the server/ directory)
import 'dotenv/config';
import { createDecipheriv, createHash } from 'crypto';
import mongoose from 'mongoose';

const { MONGO_URI, OTP_SECRET, JWT_SECRET } = process.env;
const encryptionSecret = OTP_SECRET || JWT_SECRET;

if (!MONGO_URI) throw new Error('MONGO_URI is missing from server/.env.');
if (!encryptionSecret) throw new Error('OTP_SECRET or JWT_SECRET is missing from server/.env.');

function currentKey() {
  return createHash('sha256').update('ParaSync OTP encryption key v1:').update(encryptionSecret).digest();
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

run().catch((err) => {
  const reason = err?.code || err?.name || 'UnknownError';
  console.error(`Could not process stale OTPs (${reason}). Check Atlas DNS/network access and database permissions.`);
  process.exit(1);
});

