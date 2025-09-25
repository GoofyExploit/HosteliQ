const express = require('express');
const { body } = require('express-validator');
const {
  createBooking,
  getBookings,
  getBooking,
  updateBookingStatus,
  deleteBooking,
  getBookingStats
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const bookingValidation = [
  body('studentId').isMongoId().withMessage('Valid student ID is required'),
  body('roomId').isMongoId().withMessage('Valid room ID is required'),
  body('duration').isIn(['Semester', 'Academic Year', 'Summer', 'Custom']).withMessage('Invalid duration')
];

const statusValidation = [
  body('status').isIn(['Pending', 'Approved', 'Rejected', 'Active', 'Completed']).withMessage('Invalid status')
];

// ALL ROUTES PUBLIC (NO AUTH REQUIRED) - For development/testing
router.get('/', getBookings);
router.get('/stats', getBookingStats);
router.get('/:id', getBooking);
router.post('/', bookingValidation, createBooking); // REMOVED PROTECT - NOW PUBLIC
router.put('/:id/status', statusValidation, updateBookingStatus); // REMOVED PROTECT - NOW PUBLIC
router.delete('/:id', deleteBooking); // REMOVED PROTECT - NOW PUBLIC

module.exports = router;