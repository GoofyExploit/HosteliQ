const express = require('express');
const { body } = require('express-validator');
const {
  registerStudent,
  loginStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('course').notEmpty().withMessage('Course is required'),
  body('year').isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// ALL ROUTES PUBLIC (NO AUTH REQUIRED) - For development/testing
router.post('/register', registerValidation, registerStudent); // REMOVED PROTECT - NOW PUBLIC
router.post('/login', loginValidation, loginStudent);
router.get('/', getStudents);
router.get('/:id', getStudent);
router.put('/:id', updateStudent); // REMOVED PROTECT - NOW PUBLIC
router.delete('/:id', deleteStudent); // REMOVED PROTECT - NOW PUBLIC

module.exports = router;