const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    // 1. Read the Authorization header
    const authHeader = req.headers.authorization;

    // 2. Make sure it starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    // 3. Extract the token (strip the "Bearer " prefix)
    const token = authHeader.split(" ")[1];

    // 4. Verify the JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // 5. Load the user referenced by the token
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User belonging to this token no longer exists.",
      });
    }

    // 6. Attach authenticated user to the request
    req.user = user;
    req.userId = user._id;
    req.role = user.role;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while authenticating user.",
    });
  }
};

module.exports = { protect };