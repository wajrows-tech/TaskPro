export const AGENT_DOMAIN_RULES = {
    platform: "TaskPro",

    pillars: {
        taskpro: "core CRM operations",
        rapid_photo: "inspection reporting",
        claimsync: "claims intelligence"
    },

    restrictions: [
        "TaskPro is the canonical platform identity",
        "ClaimSync is a subsystem pillar only",
        "Subsystem pillars must never rename or replace the platform identity"
    ]
};
 
 
