const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const exist = await User.findOne({ email: email.toLowerCase() });
    if (exist) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const usr = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hash,
      role: 'customer'
    });

    await usr.save();

    const token = jwt.sign(
      { id: usr._id, role: usr.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '7d' }
    );

    const safe = usr.toObject();
    delete safe.password;

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: { user: safe, token }
    });
  } catch (err) {
    next(err);
  }
};

const registerStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, adminSecretKey } = req.body;

    const secret = process.env.ADMIN_SECRET_KEY || 'admin_staff_secret_key_123';
    if (adminSecretKey !== secret) {
      return res.status(403).json({ success: false, message: 'Invalid admin secret key' });
    }

    if (!['pharmacist', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be pharmacist or admin' });
    }

    const exist = await User.findOne({ email: email.toLowerCase() });
    if (exist) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const usr = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hash,
      role
    });

    await usr.save();

    const token = jwt.sign(
      { id: usr._id, role: usr.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '7d' }
    );

    const safe = usr.toObject();
    delete safe.password;

    return res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      data: { user: safe, token }
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const usr = await User.findOne({ email: email.toLowerCase() });
    if (!usr) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, usr.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: usr._id, role: usr.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '7d' }
    );

    const safe = usr.toObject();
    delete safe.password;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: safe, token }
    });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user
  });
};

module.exports = { register, registerStaff, login, getProfile };
