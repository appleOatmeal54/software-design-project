const notifications = [];

function addNotification(userEmail, title, message, metadata = {}) {
    const notification = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        userEmail: userEmail.trim().toLowerCase(),
        title,
        message,
        type: metadata.type || "general",
        serviceId: metadata.serviceId != null
            ? String(metadata.serviceId)
            : null,
        createdAt: new Date().toISOString(),
        read: false
    };

    notifications.push(notification);

    return notification;
}

function getNotificationsForUser(userEmail) {
    return notifications
        .filter(
            notification =>
                notification.userEmail === userEmail
        )
        .sort(
            (a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
        );
}

function deleteNotificationsForUser(userEmail) {
    const normalizedEmail = userEmail.trim().toLowerCase();

    for (let i = notifications.length - 1; i >= 0; i--) {
        if (
            notifications[i].userEmail.trim().toLowerCase() === normalizedEmail
        ) {
            notifications.splice(i, 1);
        }
    }
}

module.exports = {
    notifications,
    addNotification,
    getNotificationsForUser,
    deleteNotificationsForUser
};