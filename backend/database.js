const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

// Check whether this is a brand-new database BEFORE connecting.
const databasePath = path.join(__dirname, "queuesmart.db");
const isNewDatabase = !fs.existsSync(databasePath);

// Connect to the SQLite database.
const db = new Database(databasePath);

// Enable foreign key enforcement.
db.pragma("foreign_keys = ON");

// Load and execute database schemas.
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

// Database migration: add priority column if it does not exist.
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

// Add demo users and queue entries ONLY to a brand-new database.
if (isNewDatabase) {
    const demoPeople = {
        "Academic Advising": [
            { name: "Malcolm Lawson", email: "aa1@queuesmart.test", priority: "High" },
            { name: "Elias Stewart", email: "aa2@queuesmart.test", priority: "Medium" },
            { name: "Alexander Rozhenkho", email: "aa3@queuesmart.test", priority: "Low" }
        ],

        "Financial Aid Support": [
            { name: "Cody Anderson", email: "fas1@queuesmart.test", priority: "High" },
            { name: "Liam Carver", email: "fas2@queuesmart.test", priority: "High" },
            { name: "Jeremy Mitchell", email: "fas3@queuesmart.test", priority: "Medium" },
            { name: "Harry Hanes", email: "fas4@queuesmart.test", priority: "Medium" },
            { name: "Aaron Stone", email: "fas5@queuesmart.test", priority: "Medium" },
            { name: "Isabella Garcia", email: "fas6@queuesmart.test", priority: "Low" },
            { name: "Candace Lee", email: "fas7@queuesmart.test", priority: "Low" },
            { name: "Nancy Lawson", email: "fas8@queuesmart.test", priority: "Low" }
        ],

        "Business & Payment": [
            { name: "Grace Whitney", email: "bap1@queuesmart.test", priority: "High" },
            { name: "Geoffrey Lawson", email: "bap2@queuesmart.test", priority: "Medium" },
            { name: "Dorothy Williams", email: "bap3@queuesmart.test", priority: "Medium" },
            { name: "Polly Maloney", email: "bap4@queuesmart.test", priority: "Low" },
            { name: "Henry Mills", email: "bap5@queuesmart.test", priority: "Low" }
        ],

        "Veteran Services": [
            { name: "Dave Pierce", email: "vs1@queuesmart.test", priority: "Medium" }
        ]
    };

    const demoPasswordHash = bcrypt.hashSync("QueueSmartDemo123!", 10);
    const seedDemoData = db.transaction(() => {

        // Make sure every default service has an associated queue.
        db.prepare(`
            INSERT INTO Queue (service_id, status)
            SELECT s.service_id, LOWER(s.status)
            FROM Service s
            WHERE NOT EXISTS (
                SELECT 1
                FROM Queue q
                WHERE q.service_id = s.service_id
            )
        `).run();

        const findService = db.prepare(`
            SELECT service_id
            FROM Service
            WHERE service_name = ?
        `);

        const findQueue = db.prepare(`
            SELECT queue_id
            FROM Queue
            WHERE service_id = ?
        `);

        const insertUser = db.prepare(`
            INSERT INTO UserCredentials (email, password_hash, role)
            VALUES (?, ?, 'user')
        `);

        const insertProfile = db.prepare(`
            INSERT INTO UserProfile (user_id, full_name, email)
            VALUES (?, ?, ?)
        `);

        const insertQueueEntry = db.prepare(`
            INSERT INTO QueueEntry (
                queue_id,
                user_id,
                position,
                priority,
                status
            )
            VALUES (?, ?, ?, ?, 'waiting')
        `);

        for (const [serviceName, people] of Object.entries(demoPeople)) {

            const service = findService.get(serviceName);

            if (!service) {
                continue;
            }

            const queue = findQueue.get(service.service_id);

            if (!queue) {
                continue;
            }

            let position = 1;

            for (const person of people) {

                const userResult = insertUser.run(
                    person.email,
                    demoPasswordHash
                );

                const userId = Number(userResult.lastInsertRowid);

                insertProfile.run(
                    userId,
                    person.name,
                    person.email
                );

                insertQueueEntry.run(
                    queue.queue_id,
                    userId,
                    position,
                    person.priority
                );

                position++;
            }

            // Make queue positions follow the existing priority order.
            const entries = db.prepare(`
                SELECT entry_id
                FROM QueueEntry
                WHERE queue_id = ?
                AND status = 'waiting'
                ORDER BY
                    CASE priority
                        WHEN 'High' THEN 1
                        WHEN 'Medium' THEN 2
                        WHEN 'Low' THEN 3
                        ELSE 4
                    END,
                    join_time ASC,
                    entry_id ASC
            `).all(queue.queue_id);

            const updatePosition = db.prepare(`
                UPDATE QueueEntry
                SET position = ?
                WHERE entry_id = ?
            `);

            entries.forEach((entry, index) => {
                updatePosition.run(index + 1, entry.entry_id);
            });
        }
    });

    seedDemoData();
}

// Export the database connection.
module.exports = db;