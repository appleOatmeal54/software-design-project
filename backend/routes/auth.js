const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Create an Express router for authentication endpoints
const router = express.Router();


// Import the SQLite database connection
const db = require("../database");

// Retrieve the secret key used to generate authentication tokens
const JWT_SECRET = process.env.JWT_SECRET;


// Registration API
router.post("/register", async (req, res) => {

    const { full_name, email, password } = req.body;

    // Email and password must be strings
    if (typeof full_name !== "string" || typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({
            message: "Full name, email and password are required"
        });
    }

    // Make sure neither field is empty
    if (!full_name.trim() || !email.trim() || !password) {
        return res.status(400).json({
            message: "Full name, email and password are required"
        });
    }

    //Require full name to be less than 100 characters
    if (full_name.trim().length > 100) {
        return res.status(400).json({
            message: "Full name must be less than 100 characters"
        })
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

    // Normalize the email
    const normalizedEmail = email.trim().toLowerCase();

    // Check whether the email is already registered
    const existingUser = db.prepare(
        "SELECT user_id FROM UserCredentials WHERE email = ?"
    ).get(normalizedEmail);

    if (existingUser) {
        return res.status(409).json({
            message: "Email is already registered"
        });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert both records in one transaction
        const registerUser = db.transaction(() => {

            const result = db.prepare(`
                INSERT INTO UserCredentials (email, password_hash, role)
                VALUES (?, ?, ?)
            `).run(normalizedEmail, hashedPassword, "user");

            const userId = Number(result.lastInsertRowid);

            db.prepare(`
                INSERT INTO UserProfile (user_id, full_name, email)
                VALUES (?, ?, ?)
            `).run(userId, full_name.trim(), normalizedEmail);

            return userId;
        });

        try {
            const userId = registerUser();

            res.status(201).json({
                message: "User registered successfully",
                user: {
                    id: userId,
                    full_name: full_name.trim(),
                    email: normalizedEmail,
                    role: "user"
                }
            });

        } catch (error) {
            if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                return res.status(409).json({
                    message: "Email is already registered"
                });
            }

            console.error("Registration error:", error);

            res.status(500).json({
                message: "Unable to register user"
            });
        }
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
    const user = db.prepare(`
        SELECT user_id, email, password_hash, role
        FROM UserCredentials
        WHERE email = ?
        `).get(email.trim().toLowerCase());

    // Reject nonexistent accounts
    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    // Compare the entered password with the stored hashed password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    // Generate a JWT valid for one hour
    const token = jwt.sign(
        { id: user.user_id },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    // Return the authentication token and user information
    res.status(200).json({
        message: "Login successful",
        token: token,
        user: {
            id: user.user_id,
            email: user.email,
            role: user.role
        }
    });
});

// Export the router for use in server.js
module.exports = router;
