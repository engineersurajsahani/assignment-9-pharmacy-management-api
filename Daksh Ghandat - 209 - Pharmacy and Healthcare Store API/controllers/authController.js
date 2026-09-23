const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Generate a JWT containing userId and role
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// @desc   Register a CUSTOMER account (public)
// @route  POST /api/auth/register
const registerCustomer = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic input validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password.",
      });
    }

    // Check if the email is already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // ALWAYS force role = customer. Ignore any role sent by the client
    // so a user can never self-register as admin/pharmacist.
    const user = await User.create({
      name,
      email,
      password,
      role: "customer",
    });

    return res.status(201).json({
      success: true,
      message: "Customer account created successfully.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Register a staff account (pharmacist/admin) - requires ADMIN_KEY
// @route  POST /api/auth/register-staff
const registerStaff = async (req, res) => {
  try {
    const { name, email, password, role, adminKey } = req.body;

    // Verify the admin key
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Invalid admin key.",
      });
    }

    // Only pharmacist and admin roles are allowed for staff registration
    if (!role || !["pharmacist", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either 'pharmacist' or 'admin'.",
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({ name, email, password, role });

    return res.status(201).json({
      success: true,
      message: `${role} account created successfully.`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Login a user and return a JWT
// @route  POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password.",
      });
    }

    // Find the user, including password field for comparison
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Compare the plain password with the stored hash
    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Get the logged-in user's profile
// @route  GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    // req.user is attached by the protect middleware and already excludes password
    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully.",
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  registerCustomer,
  registerStaff,
  login,
  getProfile,
};