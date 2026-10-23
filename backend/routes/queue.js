// API Controller 
const express = require("express");
const router = express.Router();
let { queues } = require("../data/queueData");
let { services } = require("../data/servicesData");

// Priority weights for sorting (High = 3, Medium = 2, Low = 1)
const priorityWeight = {
    High: 3,
    high: 3,
    Medium: 2,
    medium: 2,
    Low: 1,
    low: 1
};

// Helper: Sort queue by Priority (highest first), then by Arrival Order (oldest first)
function getSortedQueue(serviceId) {
    return queues
        .filter(entry => String(entry.serviceId) === String(serviceId))
        .sort((a, b) => {
            const weightA = priorityWeight[a.priority] || 2;
            const weightB = priorityWeight[b.priority] || 2;
            if (weightB !== weightA) {
                return weightB - weightA; // Higher priority first
            }
            return a.joinedAt - b.joinedAt; // Earlier arrival time first
        });
}

// 1. GET /queue - View all queues or filter by ?serviceId=1 (Admin & User)
router.get("/", (req, res) => {
    const { serviceId } = req.query;
    if (serviceId) {
        return res.status(200).json(getSortedQueue(serviceId));
    }
    res.status(200).json(queues);
});

// 2. GET /queue/:serviceId - View sorted queue for a specific service
router.get("/:serviceId", (req, res) => {
    const { serviceId } = req.params;
    const service = services.find(s => String(s.id) === String(serviceId));

    if (!service) {
        return res.status(404).json({ error: "Service not found." });
    }

    const sortedQueue = getSortedQueue(serviceId);
    res.status(200).json({
        service: service.name,
        count: sortedQueue.length,
        queue: sortedQueue
    });
});

// 3. POST /queue/join - User joins a queue
router.post("/join", (req, res) => {
    const { serviceId, userName, priority } = req.body;

    // Backend Validations (Required fields, types, length limits)
    if (!serviceId || !userName) {
        return res.status(400).json({ error: "serviceId and userName are required." });
    }
    if (typeof userName !== "string" || userName.trim().length === 0 || userName.trim().length > 100) {
        return res.status(400).json({ error: "userName must be a non-empty string up to 100 characters." });
    }

    const service = services.find(s => String(s.id) === String(serviceId));
    if (!service) {
        return res.status(404).json({ error: "Service not found." });
    }
    if (service.status === "Closed") {
        return res.status(400).json({ error: "Cannot join a closed queue." });
    }

    // Prevent duplicate entries in the same service queue
    const alreadyInQueue = queues.some(
        q => String(q.serviceId) === String(serviceId) && q.userName.toLowerCase() === userName.trim().toLowerCase()
    );
    if (alreadyInQueue) {
        return res.status(400).json({ error: "User is already in this queue." });
    }

    const validPriorities = ["Low", "Medium", "High", "low", "medium", "high"];
    const chosenPriority = priority || service.priorityLevel || "Medium";
    if (!validPriorities.includes(chosenPriority)) {
        return res.status(400).json({ error: "Invalid priority level." });
    }

    const newEntry = {
        id: "q" + Date.now(),
        serviceId: String(serviceId),
        userName: userName.trim(),
        priority: chosenPriority,
        joinedAt: Date.now()
    };

    queues.push(newEntry);

    // Calculate new position and estimated wait time (position * expectedDuration)
    const sortedQueue = getSortedQueue(serviceId);
    const position = sortedQueue.findIndex(q => q.id === newEntry.id) + 1;
    const estimatedWaitTime = position * service.expectedDuration;

    res.status(201).json({
        message: `Joined ${service.name} queue successfully`,
        entry: newEntry,
        position,
        estimatedWaitTime
    });
});

// 4. POST /queue/leave - User leaves a queue (or Admin removes a user)
router.post("/leave", (req, res) => {
    const { serviceId, userName } = req.body;

    if (!serviceId || !userName || typeof userName !== "string") {
        return res.status(400).json({ error: "Valid serviceId and userName are required." });
    }

    const index = queues.findIndex(
        q => String(q.serviceId) === String(serviceId) && q.userName.toLowerCase() === userName.trim().toLowerCase()
    );

    if (index === -1) {
        return res.status(404).json({ error: "User not found in the specified queue." });
    }

    const [removed] = queues.splice(index, 1);
    res.status(200).json({
        message: "Left queue successfully",
        removed
    });
});

// 5. POST /queue/serve - Administrator serves the next user in line
router.post("/serve", (req, res) => {
    const { serviceId } = req.body;

    if (!serviceId) {
        return res.status(400).json({ error: "serviceId is required." });
    }

    const sortedQueue = getSortedQueue(serviceId);
    if (sortedQueue.length === 0) {
        return res.status(400).json({ error: "Queue is currently empty." });
    }

    // Grab the highest-priority / earliest-arriving user at the front of the queue
    const nextUser = sortedQueue[0];
    const indexInGlobal = queues.findIndex(q => q.id === nextUser.id);
    queues.splice(indexInGlobal, 1);

    res.status(200).json({
        message: `Now serving ${nextUser.userName}`,
        servedUser: nextUser,
        remainingInQueue: sortedQueue.length - 1
    });
});

module.exports = router;