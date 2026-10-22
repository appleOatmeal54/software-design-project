
// In-memory mock data 

let queues = [
    // Service 1: Academic Advising
    { id: "q1", serviceId: "1", userName: "Maria Lopez", priority: "Medium", joinedAt: 1000 },
    { id: "q2", serviceId: "1", userName: "James Carter", priority: "Medium", joinedAt: 2000 },
    { id: "q3", serviceId: "1", userName: "Aisha Khan", priority: "Medium", joinedAt: 3000 },
    { id: "q4", serviceId: "1", userName: "Tom Nguyen", priority: "Medium", joinedAt: 4000 },

    // Service 2: Financial Aid Support
    { id: "q5", serviceId: "2", userName: "Lena Brooks", priority: "High", joinedAt: 1000 },
    { id: "q6", serviceId: "2", userName: "Omar Diaz", priority: "Medium", joinedAt: 2000 },

    // Service 3: Business & Payment
    { id: "q7", serviceId: "3", userName: "Noah Reed", priority: "Low", joinedAt: 1000 },
    { id: "q8", serviceId: "3", userName: "Ivy Chen", priority: "Low", joinedAt: 2000 },

    // Service 5: Veteran Services
    { id: "q9", serviceId: "5", userName: "Sam Hall", priority: "Medium", joinedAt: 1000 },
    { id: "q10", serviceId: "5", userName: "Rita Moss", priority: "Medium", joinedAt: 2000 },
    { id: "q11", serviceId: "5", userName: "Joe Park", priority: "Medium", joinedAt: 3000 }
];

module.exports = { queues };