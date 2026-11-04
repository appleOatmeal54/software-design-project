CREATE TABLE IF NOT EXISTS Service (
    service_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL UNIQUE CHECK(length(service_name) <= 100),
    description TEXT NOT NULL,
    expected_duration INTEGER NOT NULL CHECK(expected_duration > 0),
    priority_level TEXT NOT NULL DEFAULT 'Medium' CHECK(priority_level IN ('Low', 'Medium', 'High')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'Closed'))
);

INSERT OR IGNORE INTO Service (service_name, description, expected_duration, priority_level, status) VALUES
('Academic Advising', 'Course selection, degree planning, and graduation audits.', 30, 'Medium', 'Open'),
('Financial Aid Support', 'FAFSA assistance, scholarships, and financial aid counseling.', 45, 'High', 'Open'),
('Business & Payment', 'Tuition payments, billing inquiries, and payment plans.', 15, 'Low', 'Open'),
('Registrar & Records', 'Transcripts, enrollment verification, and student records.', 15, 'Low', 'Closed'),
('Veteran Services', 'GI Bill benefits and military-affiliated student support.', 30, 'Medium', 'Open');