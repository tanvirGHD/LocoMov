import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const auditLogSchema = new Schema({
  actor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
    index: true,
  },
  targetType: {
    type: String,
    required: true,
    enum: ['task', 'user', 'review', 'message', 'conversation', 'report'],
    index: true,
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  versionKey: false,
});

auditLogSchema.index({ createdAt: -1 });

export default model('AuditLog', auditLogSchema);
