const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Approved', 'Rejected', 'Active', 'Completed'],
    default: 'Pending'
  },
  duration: {
    type: String,
    required: true,
    enum: ['Semester', 'Academic Year', 'Summer', 'Custom']
  },
  rent: {
    type: Number,
    required: true
  },
  securityDeposit: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['Pending', 'Paid', 'Partial', 'Refunded'],
    default: 'Pending'
  },
  notes: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
bookingSchema.index({ studentId: 1, status: 1 });
bookingSchema.index({ roomId: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
