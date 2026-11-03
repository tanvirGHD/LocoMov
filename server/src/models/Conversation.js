import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const conversationSchema = new Schema({
  job: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  participants: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    required: true,
    validate: {
      validator(value) {
        return Array.isArray(value) && value.length === 2 && new Set(value.map(String)).size === 2;
      },
      message: 'A conversation must include exactly two participants.',
    },
  },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCount: {
    type: Map,
    of: Number,
    default: {},
  },
  status: {
    type: String,
    enum: ['active', 'read_only'],
    default: 'active',
  },
  mutedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  blockedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
}, {
  timestamps: true,
  versionKey: false,
});

conversationSchema.index({ job: 1 }, { unique: true });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export default model('Conversation', conversationSchema);
