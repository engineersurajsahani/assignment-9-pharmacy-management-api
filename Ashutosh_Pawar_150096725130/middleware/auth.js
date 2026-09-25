const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyToken = async (request, response, next) => {
  const header = request.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return response.status(401).json({ message: "No token provided!" });
  }

  let payload;
  try {
    payload = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
  } catch (error) {
    const message =
      error.name === "TokenExpiredError" ? "Token expired, please login again!" : "Invalid token!";
    return response.status(401).json({ message });
  }

  try {
    const user = await User.findById(payload.id);
    if (!user) {
      return response.status(401).json({ message: "User no longer exists!" });
    }
    request.user = user;
    next();
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
};

module.exports = verifyToken;
