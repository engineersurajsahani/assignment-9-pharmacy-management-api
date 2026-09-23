const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate a signed JWT for a user
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Register a new customer
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const registerCustomer = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const user = await User.create({ name, email, password, role: 'customer' });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    // Mongoose duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/register-staff
// @desc    Register a pharmacist or admin (requires ADMIN_KEY)
// @access  Public (but guarded by ADMIN_KEY)
// ─────────────────────────────────────────────────────────────────────────────
const registerStaff = async (req, res) => {
  try {
    const { name, email, password, role, adminKey } = req.body;

    // Validate admin key
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or missing admin key. Staff registration is not authorized.',
      });
    }

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required.',
      });
    }

    // Only allow pharmacist or admin roles via this endpoint
    if (!['pharmacist', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "pharmacist" or "admin".',
      });
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const user = await User.create({ name, email, password, role });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully.`,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error during staff registration.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Login with email and password, returns JWT
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Find user (include password for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user);

    // Remove password from response
    const userObj = user.toJSON();

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userObj,
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/auth/profile
// @desc    Get the authenticated user's profile
// @access  Private (JWT required)
// ─────────────────────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    // req.user is already attached by protect middleware (without password)
    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error fetching profile.',
      error: error.message,
    });
  }
};

module.exports = { registerCustomer, registerStaff, login, getProfile };
