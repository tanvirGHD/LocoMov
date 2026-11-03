import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const messageSchema = new Schema({
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  clientId: {
    type: String,
    default: null,
    index: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'system'],
    default: 'text',
    index: true,
  },
  text: {
    type: String,
    trim: true,
    maxlength: 3000,
    default: '',
  },
  imageUrl: { type: String, default: '' },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent',
  },
  createdAt: { type: Date, default: Date.now },
}, {
  versionKey: false,
});

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, clientId: 1 });

export default model('Message', messageSchema);
