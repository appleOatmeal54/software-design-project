
require("dotenv").config();
const express = require("express");
const path = require("path");

// Import the administrator setup function
const { createAdmin } = require("./data/users");

// Import authentication and administrator authorization middleware
const { authenticate, requireAdmin } = require("./middleware/auth");

// Import registration and login routes
const authRoutes = require("./routes/auth");
const servicesRoutes = require("./routes/services");
const queueRoutes = require("./routes/queue");

const app = express();
const PORT = 3000;

// Allow Express to read JSON requests
app.use(express.json());

// Connect registration, login, services, and queue APIs
app.use("/api", authRoutes);
app.use("/services", servicesRoutes);
app.use("/queue", queueRoutes);

// Allow Express to read JSON requests
app.use(express.json());

// Connect registration and login APIs
app.use("/api", authRoutes);

const JWT_SECRET = process.env.JWT_SECRET;

// Ensure the JWT secret exists
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from .env");
}

// Allow Express to serve the front-end files from the project folder
app.use(express.static(path.join(__dirname, "..")));

// Check whether the backend is running
app.get("/", (req, res) => {
    res.send("QueueSmart backend is running!");
});

// Protected API endpoint accessible only to administrators
app.get("/api/admin/test", authenticate, requireAdmin, (req, res) => {

    // Return a success message if the user has administrator privileges
    res.status(200).json({
        message: "Administrator access granted",
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// API endpoint to retrieve the currently authenticated user
app.get("/api/me", authenticate, (req, res) => {

    // Return the user's information without exposing their password
    res.status(200).json({
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// Start the server after the administrator account is created
async function startServer() {
    await createAdmin();

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

// Only start the server when running server.js directly
if (require.main === module) {
    startServer().catch(console.error);
}

// Export the Express application and administrator setup for testing
module.exports = { app, createAdmin };
