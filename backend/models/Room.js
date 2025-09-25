const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
    unique: true
  },
  floor: {
    type: Number,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    default: 2
  },
  currentOccupancy: {
    type: Number,
    default: 0
  },
  roomType: {
    type: String,
    required: true,
    enum: ['Single', 'Double', 'Triple', 'Quad']
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Mixed']
  },
  rent: {
    type: Number,
    required: true
  },
  facilities: [{
    type: String,
    enum: ['AC', 'WiFi', 'Attached Bathroom', 'Balcony', 'Study Table', 'Wardrobe']
  }],
  status: {
    type: String,
    required: true,
    enum: ['Available', 'Occupied', 'Maintenance', 'Reserved'],
    default: 'Available'
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Virtual to check if room is full
roomSchema.virtual('isFull').get(function() {
  return this.currentOccupancy >= this.capacity;
});

// Virtual to get available spots
roomSchema.virtual('availableSpots').get(function() {
  return this.capacity - this.currentOccupancy;
});

module.exports = mongoose.model('Room', roomSchema);
