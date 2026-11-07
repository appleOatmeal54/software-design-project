const db = require("../database");
const {
    addNotification,
    getNotificationsForUser,
    deleteNotificationsForUser
} = require("../data/notificationData");

const { createNonAdmin } = require("../data/users");

beforeAll(async () => {
    await createNonAdmin();
});

describe("Notification Database Functions", () => {

    beforeEach(() => {
        deleteNotificationsForUser("user@queuesmart.com");
    });

    test("Should add a notification with default metadata", () => {
        const result = addNotification(
            "user@queuesmart.com",
            "Queue Update",
            "You have joined the queue."
        );

        expect(result).toBeDefined();
        expect(result.userEmail).toBe("user@queuesmart.com");
        expect(result.title).toBe("Queue Update");
        expect(result.type).toBe("general");
        expect(result.serviceId).toBeNull();
        expect(result.read).toBe(false);
    });

    test("Should add a notification with custom metadata", () => {
        const result = addNotification(
            "USER@QUEUESMART.COM",
            "Service Update",
            "Your service is ready.",
            {
                type: "queue",
                serviceId: 1
            }
        );

        expect(result).toBeDefined();
        expect(result.userEmail).toBe("user@queuesmart.com");
        expect(result.type).toBe("queue");
        expect(result.serviceId).toBe("1");
    });

    test("Should return null for a nonexistent user", () => {
        const result = addNotification(
            "missing@queuesmart.com",
            "Test",
            "Test message"
        );

        expect(result).toBeNull();
    });

    test("Should retrieve notifications for a user", () => {
        addNotification(
            "user@queuesmart.com",
            "Queue Update",
            "Your queue position changed."
        );

        const notifications = getNotificationsForUser(
            "USER@QUEUESMART.COM"
        );

        expect(notifications.length).toBe(1);
        expect(notifications[0].title).toBe("Queue Update");
        expect(notifications[0].read).toBe(false);
    });

    test("Should identify viewed notifications as read", () => {
        addNotification(
            "user@queuesmart.com",
            "Viewed Notification",
            "This notification has been viewed."
        );

        db.prepare(`
            UPDATE NotificationHistory
            SET status = 'viewed'
            WHERE title = ?
        `).run("Viewed Notification");

        const notifications = getNotificationsForUser(
            "user@queuesmart.com"
        );

        expect(notifications[0].read).toBe(true);
    });

    test("Should return an empty array when no notifications exist", () => {
        const notifications = getNotificationsForUser(
            "user@queuesmart.com"
        );

        expect(notifications).toEqual([]);
    });

    test("Should delete all notifications for a user", () => {
        addNotification(
            "user@queuesmart.com",
            "First",
            "First message"
        );

        addNotification(
            "user@queuesmart.com",
            "Second",
            "Second message"
        );

        const result = deleteNotificationsForUser(
            "user@queuesmart.com"
        );

        expect(result.changes).toBe(2);

        const notifications = getNotificationsForUser(
            "user@queuesmart.com"
        );

        expect(notifications).toEqual([]);
    });

});