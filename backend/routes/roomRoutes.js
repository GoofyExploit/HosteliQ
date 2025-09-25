const express = require('express');
const { body } = require('express-validator');
const {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  getRoomStats
} = require('../controllers/roomController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const roomValidation = [
  body('roomNumber').notEmpty().withMessage('Room number is required'),
  body('floor').isInt({ min: 0 }).withMessage('Floor must be a valid number'),
  body('capacity').isInt({ min: 1, max: 4 }).withMessage('Capacity must be between 1 and 4'),
  body('roomType').isIn(['Single', 'Double', 'Triple', 'Quad']).withMessage('Invalid room type'),
  body('gender').isIn(['Male', 'Female', 'Mixed']).withMessage('Gender must be Male, Female, or Mixed'),
  body('rent').isNumeric().withMessage('Rent must be a valid number')
];

// ALL ROUTES PUBLIC (NO AUTH REQUIRED) - For development/testing
router.get('/', getRooms);
router.get('/stats', getRoomStats);
router.get('/:id', getRoom);
router.post('/', roomValidation, createRoom); // REMOVED PROTECT - NOW PUBLIC
router.put('/:id', updateRoom); // REMOVED PROTECT - NOW PUBLIC
router.delete('/:id', deleteRoom); // REMOVED PROTECT - NOW PUBLIC

module.exports = router;