const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const STAFF_ROLES = ["pharmacist", "admin"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

const handleError = (response, error) => {
  if (error.code === 11000) {
    return response.status(409).json({ message: "This email is already registered!" });
  }
  return response.status(500).json({ message: error.message });
};

const createAccount = async (request, response, role) => {
  const { name, password, phone } = request.body;
  const email = String(request.body.email || "").toLowerCase().trim();

  if (!name || !email || !password) {
    return response.status(400).json({ message: "name, email and password are required!" });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return response.status(400).json({ message: "Please enter a valid email!" });
  }

  if (String(password).length < 6) {
    return response.status(400).json({ message: "password must be at least 6 characters!" });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return response.status(409).json({ message: "This email is already registered!" });
  }

  const hashPassword = await bcrypt.hash(String(password), 10);
  const user = await User.create({ name, email, password: hashPassword, phone, role });

  return response.status(201).json({ message: `${role} account created!`, user });
};

const registerCustomer = async (request, response) => {
  try {
    return await createAccount(request, response, "customer");
  } catch (error) {
    return handleError(response, error);
  }
};

const registerStaff = async (request, response) => {
  try {
    const { adminKey, role } = request.body;

    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      return response.status(403).json({ message: "Invalid admin key!" });
    }

    if (!STAFF_ROLES.includes(role)) {
      return response
        .status(400)
        .json({ message: `role must be one of: ${STAFF_ROLES.join(", ")}` });
    }

    return await createAccount(request, response, role);
  } catch (error) {
    return handleError(response, error);
  }
};

const loginUser = async (request, response) => {
  try {
    const { password } = request.body;
    const email = String(request.body.email || "").toLowerCase().trim();

    if (!email || !password) {
      return response.status(400).json({ message: "Please enter email and password!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return response.status(401).json({ message: "Invalid credentials!" });
    }

    const isPassValid = await bcrypt.compare(String(password), user.password);
    if (!isPassValid) {
      return response.status(401).json({ message: "Invalid credentials!" });
    }

    return response.status(200).json({ message: "Login successful", token: signToken(user), user });
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
};

const getProfile = (request, response) => {
  return response.status(200).json({ user: request.user });
};

module.exports = { registerCustomer, registerStaff, loginUser, getProfile };
