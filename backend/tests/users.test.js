const db = require("../database");
const { createAdmin, createNonAdmin } = require("../data/users");

describe("User Database Functions", () => {

    test("Should create a regular user successfully", async () => {
        await createNonAdmin();

        const user = db.prepare(`
            SELECT user_id, email, role
            FROM UserCredentials
            WHERE email = ?
        `).get("user@queuesmart.com");

        expect(user).toBeDefined();
        expect(user.email).toBe("user@queuesmart.com");
        expect(user.role).toBe("user");

        const profile = db.prepare(`
            SELECT full_name, email
            FROM UserProfile
            WHERE user_id = ?
        `).get(user.user_id);

        expect(profile).toBeDefined();
        expect(profile.full_name).toBe("Test User");
        expect(profile.email).toBe("user@queuesmart.com");
    });

    test("Should not create duplicate regular user accounts", async () => {
        await createNonAdmin();
        await createNonAdmin();

        const users = db.prepare(`
            SELECT user_id
            FROM UserCredentials
            WHERE email = ?
        `).all("user@queuesmart.com");

        expect(users).toHaveLength(1);
    });

    test("Should create an administrator successfully", async () => {
        await createAdmin();

        const admin = db.prepare(`
            SELECT user_id, email, role
            FROM UserCredentials
            WHERE email = ?
        `).get("admin@queuesmart.com");

        expect(admin).toBeDefined();
        expect(admin.role).toBe("admin");

        const profile = db.prepare(`
            SELECT full_name, email
            FROM UserProfile
            WHERE user_id = ?
        `).get(admin.user_id);

        expect(profile).toBeDefined();
        expect(profile.full_name).toBe("Administrator");
    });

    test("Should not create duplicate administrator accounts", async () => {
        await createAdmin();
        await createAdmin();

        const admins = db.prepare(`
            SELECT user_id
            FROM UserCredentials
            WHERE email = ?
        `).all("admin@queuesmart.com");

        expect(admins).toHaveLength(1);
    });

});