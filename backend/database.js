const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const db = new Database(path.join(__dirname, "queuesmart.db"));

db.pragma("foreign_keys = ON");

// Read and execute our user schema
const userSchema = fs.readFileSync(
    path.join(__dirname, "database", "user_schema.sql"),
    "utf8"
);
db.exec(userSchema);

// Read and execute our new service schema
const serviceSchema = fs.readFileSync(
    path.join(__dirname, "database", "service_schema.sql"),
    "utf8"
);
db.exec(serviceSchema);

// Read and execute the queue, history, and notification schema
const queueSchema = fs.readFileSync(
    path.join(__dirname, "database", "queue_schema.sql"),
    "utf8"
);
db.exec(queueSchema);

module.exports = db;