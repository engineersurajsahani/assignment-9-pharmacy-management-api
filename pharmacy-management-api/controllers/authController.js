const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function createUser({ name, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  return User.create({ name, email, password: hashedPassword, role });
}

/**
 * POST /api/auth/register — public, always creates a "customer"
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email and password are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await createUser({ name, email, password, role: 'customer' });
    const token = signToken(user);

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: { user: safeUser, token }
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/auth/register-staff — public, but requires ADMIN_REGISTRATION_KEY.
 * Creates either a "pharmacist" or "admin" account based on requestedRole.
 */
async function registerStaff(req, res) {
  try {
    const { name, email, password, requestedRole, adminKey } = req.body;

    if (!name || !email || !password || !requestedRole || !adminKey) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password, requestedRole and adminKey are required'
      });
    }
    if (adminKey !== process.env.ADMIN_REGISTRATION_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid admin registration key' });
    }
    if (!['pharmacist', 'admin'].includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: "requestedRole must be either 'pharmacist' or 'admin'"
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await createUser({ name, email, password, role: requestedRole });
    const token = signToken(user);

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(201).json({
      success: true,
      message: `${requestedRole} registered successfully`,
      data: { user: safeUser, token }
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/auth/login — public
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user);
    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: safeUser, token }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/auth/profile — authenticated
 */
async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { register, registerStaff, login, getProfile };
