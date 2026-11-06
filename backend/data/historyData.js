const db = require("../database");

// Find the user using their email or profile name
function findUser(identifier) {
    const value = identifier.trim().toLowerCase();

    return db.prepare(`
        SELECT uc.user_id
        FROM UserCredentials uc
        LEFT JOIN UserProfile up ON up.user_id = uc.user_id
        WHERE LOWER(uc.email) = ?
           OR LOWER(up.full_name) = ?
        ORDER BY CASE WHEN LOWER(uc.email) = ? THEN 0 ELSE 1 END
        LIMIT 1
    `).get(value, value, value);
}

// Record every individual queue action
function addHistory(userIdentifier, serviceName, outcome) {
    const user = findUser(userIdentifier);

    if (!user) {
        console.warn("History skipped: user not found:", userIdentifier);
        return null;
    }

    const service = db.prepare(`
        SELECT service_id
        FROM Service
        WHERE service_name = ?
    `).get(serviceName);

    if (!service) {
        console.warn("History skipped: service not found:", serviceName);
        return null;
    }

    // Keep QueueEntry updated with the actual queue status
    const queue = db.prepare(`
        SELECT queue_id
        FROM Queue
        WHERE service_id = ? AND status = 'open'
        ORDER BY queue_id DESC
        LIMIT 1
    `).get(service.service_id);

    if (queue && outcome === "Joined") {
        const position = db.prepare(`
            SELECT COUNT(*) + 1 AS nextPosition
            FROM QueueEntry
            WHERE queue_id = ? AND status = 'waiting'
        `).get(queue.queue_id).nextPosition;

        db.prepare(`
            INSERT INTO QueueEntry
            (queue_id, user_id, position, reason, status)
            VALUES (?, ?, ?, ?, 'waiting')
        `).run(
            queue.queue_id,
            user.user_id,
            position,
            "Joined"
        );

    } else if (queue) {
        const existingEntry = db.prepare(`
            SELECT entry_id
            FROM QueueEntry
            WHERE queue_id = ?
              AND user_id = ?
              AND status = 'waiting'
            ORDER BY entry_id DESC
            LIMIT 1
        `).get(queue.queue_id, user.user_id);

        if (existingEntry) {
            const newStatus = outcome === "Served"
                ? "served"
                : "canceled";

            db.prepare(`
                UPDATE QueueEntry
                SET status = ?
                WHERE entry_id = ?
            `).run(newStatus, existingEntry.entry_id);
        }
    }

    // IMPORTANT: Always INSERT a separate history event.
    // Never update or overwrite an earlier history event.
    const result = db.prepare(`
        INSERT INTO QueueHistory
        (user_id, service_id, service_name, outcome)
        VALUES (?, ?, ?, ?)
    `).run(
        user.user_id,
        service.service_id,
        serviceName,
        outcome
    );

    return {
        id: Number(result.lastInsertRowid),
        userIdentifier,
        date: new Date().toISOString(),
        serviceName,
        outcome
    };
}

// Retrieve every activity for this user
function getHistoryForUser(userIdentifier) {
    const user = findUser(userIdentifier);

    if (!user) {
        return [];
    }

    return db.prepare(`
        SELECT
            history_id AS id,
            service_name AS serviceName,
            outcome,
            timestamp AS date
        FROM QueueHistory
        WHERE user_id = ?
        ORDER BY timestamp DESC, history_id DESC
    `).all(user.user_id);
}

module.exports = {
    addHistory,
    getHistoryForUser
};