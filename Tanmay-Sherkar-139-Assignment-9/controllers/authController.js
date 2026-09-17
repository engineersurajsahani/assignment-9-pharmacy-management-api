const User = require('../models/User');
const { asyncHandler, AppError } = require('../utils/errors');

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.getSignedJwtToken();
  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new AppError('Please provide name, email and password', 400));
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new AppError('An account with this email already exists', 400));
  }

  const user = await User.create({ name, email, password, role: 'customer' });
  sendTokenResponse(user, 201, res, 'Customer account created');
});

const registerStaff = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return next(new AppError('Invalid admin key. Access denied.', 403));
  }

  const allowedRoles = ['pharmacist', 'admin'];
  if (!allowedRoles.includes(role)) {
    return next(
      new AppError("Role must be either 'pharmacist' or 'admin'", 400)
    );
  }

  if (!name || !email || !password) {
    return next(new AppError('Please provide name, email and password', 400));
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new AppError('An account with this email already exists', 400));
  }

  const user = await User.create({ name, email, password, role });
  sendTokenResponse(user, 201, res, `${role} account created`);
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password'
  );

  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError('Invalid credentials', 401));
  }

  sendTokenResponse(user, 200, res, 'Login successful');
});

const getProfile = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});

module.exports = { register, registerStaff, login, getProfile };