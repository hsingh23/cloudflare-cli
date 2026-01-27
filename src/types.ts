export interface CloudflareZone {
    id: string;
    name: string;
    status: string;
}

export interface DNSRecord {
    id: string;
    type: string;
    name: string;
    content: string;
    proxied: boolean;
    ttl: number;
    priority?: number;
}

export interface ZoneCache {
    lastUpdated: string;
    zones: CloudflareZone[];
}
