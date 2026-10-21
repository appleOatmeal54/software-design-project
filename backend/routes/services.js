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