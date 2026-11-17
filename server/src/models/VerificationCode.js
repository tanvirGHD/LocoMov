import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  subject: { type: String, required: true, index: true },
  purpose: { type: String, required: true, enum: ['login', 'register_email', 'register_phone', 'forgot_password', 'change_email', 'change_phone'] },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  payload: { type: mongoose.Schema.Types.Mixed, default: null },
  hash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
schema.index({ subject: 1, purpose: 1 }, { unique: true });
export default mongoose.model('VerificationCode', schema);
