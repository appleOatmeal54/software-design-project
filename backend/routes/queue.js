// API Controller
const express = require("express");
const router = express.Router();

const db = require("../database");

const {
    getQueueByService,
    getQueueEntries,
    addQueueEntry,
    getWaitingEntryForUser,
    cancelQueueEntry,
    serveNextQueueEntry,
    getWaitingCount
} = require("../data/queueData");

const { getServiceById } = require("../data/servicesData");
const { addNotification } = require("../data/notificationData");
const { addHistory } = require("../data/historyData");

// Priority weights: High first, then Medium, then Low.
const priorityWeight = {
    High: 3,
    high: 3,
    Medium: 2,
    medium: 2,
    Low: 1,
    low: 1
};

// Find a database user by email.
function findUser(userEmail) {
    return db.prepare(`
        SELECT user_id, email
        FROM UserCredentials
        WHERE LOWER(email) = ?
    `).get(userEmail.trim().toLowerCase());
}

// Sort queue entries by priority and arrival time.
function getSortedQueue(serviceId) {
    const queue = getQueueByService(serviceId);

    if (!queue) return [];

    return getQueueEntries(queue.queueId).sort((a, b) => {
        const weightA = priorityWeight[a.priority] || 2;
        const weightB = priorityWeight[b.priority] || 2;

        if (weightB !== weightA) {
            return weightB - weightA;
        }

        return String(a.joinedAt).localeCompare(String(b.joinedAt));
    }).map((entry, index) => ({
        ...entry,
        serviceId: String(serviceId),
        userName: entry.userName,
        position: index + 1
    }));
}

// Convert numeric positions into ordinal text.
function getPositionText(position) {
    const positions = {
        1: "first",
        2: "second",
        3: "third",
        4: "fourth",
        5: "fifth",
        6: "sixth",
        7: "seventh",
        8: "eighth",
        9: "ninth",
        10: "tenth"
    };

    if (positions[position]) return positions[position];

    const lastTwoDigits = position % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        return `${position}th`;
    }

    switch (position % 10) {
        case 1: return `${position}st`;
        case 2: return `${position}nd`;
        case 3: return `${position}rd`;
        default: return `${position}th`;
    }
}

// 1. GET /queue - View all waiting entries or filter by serviceId.
router.get("/", (req, res) => {
    try {
        const { serviceId } = req.query;

        if (serviceId) {
            return res.status(200).json(getSortedQueue(serviceId));
        }

        // Return individual waiting users, not queue summary records.
        const entries = db.prepare(`
            SELECT
                e.entry_id AS id,
                e.queue_id AS queueId,
                e.user_id AS userId,
                up.full_name AS userName,
                e.position,
                e.priority,
                e.join_time AS joinedAt,
                e.status,
                q.service_id AS serviceId,
                s.service_name AS serviceName
            FROM QueueEntry e
            JOIN Queue q ON q.queue_id = e.queue_id
            JOIN Service s ON s.service_id = q.service_id
            JOIN UserCredentials u ON u.user_id = e.user_id
            JOIN UserProfile up ON up.user_id = e.user_id
            WHERE e.status = 'waiting'
            ORDER BY
                q.service_id,
                CASE e.priority
                    WHEN 'High' THEN 1
                    WHEN 'Medium' THEN 2
                    WHEN 'Low' THEN 3
                    ELSE 4
                END,
                e.join_time ASC,
                e.entry_id ASC
        `).all();

        return res.status(200).json(entries);
    } catch (error) {
        console.error("Error retrieving queues:", error);
        return res.status(500).json({ error: "Failed to retrieve queues." });
    }
});

// 2. GET /queue/:serviceId - View a specific service queue.
router.get("/:serviceId", (req, res) => {
    try {
        const { serviceId } = req.params;
        const service = getServiceById(serviceId);

        if (!service) {
            return res.status(404).json({ error: "Service not found." });
        }

        const sortedQueue = getSortedQueue(serviceId);

        return res.status(200).json({
            service: service.name,
            count: sortedQueue.length,
            queue: sortedQueue
        });
    } catch (error) {
        console.error("Error retrieving service queue:", error);
        return res.status(500).json({ error: "Failed to retrieve service queue." });
    }
});

// 3. POST /queue/join - User joins a queue.
router.post("/join", (req, res) => {
    try {
        const { serviceId, userName, priority } = req.body;

        if (!serviceId || !userName) {
            return res.status(400).json({
                error: "serviceId and userName are required."
            });
        }

        if (
            typeof userName !== "string" ||
            userName.trim().length === 0 ||
            userName.trim().length > 100
        ) {
            return res.status(400).json({
                error: "userName must be a non-empty string up to 100 characters."
            });
        }

        const service = getServiceById(serviceId);

        if (!service) {
            return res.status(404).json({ error: "Service not found." });
        }

        if (service.status === "Closed") {
            return res.status(400).json({
                error: "Cannot join a closed queue."
            });
        }

        const user = findUser(userName);

        if (!user) {
            return res.status(404).json({
                error: "User account not found."
            });
        }

        if (getWaitingEntryForUser(user.user_id)) {
            return res.status(400).json({
                error: "You are already in a queue."
            });
        }

        const validPriorities = ["Low", "Medium", "High", "low", "medium", "high"];
        const chosenPriority = priority || service.priorityLevel || "Medium";

        if (!validPriorities.includes(chosenPriority)) {
            return res.status(400).json({ error: "Invalid priority level." });
        }

        const normalizedPriority =
            chosenPriority.charAt(0).toUpperCase() +
            chosenPriority.slice(1).toLowerCase();

        const queue = getQueueByService(serviceId);

        if (!queue || queue.status !== "open") {
            return res.status(400).json({
                error: "Cannot join a closed queue."
            });
        }

        const newEntry = addQueueEntry(
            queue.queueId,
            user.user_id,
            normalizedPriority
        );

        addHistory(user.email, service.name, "Joined");

        addNotification(
            user.email,
            "Queue Update",
            `You joined ${service.name}`,
            {
                type: "joined",
                serviceId: String(serviceId)
            }
        );

        const sortedQueue = getSortedQueue(serviceId);
        const position = sortedQueue.findIndex(
            entry => entry.id === newEntry.id
        ) + 1;

        const estimatedWaitTime = position * service.expectedDuration;

        return res.status(201).json({
            message: `Joined ${service.name} queue successfully`,
            entry: {
                ...newEntry,
                serviceId: String(serviceId),
                userName: user.email,
                joinedAt: newEntry.joinedAt
            },
            position,
            estimatedWaitTime
        });
    } catch (error) {
        console.error("Error joining queue:", error);
        return res.status(500).json({ error: "Failed to join queue." });
    }
});

