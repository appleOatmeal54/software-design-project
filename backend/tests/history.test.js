const db = require("../database");
const { addHistory, getHistoryForUser } = require("../data/historyData");
const { createNonAdmin } = require("../data/users");

beforeAll(async () => {
    await createNonAdmin();
});

describe("History Database Functions", () => {

    test("Should add a history record using the user's email", () => {
        const result = addHistory(
            "user@queuesmart.com",
            "Academic Advising",
            "Served"
        );

        expect(result).toBeDefined();
        expect(result.userIdentifier).toBe("user@queuesmart.com");
        expect(result.serviceName).toBe("Academic Advising");
        expect(result.outcome).toBe("Served");
    });

    test("Should add a history record using the user's full name", () => {
        const result = addHistory(
            "Test User",
            "Academic Advising",
            "Left"
        );

        expect(result).toBeDefined();
        expect(result.userIdentifier).toBe("Test User");
        expect(result.outcome).toBe("Left");
    });

    test("Should return null when the user does not exist", () => {
        const result = addHistory(
            "missing@queuesmart.com",
            "Academic Advising",
            "Served"
        );

        expect(result).toBeNull();
    });

    test("Should return null when the service does not exist", () => {
        const result = addHistory(
            "user@queuesmart.com",
            "Nonexistent Service",
            "Served"
        );

        expect(result).toBeNull();
    });

    test("Should retrieve history for an existing user", () => {
        addHistory(
            "user@queuesmart.com",
            "Academic Advising",
            "Served"
        );

        const history = getHistoryForUser("user@queuesmart.com");

        expect(history.length).toBeGreaterThan(0);
        expect(history[0]).toHaveProperty("serviceName");
        expect(history[0]).toHaveProperty("outcome");
        expect(history[0]).toHaveProperty("date");
    });

    test("Should return an empty array for a nonexistent user", () => {
        const history = getHistoryForUser("missing@queuesmart.com");

        expect(history).toEqual([]);
    });

});