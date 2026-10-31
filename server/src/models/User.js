import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'নাম লিখুন'],
    trim: true,
    minlength: [2, 'নাম অন্তত ২ অক্ষরের হতে হবে'],
    maxlength: [80, 'নাম ৮০ অক্ষরের বেশি হতে পারবে না'],
  },
  email: {
    type: String,
    required: [true, 'ইমেইল লিখুন'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    index: true,
  },
  phone: {
    type: String,
    required: [true, 'ফোন নম্বর লিখুন'],
    unique: true,
    trim: true,
    set(value) {
      const digits = value.replace(/[^\d+]/g, '');
      if (/^01[3-9]\d{8}$/.test(digits)) return `+88${digits}`;
      if (/^8801[3-9]\d{8}$/.test(digits)) return `+${digits}`;
      return digits;
    },
    validate: {
      validator: (value) => /^\+8801[3-9]\d{8}$/.test(value),
      message: 'বাংলাদেশের সঠিক মোবাইল নম্বর দিন',
    },
    index: true,
  },
  password: {
    type: String,
    required: [true, 'পাসওয়ার্ড লিখুন'],
    minlength: [8, 'পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে'],
    maxlength: 128,
    select: false,
  },
  role: {
    type: String,
    enum: ['customer', 'runner', 'admin'],
    default: 'customer',
    required: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  trustScore: {
    type: Number,
    min: 0,
    max: 100,
    default() {
      return this.role === 'runner' ? 100 : 0;
    },
  },
  runnerLimit: {
    type: Number,
    min: 0,
    max: 5000,
    default() {
      return this.role === 'runner' ? 500 : 0;
    },
  },
}, {
  timestamps: true,
  versionKey: false,
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.verifyPassword = function verifyPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default model('User', userSchema);
