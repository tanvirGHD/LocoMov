import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const pointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator(value) {
        return value.length === 2 &&
          Number.isFinite(value[0]) &&
          Number.isFinite(value[1]) &&
          value[0] >= -180 && value[0] <= 180 &&
          value[1] >= -90 && value[1] <= 90;
      },
      message: 'Longitude and latitude values must be valid.',
    },
  },
}, { _id: false });

const taskSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  runnerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long.'],
    maxlength: [120, 'Title must be no longer than 120 characters.'],
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: [5, 'Please add more task details.'],
    maxlength: [2000, 'Task details must be 2000 characters or fewer.'],
  },
  estimatedPrice: {
    type: Number,
    required: true,
    min: 1,
    max: 500000,
    validate: {
      validator: Number.isInteger,
      message: 'Estimated price must be a whole number.',
    },
  },
  finalPrice: {
    type: Number,
    default: null,
    min: 0,
    max: 500000,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked-up', 'in-transit', 'arriving', 'completed', 'cancelled', 'deleted'],
    default: 'pending',
    required: true,
    index: true,
  },
  pickupLocation: { type: pointSchema, required: true },
  deliveryLocation: { type: pointSchema, required: true },
  pickupAddress: { type: String, required: true, trim: true, maxlength: 240 },
  deliveryAddress: { type: String, required: true, trim: true, maxlength: 240 },
  pickupOTP: { type: String, select: false },
  deliveryOTP: { type: String, select: false },
  otpAttempts: { type: Number, default: 0, select: false },
  otpLockedUntil: { type: Date, default: null, select: false },
  disputeStatus: {
    type: String,
    enum: ['none', 'open', 'resolved'],
    default: 'none',
    index: true,
  },
  disputeReason: { type: String, trim: true, maxlength: 1000, default: '' },
  disputeBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  disputeResolution: { type: String, trim: true, maxlength: 1000, default: '' },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  cancellationReason: { type: String, trim: true, maxlength: 500, default: '' },
  hiddenForCustomer: { type: Boolean, default: false, index: true },
  customerRating: { type: Number, default: null },
  customerReviewComment: { type: String, trim: true, maxlength: 1000, default: '' },
  deletedAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  pickedUpAt: { type: Date, default: null },
  departedAt: { type: Date, default: null },
  arrivingAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
}, {
  timestamps: true,
  versionKey: false,
});

taskSchema.index({ pickupLocation: '2dsphere' });
taskSchema.index({ deliveryLocation: '2dsphere' });
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ customerId: 1, createdAt: -1 });
taskSchema.index({ runnerId: 1, status: 1, createdAt: -1 });
taskSchema.index({ customerId: 1, hiddenForCustomer: 1, createdAt: -1 });

export default model('Task', taskSchema);
