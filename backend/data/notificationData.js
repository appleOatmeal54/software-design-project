const db = require("../database");

// Save a notification to SQLite
function addNotification(userEmail, title, message, metadata = {}) {
    const normalizedEmail = userEmail.trim().toLowerCase();

    // Find the actual database user
    const user = db.prepare(`
        SELECT user_id
        FROM UserCredentials
        WHERE LOWER(email) = ?
    `).get(normalizedEmail);

    // Do not save notifications for unknown users
    if (!user) {
        console.warn("Notification skipped: user not found:", normalizedEmail);
        return null;
    }

    const result = db.prepare(`
        INSERT INTO NotificationHistory
        (user_id, title, message, type, service_id, status)
        VALUES (?, ?, ?, ?, ?, 'sent')
    `).run(
        user.user_id,
        title,
        message,
        metadata.type || "general",
        metadata.serviceId != null ? Number(metadata.serviceId) : null
    );

    return {
        id: String(result.lastInsertRowid),
        userEmail: normalizedEmail,
        title,
        message,
        type: metadata.type || "general",
        serviceId: metadata.serviceId != null
            ? String(metadata.serviceId)
            : null,
        createdAt: new Date().toISOString(),
        read: false
    };
}

// Retrieve notifications belonging to a particular user
function getNotificationsForUser(userEmail) {
    const normalizedEmail = userEmail.trim().toLowerCase();

    return db.prepare(`
        SELECT
            n.notification_id AS id,
            u.email AS userEmail,
            n.title,
            n.message,
            n.type,
            n.service_id AS serviceId,
            n.timestamp AS createdAt,
            n.status
        FROM NotificationHistory n
        JOIN UserCredentials u ON n.user_id = u.user_id
        WHERE LOWER(u.email) = ?
        ORDER BY n.timestamp DESC
    `).all(normalizedEmail).map(notification => ({
        ...notification,
        id: String(notification.id),
        serviceId: notification.serviceId != null
            ? String(notification.serviceId)
            : null,
        read: notification.status === "viewed"
    }));
}

// Delete all notifications belonging to a particular user
function deleteNotificationsForUser(userEmail) {
    const normalizedEmail = userEmail.trim().toLowerCase();

    return db.prepare(`
        DELETE FROM NotificationHistory
        WHERE user_id = (
            SELECT user_id
            FROM UserCredentials
            WHERE LOWER(email) = ?
        )
    `).run(normalizedEmail);
}

module.exports = {
    addNotification,
    getNotificationsForUser,
    deleteNotificationsForUser
};