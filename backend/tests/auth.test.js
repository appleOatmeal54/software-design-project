
const request = require("supertest");
const { app, createAdmin } = require("../server");

// Automated tests for the QueueSmart Authentication Module
describe("Authentication Module", () => {

    // Create the test administrator before running the tests
    beforeAll(async () => {
        await createAdmin();
    });


    //  Verify that a new user can register successfully
    test("Should register a new user successfully", async () => {

        const response = await request(app)
            .post("/api/register")
            .send({
                email: "testuser@example.com",
                password: "Password123"
            });

        // Check successful registration
        expect(response.status).toBe(201);
        expect(response.body.message).toBe("User registered successfully");

        // Verify the account has the user role
        expect(response.body.user.role).toBe("user");

        // Make sure the password is not exposed
        expect(response.body.user.password).toBeUndefined();
    });


    //  Verify duplicate email registration is rejected
    test("Should reject duplicate email registration", async () => {

        // Register the first account
        const firstResponse = await request(app)
            .post("/api/register")
            .send({
                email: "duplicate@example.com",
                password: "Password123"
            });

        expect(firstResponse.status).toBe(201);

        // Attempt to register with the same email
        const response = await request(app)
            .post("/api/register")
            .send({
                email: "duplicate@example.com",
                password: "AnotherPass123"
            });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe("Email is already registered");
    });


    //  Verify missing registration fields are rejected
    test("Should reject registration with missing fields", async () => {

        const response = await request(app)
            .post("/api/register")
            .send({
                password: "Password123"
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Email and password must be provided as strings"
        );
    });


    //  Verify invalid email addresses are rejected
    test("Should reject invalid email format", async () => {

        const response = await request(app)
            .post("/api/register")
            .send({
                email: "invalidemail",
                password: "Password123"
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid email address");
    });


    // Verify passwords shorter than 8 characters are rejected
    test("Should reject passwords shorter than 8 characters", async () => {

        const response = await request(app)
            .post("/api/register")
            .send({
                email: "short@example.com",
                password: "Pass1"
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Password must be between 8 and 20 characters"
        );
    });


    // Verify passwords longer than 20 characters are rejected
    test("Should reject passwords longer than 20 characters", async () => {

        const response = await request(app)
            .post("/api/register")
            .send({
                email: "long@example.com",
                password: "Password123456789012345"
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Password must be between 8 and 20 characters"
        );
    });


    // Verify a registered user can log in
    test("Should log in a registered user successfully", async () => {

        // Register a user for this test
        const registration = await request(app)
            .post("/api/register")
            .send({
                email: "login@example.com",
                password: "Password123"
            });

        expect(registration.status).toBe(201);

        // Attempt to log in
        const response = await request(app)
            .post("/api/login")
            .send({
                email: "login@example.com",
                password: "Password123"
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Login successful");

        // Verify that a JWT was generated
        expect(response.body.token).toBeDefined();

        // Verify the correct role
        expect(response.body.user.role).toBe("user");

        // Ensure the password is not returned
        expect(response.body.user.password).toBeUndefined();
    });


    // Verify login fails with an incorrect password
    test("Should reject login with incorrect password", async () => {

        const response = await request(app)
            .post("/api/login")
            .send({
                email: "login@example.com",
                password: "WrongPassword123"
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Invalid email or password");
    });


    //  Verify login fails when the account does not exist
    test("Should reject login for nonexistent user", async () => {

        const response = await request(app)
            .post("/api/login")
            .send({
                email: "nonexistent@example.com",
                password: "Password123"
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Invalid email or password");
    });


    // : Verify protected APIs reject requests without a JWT
    test("Should reject protected API access without a token", async () => {

        const response = await request(app)
            .get("/api/admin/test");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication token required");
    });


    // Verify regular users cannot access administrator APIs
    test("Should reject administrator access for regular users", async () => {

        // Log in as a regular user
        const loginResponse = await request(app)
            .post("/api/login")
            .send({
                email: "login@example.com",
                password: "Password123"
            });

        expect(loginResponse.status).toBe(200);

        // Retrieve the user's JWT
        const token = loginResponse.body.token;

        // Attempt to access an administrator-only endpoint
        const response = await request(app)
            .get("/api/admin/test")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
            "Administrator access required"
        );
    });


    // Verify administrators can access protected APIs
    test("Should allow administrator access with a valid token", async () => {

        // Log in using the predefined administrator account
        const loginResponse = await request(app)
            .post("/api/login")
            .send({
                email: "admin@queuesmart.com",
                password: "Admin12345"
            });

        expect(loginResponse.status).toBe(200);

        // Retrieve the administrator's JWT
        const token = loginResponse.body.token;

        // Access the administrator-only endpoint
        const response = await request(app)
            .get("/api/admin/test")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe(
            "Administrator access granted"
        );

        // Verify the authenticated account is an administrator
        expect(response.body.user.role).toBe("admin");
    });
    
});
