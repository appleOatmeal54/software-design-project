const express = require("express");
const router = express.Router();

const {
    addNotification,
    getNotificationsForUser,
    deleteNotificationsForUser
} = require("../data/notificationData");

const { authenticate } = require("../middleware/auth");

// Retrieve notifications for the logged in user
router.get("/", authenticate, (req, res) => {
    const userEmail = req.user.email;
    const userNotifications = getNotificationsForUser(userEmail);

    res.status(200).json({
        notifications: userNotifications
    });
});

// Permanently clear notifications for the logged in user
router.delete("/", authenticate, (req, res) => {
    const userEmail = req.user.email;

    deleteNotificationsForUser(userEmail);

    res.status(200).json({
        message: "Notifications cleared successfully."
    });
});

module.exports = router;