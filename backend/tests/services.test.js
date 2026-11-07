
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_key";
const request = require("supertest");
const { app } = require("../server");
const db = require("../database");

// Mock the SQLite database methods
jest.mock("../database", () => {
    const mockStatement = {
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn()
    };

    return {
        prepare: jest.fn(() => mockStatement),
        transaction: jest.fn((callback) => callback)
    };
});

describe("Module 2: Service Management API (/services)", () => {
    let mockStatement;

    beforeAll(() => {
        mockStatement = db.prepare();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("GET /services should return all initial services", async () => {
        // Simulate the database returning 5 services
        mockStatement.all.mockReturnValue(
            Array(5).fill({
                service_id: 1,
                service_name: "Test",
                description: "Desc",
                expected_duration: 30,
                priority_level: "Medium"
            })
        );

        const res = await request(app).get("/services");
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(5);
    });

    test("POST /services should create a new valid service", async () => {
        mockStatement.run.mockReturnValue({ lastInsertRowid: 6 });

        mockStatement.get.mockReturnValue({
            service_id: 6,
            service_name: "IT Help Desk",
            description: "Laptop and campus Wi-Fi troubleshooting.",
            expected_duration: 25,
            priority_level: "High"
        });

        const newService = {
            name: "IT Help Desk",
            description: "Laptop and campus Wi-Fi troubleshooting.",
            expectedDuration: 25,
            priorityLevel: "High"
        };

        const res = await request(app).post("/services").send(newService);
        expect(res.statusCode).toBe(201);
        expect(res.body.service.name).toBe("IT Help Desk");
        expect(res.body.service.expectedDuration).toBe(25);
    });

    test("POST /services should reject missing required fields", async () => {
        const res = await request(app).post("/services").send({
            name: "Incomplete Service"
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test("POST /services should reject service name over 100 characters", async () => {
        const res = await request(app).post("/services").send({
            name: "A".repeat(101),
            description: "Valid description",
            expectedDuration: 20
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/100 characters/);
    });

    test("POST /services should reject invalid expectedDuration", async () => {
        const res = await request(app).post("/services").send({
            name: "Valid Name",
            description: "Valid description",
            expectedDuration: -10
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/between 1 and 1440/);
    });

test("PUT /services/:id should update an existing service", async () => {
    // Simulate finding the existing service in the database
    mockStatement.get
        .mockReturnValueOnce({
            service_id: 1,
            service_name: "Academic Advising",
            name: "Academic Advising",
            description: "Desc",
            expected_duration: 30,
            expectedDuration: 30,
            priority_level: "Medium",
            priorityLevel: "Medium",
            status: "Open"
        })
        .mockReturnValue({
            service_id: 1,
            service_name: "Updated Academic Advising",
            name: "Updated Academic Advising",
            description: "Desc",
            expected_duration: 35,
            expectedDuration: 35,
            priority_level: "Medium",
            priorityLevel: "Medium",
            status: "Open"
        });

    mockStatement.run.mockReturnValue({ changes: 1 });

    const res = await request(app).put("/services/1").send({
        name: "Updated Academic Advising",
        expectedDuration: 35
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.service.name).toBe("Updated Academic Advising");
    expect(res.body.service.expectedDuration).toBe(35);
});

    test("PUT /services/:id should return 404 for non-existent service", async () => {
        // Simulate the database finding nothing
        mockStatement.get.mockReturnValue(null);

        const res = await request(app).put("/services/9999").send({
            name: "Does Not Exist"
        });
        expect(res.statusCode).toBe(404);
    });

    test("PUT /services/:id should reject invalid update fields", async () => {
        // Simulate finding the existing service
        mockStatement.get.mockReturnValue({
            service_id: 1,
            service_name: "Valid",
            description: "Desc",
            expected_duration: 30,
            priority_level: "Medium"
        });

        const resName = await request(app).put("/services/1").send({ name: "" });
        expect(resName.statusCode).toBe(400);

        const resDur = await request(app).put("/services/1").send({ expectedDuration: 2000 });
        expect(resDur.statusCode).toBe(400);
    });
});
