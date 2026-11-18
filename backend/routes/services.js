const express = require("express");
const router = express.Router();
const db = require("../database");
const { addNotification } = require("../data/notificationData");
const { addHistory } = require("../data/historyData");

const {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService
} = require("../data/servicesData");

const validPriorities = ["Low", "Medium", "High"];
const validStatuses = ["Open", "Closed"];

// GET /services - Retrieve all services from SQLite
router.get("/", (req, res) => {
    try {
        res.status(200).json(getAllServices());
    } catch (error) {
        console.error("Error retrieving services:", error);
        res.status(500).json({ error: "Failed to retrieve services." });
    }
});

// POST /services - Create a new service
router.post("/", (req, res) => {
    try {
        const {
            name,
            description,
            expectedDuration,
            priorityLevel = "Medium"
        } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof description !== "string" ||
            !description.trim() ||
            expectedDuration === undefined ||
            expectedDuration === ""
        ) {
            return res.status(400).json({
                error: "Name, description, and expected duration are required."
            });
        }

        if (name.trim().length > 100) {
            return res.status(400).json({
                error: "Service name cannot exceed 100 characters."
            });
        }

        if (
            !Number.isInteger(Number(expectedDuration)) ||
            Number(expectedDuration) < 1 ||
            Number(expectedDuration) > 1440
        ) {
            return res.status(400).json({
                error: "Expected duration must be a whole number between 1 and 1440 minutes."
            });
        }

        if (!validPriorities.includes(priorityLevel)) {
            return res.status(400).json({
                error: "Priority level must be Low, Medium, or High."
            });
        }

        const newService = createService({
            name,
            description,
            expectedDuration,
            priorityLevel
        });

        return res.status(201).json({
            message: "Service created successfully.",
            service: newService
        });

    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "A service with that name already exists."
            });
        }

        console.error("Error creating service:", error);
        return res.status(500).json({
            error: "Failed to create service."
        });
    }
});

// PUT /services/:id - Update an existing service
router.put("/:id", (req, res) => {
    try {
        const serviceId = Number(req.params.id);

        if (!Number.isInteger(serviceId) || serviceId <= 0) {
            return res.status(400).json({
                error: "Invalid service ID."
            });
        }

        const existingService = getServiceById(serviceId);

        if (!existingService) {
            return res.status(404).json({
                error: "Service not found."
            });
        }

        const {
            name,
            description,
            expectedDuration,
            priorityLevel,
            status
        } = req.body;

        if (
            name !== undefined &&
            (typeof name !== "string" ||
                !name.trim() ||
                name.trim().length > 100)
        ) {
            return res.status(400).json({
                error: "Service name must be between 1 and 100 characters."
            });
        }

        if (
            description !== undefined &&
            (typeof description !== "string" || !description.trim())
        ) {
            return res.status(400).json({
                error: "Description cannot be empty."
            });
        }

        if (
            expectedDuration !== undefined &&
            (!Number.isInteger(Number(expectedDuration)) ||
                Number(expectedDuration) < 1 ||
                Number(expectedDuration) > 1440)
        ) {
            return res.status(400).json({
                error: "Expected duration must be a whole number between 1 and 1440 minutes."
            });
        }

        if (
            priorityLevel !== undefined &&
            !validPriorities.includes(priorityLevel)
        ) {
            return res.status(400).json({
                error: "Priority level must be Low, Medium, or High."
            });
        }

        if (
            status !== undefined &&
            !validStatuses.includes(status)
        ) {
            return res.status(400).json({
                error: "Status must be Open or Closed."
            });
        }

        const updatedService = updateService(serviceId, {
            name,
            description,
            expectedDuration,
            priorityLevel,
            status
        });

        return res.status(200).json({
            message: "Service updated successfully.",
            service: updatedService
        });

    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "A service with that name already exists."
            });
        }

        console.error("Error updating service:", error);
        return res.status(500).json({
            error: "Failed to update service."
        });
    }
});

// DELETE /services/:id - Permanently delete a service
router.delete("/:id", (req, res) => {
    try {
        const serviceId = Number(req.params.id);

        if (!Number.isInteger(serviceId) || serviceId <= 0) {
            return res.status(400).json({
                error: "Invalid service ID."
            });
        }

        const existingService = getServiceById(serviceId);

        if (!existingService) {
            return res.status(404).json({
                error: "Service not found."
            });
        }

        // Find everyone currently waiting in this service's queue.
        const waitingUsers = db.prepare(`
            SELECT
                u.email
            FROM QueueEntry e
            JOIN Queue q ON q.queue_id = e.queue_id
            JOIN UserCredentials u ON u.user_id = e.user_id
            WHERE q.service_id = ?
              AND e.status = 'waiting'
        `).all(serviceId);

        // Notify each waiting user before deleting the service.
        waitingUsers.forEach(user => {
            // Record the removal in the user's history.
            addHistory(
                user.email,
                existingService.name,
                "Removed"
            );

            // Reuse the existing admin removal notification.
            addNotification(
                user.email,
                "Service Incomplete",
                `${existingService.name} removed you`,
                {
                    type: "admin_removed",
                    serviceId: String(serviceId)
                }
            );
        });

        // Now permanently delete the service and its active queue.
        deleteService(serviceId);

        return res.status(200).json({
            message: "Service deleted successfully.",
            usersNotified: waitingUsers.length
        });

    } catch (error) {
        console.error("Error deleting service:", error);

        return res.status(500).json({
            error: "Failed to delete service."
        });
    }
});

module.exports = router;