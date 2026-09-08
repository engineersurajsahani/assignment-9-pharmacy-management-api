const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate signed JWT token
 * @param {Object} user - User document
 * @returns {string} Signed JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '24h'
    }
  );
};

/**
 * @desc    Register a new customer account
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerCustomer = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address is already registered.'
      });
    }

    // Force role to 'customer' for standard registration (prevent privilege escalation)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'customer'
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully.',
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

/**
 * @desc    Register staff account (Pharmacist / Admin) using secret admin key
 * @route   POST /api/auth/register-staff
 * @access  Public (Requires valid ADMIN_REGISTRATION_KEY)
 */
const registerStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, adminKey } = req.body;
    const providedKey = adminKey || req.headers['x-admin-key'];

    // Validate admin registration key
    const configuredKey = process.env.ADMIN_REGISTRATION_KEY;
    if (!configuredKey || !providedKey || providedKey !== configuredKey) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid or missing admin registration key. Staff onboarding is restricted.'
      });
    }

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and target role (pharmacist or admin).'
      });
    }

    // Validate permitted staff roles
    const allowedStaffRoles = ['pharmacist', 'admin'];
    if (!allowedStaffRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid staff role '${role}'. Allowed roles: 'pharmacist', 'admin'.`
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address is already registered.'
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role.toLowerCase()
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: `Staff account (${user.role}) registered successfully.`,
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

/**
 * @desc    Authenticate user & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    // Find user and explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Verify password match using bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
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

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/profile
 * @access  Authenticated (Customer, Pharmacist, Admin)
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerCustomer,
  registerStaff,
  login,
  getProfile
};
