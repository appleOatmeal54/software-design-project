
const jwt = require("jsonwebtoken");

// Import the SQLite database
const db = require("../database");

// Retrieve the secret key used to verify JWTs
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify the user's authentication token
function authenticate(req, res, next) {

    // Retrieve the authorization header from the request
    const authHeader = req.headers.authorization;

    // Check that the token was provided in the correct format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication token required"
        });
    }

    // Extract the token from the authorization header
    const token = authHeader.split(" ")[1];

    try {
        // Verify the token using our secret key
        const decoded = jwt.verify(token, JWT_SECRET);

        // Find the user associated with the token in SQLite
        const user = db.prepare(`
            SELECT user_id AS id, email, role
            FROM UserCredentials
            WHERE user_id = ?
        `).get(decoded.id);

        // Reject the request if the user no longer exists
        if (!user) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        // Attach the authenticated user to the request
        req.user = user;

        // Allow the request to continue
        next();

    } catch (error) {
        // Reject invalid or expired tokens
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}


 // Middleware to restrict access to administrators
function requireAdmin(req, res, next) {

    // Check whether authentication identified a user
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    // Check whether the authenticated user is an administrator
    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Administrator access required"
        });
    }

    // Allow the request to continue
    next();
}


// Export both functions so other backend modules can use them
module.exports = { authenticate, requireAdmin };
