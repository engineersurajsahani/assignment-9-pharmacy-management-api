const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'fallback_secret_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

// @desc    Register a Customer account
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    // Always enforce customer role for public registration
    const user = await User.create({
      name,
      email,
      password,
      role: 'customer',
      phone,
      address
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register Staff (Pharmacist / Admin) using Admin Key or Admin auth
// @route   POST /api/auth/register-staff
// @access  Protected by Admin Key / Admin auth
const registerStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, adminKey, phone, address } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role.'
      });
    }

    const normalizedRole = role.toLowerCase();
    if (!['pharmacist', 'admin'].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff role. Allowed roles are 'pharmacist' or 'admin'."
      });
    }

    // Check if admin authorization is provided via Admin Key or Authenticated Admin
    const configuredAdminKey = process.env.ADMIN_SECRET_KEY || 'AdminPharmacySecretKey2026!';
    const hasValidAdminKey = adminKey && adminKey === configuredAdminKey;
    const isAuthAdmin = req.user && req.user.role && req.user.role.toLowerCase() === 'admin';

    if (!hasValidAdminKey && !isAuthAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Valid admin key or Admin authentication required to register staff.'
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: normalizedRole,
      phone,
      address
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} registered successfully.`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user & get JWT token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    // Find user by email (include password for verification)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Authenticated (Customer, Pharmacist, Admin)
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  registerStaff,
  login,
  getProfile
};
