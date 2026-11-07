// backend/data/servicesData.js
// SQLite data-access layer for Services.

const db = require("../database");

// Convert database column names into the format expected by the frontend.
function formatService(service) {
    if (!service) return null;

    return {
        id: String(service.service_id),
        name: service.service_name,
        description: service.description,
        expectedDuration: service.expected_duration,
        priorityLevel: service.priority_level,
        status: service.status
    };
}

// Retrieve all services.
function getAllServices() {
    const services = db.prepare(`
        SELECT *
        FROM Service
        ORDER BY service_id
    `).all();

    return services.map(formatService);
}

// Retrieve one service by ID.
function getServiceById(serviceId) {
    const service = db.prepare(`
        SELECT *
        FROM Service
        WHERE service_id = ?
    `).get(Number(serviceId));

    return formatService(service);
}

// Create a service and its associated queue together.
function createService({
    name,
    description,
    expectedDuration,
    priorityLevel = "Medium"
}) {
    const create = db.transaction(() => {
        const result = db.prepare(`
            INSERT INTO Service (
                service_name,
                description,
                expected_duration,
                priority_level,
                status
            )
            VALUES (?, ?, ?, ?, 'Open')
        `).run(
            name.trim(),
            description.trim(),
            Number(expectedDuration),
            priorityLevel
        );

        const serviceId = Number(result.lastInsertRowid);

        db.prepare(`
            INSERT INTO Queue (service_id, status)
            VALUES (?, 'open')
        `).run(serviceId);

        return getServiceById(serviceId);
    });

    return create();
}

// Update an existing service.
function updateService(serviceId, updates) {
    const existing = getServiceById(serviceId);

    if (!existing) {
        return null;
    }

    const updated = {
        name: updates.name !== undefined
            ? updates.name.trim()
            : existing.name,

        description: updates.description !== undefined
            ? updates.description.trim()
            : existing.description,

        expectedDuration: updates.expectedDuration !== undefined
            ? Number(updates.expectedDuration)
            : existing.expectedDuration,

        priorityLevel: updates.priorityLevel !== undefined
            ? updates.priorityLevel
            : existing.priorityLevel,

        status: updates.status !== undefined
            ? updates.status
            : existing.status
    };

    const save = db.transaction(() => {
        db.prepare(`
            UPDATE Service
            SET service_name = ?,
                description = ?,
                expected_duration = ?,
                priority_level = ?,
                status = ?
            WHERE service_id = ?
        `).run(
            updated.name,
            updated.description,
            updated.expectedDuration,
            updated.priorityLevel,
            updated.status,
            Number(serviceId)
        );

        // Keep the associated Queue status synchronized.
        db.prepare(`
            UPDATE Queue
            SET status = ?
            WHERE service_id = ?
        `).run(
            updated.status.toLowerCase(),
            Number(serviceId)
        );

        return getServiceById(serviceId);
    });

    return save();
}

module.exports = {
    getAllServices,
    getServiceById,
    createService,
    updateService
};