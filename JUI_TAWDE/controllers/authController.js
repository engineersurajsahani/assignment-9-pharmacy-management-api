const jwt = require('jsonwebtoken');
const User = require('../models/User');

const createToken = (user) => jwt.sign(
  { id: user._id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role: 'customer' });
    res.status(201).json({
      message: 'Customer registered successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token: createToken(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.registerStaff = async (req, res) => {
  try {
    const { name, email, password, role, adminKey } = req.body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ message: 'Invalid admin key' });
    }

    if (!['admin', 'pharmacist'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or pharmacist' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role });
    res.status(201).json({
      message: 'Staff user registered successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token: createToken(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token: createToken(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
