//API controller
//
const express = require('express');
const router = express.Router();
let { services } = require('../data/servicesData');

// GET /services - Retrieve all services
router.get('/', (req, res) => {
    res.status(200).json(services);
});

module.exports = router;


// Connecting Front end to back-end
// POST /services - Create a new service
router.post('/', (req, res) => {
    const { name, description, expectedDuration, priorityLevel } = req.body;

    // Backend Validations required by Assignment 3 rubric
    if (!name || !description || !expectedDuration) {
        return res.status(400).json({ error: "Name, description, and expected duration are required." });
    }
    if (name.length > 100) {
        return res.status(400).json({ error: "Service name cannot exceed 100 characters." });
    }
    if (isNaN(expectedDuration) || expectedDuration <= 0) {
        return res.status(400).json({ error: "Expected duration must be a positive number." });
    }

    const newService = {
        id: Date.now().toString(), // Generates a simple unique ID
        name,
        description,
        expectedDuration: Number(expectedDuration),
        priorityLevel: priorityLevel || "Medium", 
        status: "Open" 
    };

    services.push(newService);
    res.status(201).json({ message: "Service created successfully", service: newService });
});