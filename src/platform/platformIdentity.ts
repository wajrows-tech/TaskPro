export const PLATFORM_NAME = "TaskPro";

export const PLATFORM_PILLARS = [
    "taskpro",
    "rapid_photo",
    "claimsync"
] as const;

export type PlatformPillar = typeof PLATFORM_PILLARS[number];
 
