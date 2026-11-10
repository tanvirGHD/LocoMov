import mongoose from 'mongoose';

const visitorStatSchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    unique: true,
    index: true,
  },
  totalVisits: {
    type: Number,
    default: 0,
  },
  uniqueIps: [{
    type: String,
  }],
}, {
  timestamps: true,
  versionKey: false,
});

export default mongoose.model('VisitorStat', visitorStatSchema);