// 4. POST /queue/leave - User leaves or admin removes a user.
router.post("/leave", (req, res) => {
    try {
        const { serviceId, userName, action } = req.body;

        if (!serviceId || !userName || typeof userName !== "string") {
            return res.status(400).json({
                error: "Valid serviceId and userName are required."
            });
        }

        const service = getServiceById(serviceId);

        if (!service) {
            return res.status(404).json({ error: "Service not found." });
        }

        const user = findUser(userName);

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const queue = getQueueByService(serviceId);

        if (!queue) {
            return res.status(404).json({ error: "Queue not found." });
        }

        const entry = db.prepare(`
            SELECT
                e.entry_id AS id,
                e.queue_id AS queueId,
                e.user_id AS userId,
                up.full_name AS userName,
                e.position,
                e.priority,
                e.join_time AS joinedAt,
                e.status
            FROM QueueEntry e
            JOIN UserCredentials u ON u.user_id = e.user_id
            JOIN UserProfile up ON up.user_id = e.user_id
            WHERE e.queue_id = ?
              AND e.user_id = ?
              AND e.status = 'waiting'
            ORDER BY e.entry_id DESC
            LIMIT 1
        `).get(queue.queueId, user.user_id);

        if (!entry) {
            return res.status(404).json({
                error: "User not found in the specified queue."
            });
        }

        const isAdminRemoval = action === "remove";

        cancelQueueEntry(entry.id);

        const outcome = isAdminRemoval ? "Removed" : "Left";

        addHistory(user.email, service.name, outcome);

        addNotification(
            user.email,
            isAdminRemoval ? "Service Incomplete" : "Queue Update",
            isAdminRemoval
                ? `${service.name} removed you`
                : `You left ${service.name}`,
            {
                type: isAdminRemoval ? "admin_removed" : "user_left",
                serviceId: String(serviceId)
            }
        );

        return res.status(200).json({
            message: isAdminRemoval
                ? `Removed ${user.email} from the queue.`
                : "Left queue successfully.",
            action: isAdminRemoval ? "remove" : "leave",
            removed: {
                ...entry,
                serviceId: String(serviceId)
            }
        });
    } catch (error) {
        console.error("Error leaving queue:", error);
        return res.status(500).json({ error: "Failed to leave queue." });
    }
});

// 5. POST /queue/serve - Administrator serves the next user.
router.post("/serve", (req, res) => {
    try {
        const { serviceId } = req.body;

        if (!serviceId) {
            return res.status(400).json({ error: "serviceId is required." });
        }

        const service = getServiceById(serviceId);

        if (!service) {
            return res.status(404).json({ error: "Service not found." });
        }

        const sortedQueue = getSortedQueue(serviceId);

        if (sortedQueue.length === 0) {
            return res.status(400).json({
                error: "Queue is currently empty."
            });
        }

        const servedEntry = serveNextQueueEntry(
            getQueueByService(serviceId).queueId
        );

        if (!servedEntry) {
            return res.status(400).json({
                error: "Queue is currently empty."
            });
        }

        const servedUser = db.prepare(`
            SELECT email
            FROM UserCredentials
            WHERE user_id = ?
        `).get(servedEntry.userId);

        if (!servedUser) {
            return res.status(404).json({ error: "Served user not found." });
        }

        addHistory(servedUser.email, service.name, "Served");

        addNotification(
            servedUser.email,
            "Service Complete",
            `${service.name} has served you!`,
            {
                type: "served",
                serviceId: String(serviceId)
            }
        );

        const updatedQueue = getSortedQueue(serviceId);

        updatedQueue.forEach((entry, index) => {
            const newPosition = index + 1;

            const message = newPosition === 1
                ? "You are next in line!"
                : `You moved to ${getPositionText(newPosition)} position`;

            addNotification(
                entry.userName,
                "Queue Update",
                message,
                {
                    type: newPosition === 1
                        ? "next_in_line"
                        : "position_update",
                    serviceId: String(serviceId)
                }
            );
        });

        return res.status(200).json({
            message: `Now serving ${servedUser.email}`,
            servedUser: {
                ...servedEntry,
                serviceId: String(serviceId),
                userName: servedUser.email
            },
            remainingInQueue: getWaitingCount(
                getQueueByService(serviceId).queueId
            )
        });
    } catch (error) {
        console.error("Error serving queue entry:", error);
        return res.status(500).json({ error: "Failed to serve queue entry." });
    }
});

module.exports = router;