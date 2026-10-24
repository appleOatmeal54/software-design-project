const express = require("express");
const router = express.Router();

const { getHistoryForUser } = require("../data/historyData");
const { authenticate } = require("../middleware/auth");

router.get("/", authenticate, (req, res) => {
    const history = getHistoryForUser(req.user.email);

    res.status(200).json({ history });
});

module.exports = router;