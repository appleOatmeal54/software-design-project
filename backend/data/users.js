
const bcrypt = require("bcrypt");

// Store registered users in memory instead of a database
const users = [];

// Create a test administrator account when the server starts
async function createAdmin() {

    // Hash the administrator's password before storing it
    const hashedPassword = await bcrypt.hash("Admin12345", 10);

    // Add the administrator to our users array
    users.push({
        id: 1,
        email: "admin@queuesmart.com",
        password: hashedPassword,
        role: "admin"
    });
}
// Export the users array and administrator setup function
// Other backend files can import and use them
module.exports = { users, createAdmin };
