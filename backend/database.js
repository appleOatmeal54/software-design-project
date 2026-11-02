const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const db = new Database(path.join(__dirname, "queuesmart.db"));

db.pragma("foreign_keys = ON");

// Read our user schema
const schema = fs.readFileSync(
    path.join(__dirname, "database", "user_schema.sql"),
    "utf8"
);


db.exec(schema);

module.exports = db;
