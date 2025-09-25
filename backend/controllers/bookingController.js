const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Student = require('../models/Student');

// Create new booking
const createBooking = async (req, res) => {
  try {
    const { studentId, roomId, duration, startDate } = req.body;

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if student already has an active booking
    const existingBooking = await Booking.findOne({
      studentId,
      status: { $in: ['Pending', 'Approved', 'Active'] }
    });

    if (existingBooking) {
      return res.status(400).json({ 
        error: 'Student already has an active booking' 
      });
    }

    // Check if room exists and is available
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.isFull || room.status !== 'Available') {
      return res.status(400).json({ error: 'Room is not available' });
    }

    // Check gender compatibility
    if (room.gender !== 'Mixed' && room.gender !== student.gender) {
      return res.status(400).json({ 
        error: 'Room gender does not match student gender' 
      });
    }

    // Calculate total amount using actual room rent
    const monthlyRent = room.rent;
    const securityDeposit = monthlyRent * 1;
    
    let rentAmount = monthlyRent;
    switch(duration) {
      case 'Semester':
        rentAmount = monthlyRent * 6;
        break;
      case 'Academic Year':
        rentAmount = monthlyRent * 10;
        break;
      case 'Summer':
        rentAmount = monthlyRent * 3;
        break;
      case 'Custom':
        rentAmount = monthlyRent * 6;
        break;
    }
    
    const totalAmount = rentAmount + securityDeposit;

    console.log(`💰 Booking Calculation for Room ${room.roomNumber}:`);
    console.log(`📊 Monthly Rent: ₹${monthlyRent}`);
    console.log(`🛡️ Security Deposit: ₹${securityDeposit}`);
    console.log(`📅 Duration: ${duration}`);
    console.log(`💵 Rent Amount: ₹${rentAmount}`);
    console.log(`💸 Total Amount: ₹${totalAmount}`);

    // Create booking with correct amounts
    const booking = await Booking.create({
      studentId,
      roomId,
      duration,
      startDate: startDate || new Date(),
      rent: monthlyRent,
      securityDeposit,
      totalAmount
    });

    await booking.populate([
      { path: 'studentId', select: 'firstName lastName studentId email' },
      { path: 'roomId', select: 'roomNumber floor roomType rent' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all bookings
const getBookings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      studentId, 
      roomId 
    } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (studentId) query.studentId = studentId;
    if (roomId) query.roomId = roomId;

    const bookings = await Booking.find(query)
      .populate('studentId', 'firstName lastName studentId email course year')
      .populate('roomId', 'roomNumber floor roomType rent')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
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

// Get booking by ID
const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('studentId', 'firstName lastName studentId email phone course year')
      .populate('roomId', 'roomNumber floor roomType rent facilities');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// FIXED: Update booking status with proper room assignment
const updateBookingStatus = async (req, res) => {
  try {
    const { status, approvedBy, notes } = req.body;
    
    const booking = await Booking.findById(req.params.id)
      .populate('studentId')
      .populate('roomId');
      
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const oldStatus = booking.status;

    // Update booking
    booking.status = status;
    if (approvedBy) booking.approvedBy = approvedBy;
    if (notes) booking.notes = notes;
    
    // CRITICAL FIX: Properly handle room assignments
    if (status === 'Approved' && oldStatus !== 'Approved') {
      console.log(`🏠 Approving booking: Assigning student ${booking.studentId.studentId} to room ${booking.roomId.roomNumber}`);
      
      booking.approvedAt = new Date();
      
      // Update room occupancy and add student to room
      const room = booking.roomId;
      const student = booking.studentId;
      
      // Add student to room's students array if not already there
      if (!room.students.includes(student._id)) {
        room.students.push(student._id);
        room.currentOccupancy += 1;
      }
      
      // Update room status if full
      if (room.currentOccupancy >= room.capacity) {
        room.status = 'Occupied';
      }
      
      // CRITICAL: Assign room to student
      student.roomId = room._id;
      
      // Save all changes
      await room.save();
      await student.save();
      
      console.log(`✅ Student ${student.studentId} assigned to room ${room.roomNumber}`);
      console.log(`📊 Room ${room.roomNumber} occupancy: ${room.currentOccupancy}/${room.capacity}`);
    }
    
    // Handle booking rejection or cancellation
    if ((status === 'Rejected' || status === 'Cancelled') && oldStatus === 'Approved') {
      console.log(`❌ Booking rejected/cancelled: Removing student ${booking.studentId.studentId} from room ${booking.roomId.roomNumber}`);
      
      const room = booking.roomId;
      const student = booking.studentId;
      
      // Remove student from room
      room.students = room.students.filter(id => !id.equals(student._id));
      room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
      
      // Update room status
      if (room.currentOccupancy < room.capacity) {
        room.status = 'Available';
      }
      
      // Remove room assignment from student
      student.roomId = null;
      
      await room.save();
      await student.save();
      
      console.log(`✅ Student ${student.studentId} removed from room ${room.roomNumber}`);
    }

    await booking.save();

    // Re-populate for response
    await booking.populate([
      { path: 'studentId', select: 'firstName lastName studentId email roomId' },
      { path: 'roomId', select: 'roomNumber floor roomType rent currentOccupancy capacity' }
    ]);

    res.json({
      success: true,
      message: `Booking ${status.toLowerCase()} successfully`,
      data: booking
    });
  } catch (error) {
    console.error('Booking status update error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete booking
const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('studentId')
      .populate('roomId');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // If booking was approved, clean up room and student data
    if (booking.status === 'Approved' || booking.status === 'Active') {
      const room = booking.roomId;
      const student = booking.studentId;
      
      if (room && student) {
        // Remove student from room
        room.students = room.students.filter(id => !id.equals(student._id));
        room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
        
        if (room.currentOccupancy < room.capacity) {
          room.status = 'Available';
        }
        
        // Remove room assignment from student  
        student.roomId = null;
        
        await room.save();
        await student.save();
        
        console.log(`🗑️ Deleted booking: Student ${student.studentId} removed from room ${room.roomNumber}`);
      }
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get booking statistics
const getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalBookings = await Booking.countDocuments();
    const recentBookings = await Booking.find()
      .populate('studentId', 'firstName lastName studentId')
      .populate('roomId', 'roomNumber floor')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalBookings,
        statusBreakdown: stats,
        recentBookings
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBooking,
  updateBookingStatus,
  deleteBooking,
  getBookingStats
};