const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// Connect to the SQLite database
const db = new Database(path.join(__dirname, "queuesmart.db"));

// Enable foreign key enforcement
db.pragma("foreign_keys = ON");

// Load and execute database schemas
const userSchema = fs.readFileSync(
    path.join(__dirname, "database", "user_schema.sql"),
    "utf8"
);
db.exec(userSchema);

const serviceSchema = fs.readFileSync(
    path.join(__dirname, "database", "service_schema.sql"),
    "utf8"
);
db.exec(serviceSchema);

const queueSchema = fs.readFileSync(
    path.join(__dirname, "database", "queue_schema.sql"),
    "utf8"
);
db.exec(queueSchema);

// Database migration: add priority column if it does not exist
const queueEntryColumns = db
    .prepare("PRAGMA table_info(QueueEntry)")
    .all();

const hasPriorityColumn = queueEntryColumns.some(
    column => column.name === "priority"
);

if (!hasPriorityColumn) {
    db.exec(`
        ALTER TABLE QueueEntry
        ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium'
        CHECK(priority IN ('Low', 'Medium', 'High'))
    `);
}

// Export the database connection
module.exports = db;