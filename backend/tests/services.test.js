process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_key";
const request = require("supertest");
const { app } = require("../server");

describe("Module 2: Service Management API (/services)", () => {
    test("GET /services should return all initial services", async () => {
        const res = await request(app).get("/services");
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(5);
    });

    test("POST /services should create a new valid service", async () => {
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
        expect(res.body.service.status).toBe("Open");
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

    test("PUT /services/:id should update an existing service and toggle status", async () => {
        const res = await request(app).put("/services/1").send({
            name: "Updated Academic Advising",
            expectedDuration: 35,
            status: "Closed"
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.service.name).toBe("Updated Academic Advising");
        expect(res.body.service.status).toBe("Closed");

        // Re-open service 1 for subsequent queue tests
        await request(app).put("/services/1").send({ status: "Open" });
    });

    test("PUT /services/:id should return 404 for non-existent service", async () => {
        const res = await request(app).put("/services/9999").send({
            status: "Closed"
        });
        expect(res.statusCode).toBe(404);
    });

    test("PUT /services/:id should reject invalid update fields", async () => {
        const resName = await request(app).put("/services/1").send({ name: "" });
        expect(resName.statusCode).toBe(400);

        const resDur = await request(app).put("/services/1").send({ expectedDuration: 2000 });
        expect(resDur.statusCode).toBe(400);
    });
});