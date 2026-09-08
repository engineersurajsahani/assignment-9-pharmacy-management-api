const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// @desc    Register a new customer account
// @route   POST /api/auth/register
// @access  Public
const registerCustomer = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'customer' // Enforce customer role
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Customer account registered successfully',
      token,
      user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Register staff account (Pharmacist / Admin)
// @route   POST /api/auth/register-staff
// @access  Public (Protected by Admin Key)
const registerStaff = async (req, res) => {
  try {
    const { name, email, password, role, adminSecretKey } = req.body;
    const keyFromHeader = req.headers['x-admin-key'];
    const providedKey = adminSecretKey || keyFromHeader;

    const expectedKey = process.env.ADMIN_SECRET_KEY || 'admin_secret_pharmacy_2026';

    if (!providedKey || providedKey !== expectedKey) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Valid adminSecretKey is required for staff registration.'
      });
    }

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and staff role (pharmacist or admin)'
      });
    }

    if (!['pharmacist', 'admin'].includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff role. Role must be either pharmacist or admin.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role.toLowerCase()
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: `Staff account (${user.role}) registered successfully`,
      token,
      user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Login user & return JWT
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/profile
// @access  Private (Authenticated)
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

module.exports = {
  registerCustomer,
  registerStaff,
  login,
  getProfile
};
