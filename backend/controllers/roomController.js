const Room = require('../models/Room');
const Student = require('../models/Student');

// Create new room
const createRoom = async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all rooms
const getRooms = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      roomType, 
      gender, 
      available, 
      floor 
    } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (roomType) query.roomType = roomType;
    if (gender) query.gender = gender;
    if (floor) query.floor = floor;
    if (available === 'true') {
      query.status = 'Available';
      query.$expr = { $lt: ['$currentOccupancy', '$capacity'] };
    }

    const rooms = await Room.find(query)
      .populate('students', 'firstName lastName studentId email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ floor: 1, roomNumber: 1 });

    const total = await Room.countDocuments(query);

    res.json({
      success: true,
      data: rooms,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get room by ID
const getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('students', 'firstName lastName studentId email phone course year');
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update room
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: room
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete room
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.currentOccupancy > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete room with current occupants' 
      });
    }

    await Room.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get room statistics
const getRoomStats = async (req, res) => {
  try {
    const stats = await Room.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          totalOccupancy: { $sum: '$currentOccupancy' }
        }
      }
    ]);

    const totalRooms = await Room.countDocuments();
    const occupancyRate = await Room.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity' },
          totalOccupancy: { $sum: '$currentOccupancy' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalRooms,
        statusBreakdown: stats,
        occupancyRate: occupancyRate ? 
          ((occupancyRate.totalOccupancy / occupancyRate.totalCapacity) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  getRoomStats
};
