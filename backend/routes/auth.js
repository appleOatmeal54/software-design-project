const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Create an Express router for authentication endpoints
const router = express.Router();

// Import the shared users array
const { users } = require("../data/users");

// Retrieve the secret key used to generate authentication tokens
const JWT_SECRET = process.env.JWT_SECRET;


// Registration API
router.post("/register", async (req, res) => {

    const { email, password } = req.body;

    // Email and password must be strings
    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({
            message: "Email and password must be provided as strings"
        });
    }

    // Make sure neither field is empty
    if (!email.trim() || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    // Check email format and length
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            message: "Invalid email address"
        });
    }

    // Require passwords between 8 and 20 characters
    if (password.length < 8 || password.length > 20) {
        return res.status(400).json({
            message: "Password must be between 8 and 20 characters"
        });
    }

    // Prevent duplicate email registration
    const existingUser = users.find(
        user => user.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (existingUser) {
        return res.status(409).json({
            message: "Email is already registered"
        });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new regular user account
    const newUser = {
        id: users.length + 1,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: "user"
    };

    // Store the account in memory
    users.push(newUser);

    // Return user information without exposing the password
    res.status(201).json({
        message: "User registered successfully",
        user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role
        }
    });
});


// Login API
router.post("/login", async (req, res) => {

    const { email, password } = req.body;

    // Check that both fields contain strings
    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    // Find the account associated with the email
    const user = users.find(
        user => user.email === email.trim().toLowerCase()
    );

    // Reject nonexistent accounts
    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    // Compare the entered password with the stored hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    // Generate a JWT valid for one hour
    const token = jwt.sign(
        { id: user.id },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    // Return the authentication token and user information
    res.status(200).json({
        message: "Login successful",
        token: token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role
        }
    });
});

// Export the router for use in server.js
module.exports = router;
