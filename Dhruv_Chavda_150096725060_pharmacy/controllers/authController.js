const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate signed JWT Token
 */
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'super_secret_pharmacy_jwt_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Register a new customer
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
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
        message: 'A user with this email already exists'
      });
    }

    // Role is strictly Customer for public registration
    const user = await User.create({
      name,
      email,
      password,
      role: 'Customer'
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
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register staff member (Pharmacist or Admin) using secret key or admin authorization
// @route   POST /api/auth/register-staff
// @access  Restricted (Admin Key / Admin Token)
exports.registerStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, adminSecretKey } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and staff role (Pharmacist or Admin)'
      });
    }

    const targetRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    if (!['Pharmacist', 'Admin'].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff role. Permitted roles: Pharmacist, Admin'
      });
    }

    // Verify admin authorization: Either valid adminSecretKey in body OR an authenticated Admin
    const configuredKey = process.env.ADMIN_SECRET_KEY || 'admin_pharmacy_secret_2026';
    const isSecretValid = adminSecretKey && adminSecretKey === configuredKey;
    const isAdminUser = req.user && req.user.role === 'Admin';

    if (!isSecretValid && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Valid adminSecretKey or Admin authorization required to register staff'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: targetRole
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: `${targetRole} registered successfully`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Select password field for verification
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
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
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};
