import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null,
    index: true,
  },
  task: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    default: null,
    index: true,
  },
  kind: {
    type: String,
    enum: ['message', 'status', 'system', 'safety_flag', 'dispute', 'review'],
    default: 'system',
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  link: {
    type: String,
    default: '',
    maxlength: 500,
  },
  readAt: {
    type: Date,
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
}, {
  versionKey: false,
});

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

export default model('Notification', notificationSchema);
