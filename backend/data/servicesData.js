// Central Mock database for the entire app (User & Admin) (Assignment 3)

let services = [
    { 
        id: "1", 
        name: "Academic Advising", 
        description: "General advising and degree planning.", 
        expectedDuration: 30, 
        priorityLevel: "Medium", 
        status: "Open" 
    },
    { 
        id: "2", 
        name: "Financial Aid Support", 
        description: "Assistance with FAFSA and scholarships.", 
        expectedDuration: 45, 
        priorityLevel: "High", 
        status: "Open" 

    },
    { 
        id: "3", 
        name: "Business & Payment", 
        description: "Handles Billing, Tuition payment, Refunds, Account holds", 
        expectedDuration: 15, 
        priorityLevel: "Low", 
        status: "Open" 
    },
    { 
        id: "4", 
        name: "Registrar & Records", 
        description: "Managing Course registration, transcripts, grades, graduation audits.", 
        expectedDuration: 15, 
        priorityLevel: "Low", 
        status: "Closed" 
    },
    { 
        id: "5", 
        name: "Veteran Services", 
        description: "Help Student Veterans.. etc manage military benefits.", 
        expectedDuration: 30,
        priorityLevel: "Medium", 
        status: "Open" 
    },
    
];

module.exports = { services };



