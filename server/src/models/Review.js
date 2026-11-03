import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const reviewSchema = new Schema({
  task: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true,
  },
  reviewer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  reviewee: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer between 1 and 5.',
    },
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  versionKey: false,
});

reviewSchema.index({ task: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, createdAt: -1 });

export default model('Review', reviewSchema);

