const jwt = require("jsonwebtoken");

const auth = (request, response, next) => {
    try {
        const token = request.headers.token;
        if (!token) {
            return response.status(400).json({ message: "Token is not provided" });
        }
        const decoded = jwt.verify(token, "itm");
        if (!decoded) {
            return response.status(400).json({ message: "Token is invalid" });
        }
        request.user = decoded;
        next();
    } catch (error) {
        return response.status(500).json({ message: error.message });
    }
};

module.exports = auth;
