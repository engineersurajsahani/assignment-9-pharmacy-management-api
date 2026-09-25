const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT Token
const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET || 'super_secret_pharmacy_jwt_key_pratik_swain_2026';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ id, role }, secret, { expiresIn });
};

/**
 * @desc    Register a new Customer account
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerCustomer = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address is already registered'
      });
    }

    // Strict role enforcement: Customer
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

/**
 * @desc    Register Staff member (Pharmacist or Admin) using Admin Key
 * @route   POST /api/auth/register-staff
 * @access  Protected by Admin Registration Key
 */
const registerStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, adminKey } = req.body;
    const providedKey = adminKey || req.headers['x-admin-key'];
    const requiredKey = process.env.ADMIN_REGISTRATION_KEY || 'admin_secret_key_12345';

    // Verify admin secret key
    if (!providedKey || providedKey !== requiredKey) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid or missing admin registration key'
      });
    }

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role (Pharmacist or Admin)'
      });
    }

    const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    if (!['Pharmacist', 'Admin'].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff role. Allowed roles are: Pharmacist, Admin'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address is already registered'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: normalizedRole
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: `${normalizedRole} registered successfully`,
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
 * @desc    Login user & return JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Check for user and explicitly select password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
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

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
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
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/profile
 * @access  Private (All authenticated roles)
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user
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
