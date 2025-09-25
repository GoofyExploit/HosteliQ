const Student = require('../models/Student');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Register a new student
const registerStudent = async (req, res) => {
  try {
    const {
      studentId,
      firstName,
      lastName,
      email,
      phone,
      password,
      course,
      year,
      gender
    } = req.body;

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [{ email }, { studentId }]
    });

    if (existingStudent) {
      return res.status(400).json({
        error: 'Student with this email or student ID already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create student
    const student = await Student.create({
      studentId,
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      course,
      year,
      gender
    });

    // Generate token
    const token = generateToken(student._id);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: {
        student: {
          id: student._id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          course: student.course,
          year: student.year,
          gender: student.gender
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Student login
const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find student by email
    const student = await Student.findOne({ email }).select('+password');
    
    if (!student) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, student.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(student._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        student: {
          id: student._id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          course: student.course,
          year: student.year,
          gender: student.gender,
          roomId: student.roomId
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// FIXED: Get all students with room information populated
const getStudents = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      course, 
      year, 
      gender,
      hasRoom 
    } = req.query;
    
    let query = {};
    
    if (course) {
      query.course = new RegExp(course, 'i');
    }
    
    if (year) {
      query.year = year;
    }
    
    if (gender) {
      query.gender = gender;
    }
    
    if (hasRoom !== undefined) {
      query.roomId = hasRoom === 'true' ? { $ne: null } : null;
    }

    console.log('🔍 Student query:', query);

    // CRITICAL FIX: Populate room information
    const students = await Student.find(query)
      .populate({
        path: 'roomId',
        select: 'roomNumber floor roomType rent status currentOccupancy capacity'
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Student.countDocuments(query);

    console.log(`👥 Found ${students.length} students`);
    console.log('📊 Students with rooms:', students.filter(s => s.roomId).length);
    console.log('📊 Students without rooms:', students.filter(s => !s.roomId).length);

    res.json({
      success: true,
      data: students,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get student by ID with room information
const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate({
        path: 'roomId',
        select: 'roomNumber floor roomType rent facilities status'
      });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update student information
const updateStudent = async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove sensitive fields from updates
    delete updates.password;
    delete updates.studentId; // Don't allow student ID changes
    
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate({
      path: 'roomId',
      select: 'roomNumber floor roomType rent'
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('roomId');
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // If student has a room assignment, clean it up
    if (student.roomId) {
      const Room = require('../models/Room');
      const room = await Room.findById(student.roomId);
      
      if (room) {
        // Remove student from room
        room.students = room.students.filter(id => !id.equals(student._id));
        room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
        
        if (room.currentOccupancy < room.capacity) {
          room.status = 'Available';
        }
        
        await room.save();
        console.log(`🗑️ Removed student ${student.studentId} from room ${room.roomNumber}`);
      }
      
      // Also clean up any active bookings
      const Booking = require('../models/Booking');
      await Booking.deleteMany({ 
        studentId: student._id,
        status: { $in: ['Pending', 'Approved', 'Active'] }
      });
    }

    await Student.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get student statistics
const getStudentStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    
    const yearStats = await Student.aggregate([
      {
        $group: {
          _id: '$year',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const genderStats = await Student.aggregate([
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const studentsWithRooms = await Student.countDocuments({ roomId: { $ne: null } });
    const studentsWithoutRooms = totalStudents - studentsWithRooms;

    res.json({
      success: true,
      data: {
        totalStudents,
        yearBreakdown: yearStats,
        genderBreakdown: genderStats,
        roomAssignments: {
          assigned: studentsWithRooms,
          unassigned: studentsWithoutRooms
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getStudentStats
};