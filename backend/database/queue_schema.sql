-- Queue table: stores queues associated with services
CREATE TABLE IF NOT EXISTS Queue (
    queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK(status IN ('open', 'closed')),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (service_id)
        REFERENCES Service(service_id)
);

-- QueueEntry table: stores each user's queue activity
CREATE TABLE IF NOT EXISTS QueueEntry (
    entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    position INTEGER NOT NULL CHECK(position > 0),
    reason TEXT,
    join_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK(status IN ('waiting', 'served', 'canceled')),

    FOREIGN KEY (queue_id)
        REFERENCES Queue(queue_id),
    FOREIGN KEY (user_id)
        REFERENCES UserCredentials(user_id)
);

-- NotificationHistory table: permanently stores user notifications
CREATE TABLE IF NOT EXISTS NotificationHistory (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT 'Queue Update',
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general',
    service_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'sent'
        CHECK(status IN ('sent', 'viewed')),

    FOREIGN KEY (user_id)
        REFERENCES UserCredentials(user_id),
    FOREIGN KEY (service_id)
        REFERENCES Service(service_id)
);

-- Indexes to make retrieving individual users' records faster
CREATE INDEX IF NOT EXISTS idx_queueentry_user
ON QueueEntry(user_id);

CREATE INDEX IF NOT EXISTS idx_notificationhistory_user
ON NotificationHistory(user_id);

-- QueueHistory: stores each individual queue activity
CREATE TABLE IF NOT EXISTS QueueHistory (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_id INTEGER,
    service_name TEXT NOT NULL,
    outcome TEXT NOT NULL
        CHECK(outcome IN ('Joined', 'Left', 'Removed', 'Served')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES UserCredentials(user_id),
    FOREIGN KEY (service_id)
        REFERENCES Service(service_id)
);

CREATE INDEX IF NOT EXISTS idx_queuehistory_user
ON QueueHistory(user_id);