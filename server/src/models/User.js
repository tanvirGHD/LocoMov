import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [80, 'Name cannot exceed 80 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    index: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
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
      message: 'Please enter a valid Bangladeshi mobile number',
    },
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
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
  avatarUrl: {
    type: String,
    default: '',
    trim: true,
  },
  area: {
    type: String,
    default: '',
    trim: true,
    maxlength: [120, 'Area cannot exceed 120 characters'],
  },
  age: {
    type: Number,
    min: [18, 'Must be at least 18 years old'],
    max: [120, 'Please enter a valid age'],
    default: null,
  },
  emergencyContact: {
    type: String,
    default: '',
    trim: true,
    maxlength: [20, 'Emergency contact number is too long'],
  },
  locationCoordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
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
    max: 500000,
    default() {
      return this.role === 'runner' ? 50000 : 0;
    },
  },
  avgRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 5.0,
  },
  reviewCount: {
    type: Number,
    min: 0,
    default: 0,
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
