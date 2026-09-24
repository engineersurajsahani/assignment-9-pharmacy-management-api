const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate signed JWT
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, id: userId, role },
    process.env.JWT_SECRET || 'default_secret_key',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// @desc    Register a new customer
// @route   POST /api/auth/register
// @access  Public
exports.registerCustomer = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Always enforce 'customer' role for public registration
    const user = await User.create({
      name,
      email,
      password,
      role: 'customer',
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register staff account (pharmacist or admin) using admin registration key
// @route   POST /api/auth/register-staff
// @access  Public (Protected via ADMIN_REGISTRATION_KEY)
exports.registerStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, adminKey } = req.body;
    const providedKey = adminKey || req.headers['x-admin-key'];

    const expectedAdminKey = process.env.ADMIN_REGISTRATION_KEY || 'admin_secret_key_12345';

    if (!providedKey || providedKey !== expectedAdminKey) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or missing admin registration key',
      });
    }

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role (pharmacist or admin)',
      });
    }

    if (!['pharmacist', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff role. Role must be either 'pharmacist' or 'admin'",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: `Staff account (${role}) registered successfully`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get JWT token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Explicitly select password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password match
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private (All authenticated roles)
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
