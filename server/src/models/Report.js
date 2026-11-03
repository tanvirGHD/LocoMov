import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const reportSchema = new Schema({
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  reporter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  reason: {
    type: String,
    trim: true,
    required: true,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ['open', 'reviewed'],
    default: 'open',
  },
  createdAt: { type: Date, default: Date.now },
}, {
  versionKey: false,
});

export default model('Report', reportSchema);
