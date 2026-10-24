
const historyRecords = [];

function addHistory(userEmail, serviceName, outcome) {
    const record = {
        id: Date.now().toString() +
            Math.random().toString(36).slice(2, 8),
        userEmail: userEmail.trim().toLowerCase(),
        date: new Date().toISOString(),
        serviceName,
        outcome
    };

    historyRecords.push(record);

    return record;
}

function getHistoryForUser(userEmail) {
    const normalizedEmail = userEmail.trim().toLowerCase();

    return historyRecords
        .filter(record => record.userEmail === normalizedEmail)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

module.exports = {
    historyRecords,
    addHistory,
    getHistoryForUser
};