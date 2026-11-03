import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const bidSchema = new Schema({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true,
  },
  runnerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  proposedPrice: {
    type: Number,
    required: true,
    min: 1,
    max: 500000,
    validate: {
      validator: Number.isInteger,
      message: 'The proposed price must be a whole number.',
    },
  },
  deliveryTime: {
    type: Number,
    required: true,
    min: 1,
    max: 10080,
    validate: {
      validator: Number.isInteger,
      message: 'Enter the delivery time in full minutes.',
    },
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
  versionKey: false,
});

bidSchema.index({ taskId: 1, runnerId: 1 }, { unique: true });
bidSchema.index({ taskId: 1, status: 1, createdAt: 1 });

export default model('Bid', bidSchema);
