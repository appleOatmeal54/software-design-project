process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_key";
const request = require("supertest");
const { app } = require("../server");

describe("Module 3: Queue Management API (/queue)", () => {
    test("GET /queue should return all queue entries and filter by serviceId", async () => {
        const allRes = await request(app).get("/queue");
        expect(allRes.statusCode).toBe(200);
        expect(Array.isArray(allRes.body)).toBe(true);

        const filteredRes = await request(app).get("/queue?serviceId=1");
        expect(filteredRes.statusCode).toBe(200);
        expect(Array.isArray(filteredRes.body)).toBe(true);
    });

    test("GET /queue/:serviceId should return sorted queue or 404 if not found", async () => {
        const res = await request(app).get("/queue/1");
        expect(res.statusCode).toBe(200);
        expect(res.body.queue).toBeDefined();

        const notFound = await request(app).get("/queue/9999");
        expect(notFound.statusCode).toBe(404);
    });

    test("POST /queue/join should add a user, sort by priority, and estimate wait time", async () => {
        const res = await request(app).post("/queue/join").send({
            serviceId: "1",
            userName: "Priority Student",
            priority: "High"
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.position).toBe(1); // High priority jumps ahead of Medium entries
        expect(res.body.estimatedWaitTime).toBeGreaterThan(0);
    });

    test("POST /queue/join should reject duplicate users, closed queues, and invalid inputs", async () => {
        // Missing fields
        const missingRes = await request(app).post("/queue/join").send({ serviceId: "1" });
        expect(missingRes.statusCode).toBe(400);

        // Invalid userName length
        const longNameRes = await request(app).post("/queue/join").send({
            serviceId: "1",
            userName: "B".repeat(101)
        });
        expect(longNameRes.statusCode).toBe(400);

        // Duplicate user in same queue
        const dupRes = await request(app).post("/queue/join").send({
            serviceId: "1",
            userName: "Priority Student"
        });
        expect(dupRes.statusCode).toBe(400);

        // Closed queue (Service 4 is Closed by default)
        const closedRes = await request(app).post("/queue/join").send({
            serviceId: "4",
            userName: "Test User"
        });
        expect(closedRes.statusCode).toBe(400);

        // Invalid priority level
        const badPriority = await request(app).post("/queue/join").send({
            serviceId: "1",
            userName: "Another User",
            priority: "Urgent"
        });
        expect(badPriority.statusCode).toBe(400);
    });

    test("POST /queue/serve should serve the highest-priority user first", async () => {
        const res = await request(app).post("/queue/serve").send({ serviceId: "1" });
        expect(res.statusCode).toBe(200);
        expect(res.body.servedUser.userName).toBe("Priority Student");
    });

    test("POST /queue/serve should reject missing serviceId or empty queue", async () => {
        const missingId = await request(app).post("/queue/serve").send({});
        expect(missingId.statusCode).toBe(400);

        const emptyQueue = await request(app).post("/queue/serve").send({ serviceId: "4" });
        expect(emptyQueue.statusCode).toBe(400);
    });

    test("POST /queue/leave should remove a user from the queue or return 404/400", async () => {
        const leaveRes = await request(app).post("/queue/leave").send({
            serviceId: "1",
            userName: "Maria Lopez"
        });
        expect(leaveRes.statusCode).toBe(200);

        const notFoundRes = await request(app).post("/queue/leave").send({
            serviceId: "1",
            userName: "NonExistent User"
        });
        expect(notFoundRes.statusCode).toBe(404);

        const invalidRes = await request(app).post("/queue/leave").send({ serviceId: "1" });
        expect(invalidRes.statusCode).toBe(400);
    });
});