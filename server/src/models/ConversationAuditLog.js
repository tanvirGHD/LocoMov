import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const conversationAuditLogSchema = new Schema({
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  task: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    default: null,
    index: true,
  },
  viewer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ['view'],
    default: 'view',
  },
  reason: {
    type: String,
    trim: true,
    default: 'dispute_or_report',
  },
  createdAt: { type: Date, default: Date.now },
}, {
  versionKey: false,
});

export default model('ConversationAuditLog', conversationAuditLogSchema);
