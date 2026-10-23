// API controller for Service Management (Module 2)
const express = require('express');
const router = express.Router();
let { services } = require('../data/servicesData');

// GET /services - Retrieve all services
router.get('/', (req, res) => {
    res.status(200).json(services);
});

// POST /services - Create a new service
router.post('/', (req, res) => {
    const { name, description, expectedDuration, priorityLevel } = req.body;

    // Backend Validations required by Assignment 3 rubric
    if (!name || !description || expectedDuration === undefined || expectedDuration === "") {
        return res.status(400).json({ error: "Name, description, and expected duration are required." });
    }
    if (typeof name !== 'string' || name.trim().length > 100) {
        return res.status(400).json({ error: "Service name must be a string and cannot exceed 100 characters." });
    }
    if (isNaN(expectedDuration) || Number(expectedDuration) <= 0 || Number(expectedDuration) > 1440) {
        return res.status(400).json({ error: "Expected duration must be a number between 1 and 1440 minutes." });
    }

    const newService = {
        id: Date.now().toString(),
        name: name.trim(),
        description: description.trim(),
        expectedDuration: Number(expectedDuration),
        priorityLevel: priorityLevel || "Medium",
        status: "Open"
    };

    services.push(newService);
    res.status(201).json({ message: "Service created successfully", service: newService });
});

// PUT /services/:id - Update an existing service (Edit or Change Status)
router.put('/:id', (req, res) => {
    const serviceId = req.params.id;
    const { name, description, expectedDuration, priorityLevel, status } = req.body;

    const serviceIndex = services.findIndex(s => String(s.id) === String(serviceId));
    
    if (serviceIndex === -1) {
        return res.status(404).json({ error: "Service not found." });
    }

    // Validate fields if they are being updated
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100)) {
        return res.status(400).json({ error: "Service name must be between 1 and 100 characters." });
    }
    if (expectedDuration !== undefined && (isNaN(expectedDuration) || Number(expectedDuration) <= 0 || Number(expectedDuration) > 1440)) {
        return res.status(400).json({ error: "Expected duration must be a number between 1 and 1440 minutes." });
    }

    // Update fields if provided in the request
    if (name) services[serviceIndex].name = name.trim();
    if (description) services[serviceIndex].description = description.trim();
    if (expectedDuration) services[serviceIndex].expectedDuration = Number(expectedDuration);
    if (priorityLevel) services[serviceIndex].priorityLevel = priorityLevel;
    if (status) services[serviceIndex].status = status;

    res.status(200).json({ message: "Service updated", service: services[serviceIndex] });
});

module.exports = router;