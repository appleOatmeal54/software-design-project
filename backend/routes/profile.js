
const express = require("express");
const router = express.Router();

const db = require("../database");
const { authenticate } = require("../middleware/auth");

// Get the currently logged-in user's profile
router.get("/", authenticate, (req, res) => {

    const profile = db.prepare(`
        SELECT user_id, full_name, email, phone
        FROM UserProfile
        WHERE user_id = ?
    `).get(req.user.id);

    if (!profile) {
        return res.status(404).json({
            message: "Profile not found"
        });
    }

    res.status(200).json({ profile });
});


// Update the logged-in user's profile
router.put("/", authenticate, (req, res) => {

    const { full_name, phone } = req.body;

    // Validate the full name
    if (typeof full_name !== "string" ||
        !full_name.trim() ||
        full_name.trim().length > 100) {

        return res.status(400).json({
            message: "Valid full name is required (max 100 characters)"
        });
    }

    // Validate optional phone number
    if (phone != null && typeof phone !== "string") {
        return res.status(400).json({
            message: "Invalid profile information"
        });
    }

    // Update only the logged-in user's profile
    const result = db.prepare(`
        UPDATE UserProfile
        SET full_name = ?, phone = ?
        WHERE user_id = ?
    `).run(
        full_name.trim(),
        phone?.trim() || null,
        req.user.id
    );

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Profile not found"
        });
    }

    res.status(200).json({
        message: "Profile updated successfully"
    });
});

module.exports = router;
