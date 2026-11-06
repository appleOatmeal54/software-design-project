// backend/data/queueData.js
// Data-access layer for the Queue table (replaces the old in-memory array).
const db = require("../database");

// Make sure every service has exactly one OPEN/CLOSED queue row.
// Call once at startup (database.js or server.js) and whenever a service is created.
function ensureQueuesForServices() {
    db.prepare(`
        INSERT INTO Queue (service_id, status)
        SELECT s.service_id, LOWER(s.status)
        FROM Service s
        WHERE NOT EXISTS (SELECT 1 FROM Queue q WHERE q.service_id = s.service_id)
    `).run();
}

// Create a queue for one service (use inside POST /services after inserting the service)
function createQueue(serviceId) {
    const existing = getQueueByService(serviceId);
    if (existing) return existing;
    const result = db.prepare(
        "INSERT INTO Queue (service_id, status) VALUES (?, 'open')"
    ).run(Number(serviceId));
    return getQueueById(Number(result.lastInsertRowid));
}

function getQueueById(queueId) {
    return db.prepare(`
        SELECT queue_id AS queueId, service_id AS serviceId,
               status, created_date AS createdDate
        FROM Queue WHERE queue_id = ?
    `).get(Number(queueId));
}

// The active queue for a service (latest one)
function getQueueByService(serviceId) {
    return db.prepare(`
        SELECT queue_id AS queueId, service_id AS serviceId,
               status, created_date AS createdDate
        FROM Queue WHERE service_id = ?
        ORDER BY queue_id DESC LIMIT 1
    `).get(Number(serviceId));
}

function getAllQueues() {
    return db.prepare(`
        SELECT q.queue_id AS queueId, q.service_id AS serviceId,
               s.service_name AS serviceName, q.status,
               q.created_date AS createdDate,
               (SELECT COUNT(*) FROM QueueEntry e
                WHERE e.queue_id = q.queue_id AND e.status = 'waiting') AS waitingCount
        FROM Queue q JOIN Service s ON s.service_id = q.service_id
        ORDER BY q.queue_id
    `).all();
}

// Open or close a queue (call from PUT /services/:id when status changes)
function setQueueStatus(serviceId, status) {
    const value = String(status).toLowerCase();
    if (!["open", "closed"].includes(value)) {
        throw new Error("status must be 'open' or 'closed'");
    }
    return db.prepare(
        "UPDATE Queue SET status = ? WHERE service_id = ?"
    ).run(value, Number(serviceId));
}

module.exports = {
    ensureQueuesForServices,
    createQueue,
    getQueueById,
    getQueueByService,
    getAllQueues,
    setQueueStatus
};