// backend/data/queueData.js
// SQLite data-access layer for Queues and Queue Entries.

const db = require("../database");

// Make sure every service has a queue.
function ensureQueuesForServices() {
    db.prepare(`
        INSERT INTO Queue (service_id, status)
        SELECT s.service_id, LOWER(s.status)
        FROM Service s
        WHERE NOT EXISTS (
            SELECT 1 FROM Queue q
            WHERE q.service_id = s.service_id
        )
    `).run();
}

// Create a queue for a service.
function createQueue(serviceId) {
    const existing = getQueueByService(serviceId);

    if (existing) return existing;

    const result = db.prepare(`
        INSERT INTO Queue (service_id, status)
        VALUES (?, 'open')
    `).run(Number(serviceId));

    return getQueueById(Number(result.lastInsertRowid));
}

// Retrieve a queue by ID.
function getQueueById(queueId) {
    return db.prepare(`
        SELECT queue_id AS queueId,
               service_id AS serviceId,
               status,
               created_date AS createdDate
        FROM Queue
        WHERE queue_id = ?
    `).get(Number(queueId));
}

// Retrieve a queue by service ID.
function getQueueByService(serviceId) {
    return db.prepare(`
        SELECT queue_id AS queueId,
               service_id AS serviceId,
               status,
               created_date AS createdDate
        FROM Queue
        WHERE service_id = ?
        ORDER BY queue_id DESC
        LIMIT 1
    `).get(Number(serviceId));
}

// Retrieve all queues and their waiting counts.
function getAllQueues() {
    return db.prepare(`
        SELECT q.queue_id AS queueId,
               q.service_id AS serviceId,
               s.service_name AS serviceName,
               q.status,
               q.created_date AS createdDate,
               (
                   SELECT COUNT(*)
                   FROM QueueEntry e
                   WHERE e.queue_id = q.queue_id
                   AND e.status = 'waiting'
               ) AS waitingCount
        FROM Queue q
        JOIN Service s ON s.service_id = q.service_id
        ORDER BY q.queue_id
    `).all();
}

// Open or close a service's queue.
function setQueueStatus(serviceId, status) {
    const value = String(status).toLowerCase();

    if (!["open", "closed"].includes(value)) {
        throw new Error("Invalid queue status.");
    }

    return db.prepare(`
        UPDATE Queue
        SET status = ?
        WHERE service_id = ?
    `).run(value, Number(serviceId));
}

// Retrieve waiting entries for a queue.
function getQueueEntries(queueId) {
    return db.prepare(`
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
        AND e.status = 'waiting'
        ORDER BY
            CASE e.priority
                WHEN 'High' THEN 1
                WHEN 'Medium' THEN 2
                WHEN 'Low' THEN 3
                ELSE 4
            END,
            e.join_time ASC,
            e.entry_id ASC
    `).all(Number(queueId));
}

function updateQueuePositions(queueId) {
    const entries = getQueueEntries(queueId);

    const updatePosition = db.prepare(`
        UPDATE QueueEntry
        SET position = ?
        WHERE entry_id = ?
    `);

    const updateAllPositions = db.transaction(() => {
        entries.forEach((entry, index) => {
            updatePosition.run(index + 1, entry.id);
        });
    });

    updateAllPositions();
}

// Add a user to a queue.
function addQueueEntry(queueId, userId, priority = "Medium", reason = null) {
    const result = db.prepare(`
        INSERT INTO QueueEntry (
            queue_id,
            user_id,
            position,
            priority,
            reason,
            status
        )
        VALUES (?, ?, 1, ?, ?, 'waiting')
    `).run(
        Number(queueId),
        Number(userId),
        priority,
        reason
    );

    updateQueuePositions(Number(queueId));

    return db.prepare(`
        SELECT
            entry_id AS id,
            queue_id AS queueId,
            user_id AS userId,
            position,
            priority,
            join_time AS joinedAt,
            status
        FROM QueueEntry
        WHERE entry_id = ?
    `).get(Number(result.lastInsertRowid));
}

// Find an existing waiting entry for a user.
function getWaitingEntryForUser(userId) {
    return db.prepare(`
        SELECT *
        FROM QueueEntry
        WHERE user_id = ?
        AND status = 'waiting'
        LIMIT 1
    `).get(Number(userId));
}

// Remove a queue entry by changing its status.
function cancelQueueEntry(entryId) {
    const entry = db.prepare(`
        SELECT queue_id
        FROM QueueEntry
        WHERE entry_id = ?
        AND status = 'waiting'
    `).get(Number(entryId));

    const result = db.prepare(`
        UPDATE QueueEntry
        SET status = 'canceled'
        WHERE entry_id = ?
        AND status = 'waiting'
    `).run(Number(entryId));

    if (entry && result.changes > 0) {
        updateQueuePositions(entry.queue_id);
    }

    return result;
}

// Mark the next waiting entry as served.
function serveNextQueueEntry(queueId) {
    const nextEntry = getQueueEntries(queueId)[0];

    if (!nextEntry) return null;

    db.prepare(`
        UPDATE QueueEntry
        SET status = 'served'
        WHERE entry_id = ?
    `).run(nextEntry.id);

    updateQueuePositions(Number(queueId));

    return nextEntry;
}

// Count waiting entries in a queue.
function getWaitingCount(queueId) {
    return db.prepare(`
        SELECT COUNT(*) AS count
        FROM QueueEntry
        WHERE queue_id = ?
        AND status = 'waiting'
    `).get(Number(queueId)).count;
}

module.exports = {
    ensureQueuesForServices,
    createQueue,
    getQueueById,
    getQueueByService,
    getAllQueues,
    setQueueStatus,
    getQueueEntries,
    addQueueEntry,
    getWaitingEntryForUser,
    cancelQueueEntry,
    serveNextQueueEntry,
    getWaitingCount
};