
const bcrypt = require("bcrypt");
const db = require("../database");

// Create a test administrator account when the server starts
async function createAdmin() {
    const email = "admin@queuesmart.com";

        // Check if the administrator already exists
        const existingAdmin = db.prepare(
            "SELECT user_id FROM UserCredentials WHERE email = ?"
        ).get(email);

        if (existingAdmin) {
            return;
        }

        // Hash the administrator password
        const hashedPassword = await bcrypt.hash("Admin12345", 10);

        // Insert administrator credentials and profile
        const insertAdmin = db.transaction(() => {

            const result = db.prepare(`
                INSERT INTO UserCredentials (email, password_hash, role)
                VALUES (?, ?, ?)
            `).run(email, hashedPassword, "admin");

            db.prepare(`
                INSERT INTO UserProfile (user_id, full_name, email)
                VALUES (?, ?, ?)
            `).run(Number(result.lastInsertRowid), "Administrator", email);
        });

        insertAdmin();
    }


// Create a NON-ADMIN account
async function createNonAdmin() {
    const email = "user@queuesmart.com";

        // Check if the user already exists
        const existingUser = db.prepare(
            "SELECT user_id FROM UserCredentials WHERE email = ?"
        ).get(email);

        if (existingUser) {
            return;
        }

        // Hash the test user's password
        const hashedPassword = await bcrypt.hash("User12345", 10);

        // Insert user credentials and profile
        const insertUser = db.transaction(() => {

            const result = db.prepare(`
                INSERT INTO UserCredentials (email, password_hash, role)
                VALUES (?, ?, ?)
            `).run(email, hashedPassword, "user");

            db.prepare(`
                INSERT INTO UserProfile (user_id, full_name, email)
                VALUES (?, ?, ?)
            `).run(Number(result.lastInsertRowid), "Test User", email);
        });

        insertUser();
    }
// Export the users array and administrator setup function
// Other backend files can import and use them
module.exports = { createAdmin, createNonAdmin };
