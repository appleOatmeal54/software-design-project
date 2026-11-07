// backend/data/historyData.js
// SQLite data-access layer for Queue History.

const db = require("../database");

// Find a user by email address or profile name.
function findUser(identifier) {
    const value = identifier.trim().toLowerCase();

    return db.prepare(`
        SELECT uc.user_id
        FROM UserCredentials uc
        LEFT JOIN UserProfile up ON up.user_id = uc.user_id
        WHERE LOWER(uc.email) = ?
           OR LOWER(up.full_name) = ?
        ORDER BY CASE
            WHEN LOWER(uc.email) = ? THEN 0
            ELSE 1
        END
        LIMIT 1
    `).get(value, value, value);
}

// Record an individual queue action.
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

    // Save a separate history record for every action.
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

// Retrieve all activities belonging to a user.
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