export interface SyncMetrics {
    jobsDiscovered: number;
    jobsSkipped: number;
    jobsHydrated: number;
    jobsUpserted: number;
    contactsUpserted: number;
    mediaItemsDiscovered: number;
    mediaQueued: number;
    errors: string[];
}

export interface AccuLynxJobProxyData {
    listData: any;
    bootstrap: any;
    ar: any;
    media: any[];
}
