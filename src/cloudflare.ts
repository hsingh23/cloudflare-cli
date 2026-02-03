import { join } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { CloudflareZone, DNSRecord, ZoneCache } from './types';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const CACHE_FILE = join(process.cwd(), '.zones-cache.json');

export class CloudflareClient {
    private apiToken: string;

    constructor(apiToken: string) {
        this.apiToken = apiToken;
    }

    private async fetchAPI(endpoint: string, options: RequestInit = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });
        const data = await response.json();

        if (!data.success) {
            throw new Error(`Cloudflare API Error: ${data.errors?.[0]?.message || 'Unknown error'}`);
        }

        return data;
    }

    async getAllZones(): Promise<CloudflareZone[]> {
        console.log('Fetching all zones from Cloudflare...');
        let zones: CloudflareZone[] = [];
        let page = 1;
        let totalPages = 1;

        do {
            const data = await this.fetchAPI(`/zones?per_page=50&page=${page}`);
            zones = zones.concat(data.result);
            const resultInfo = data.result_info;
            totalPages = resultInfo.total_pages;
            page++;
        } while (page <= totalPages);

        return zones;
    }

    saveCache(zones: CloudflareZone[]) {
        const cache: ZoneCache = {
            lastUpdated: new Date().toISOString(),
            zones,
        };
        writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
        console.log(`Saved ${zones.length} zones to cache at ${CACHE_FILE}`);
    }

    loadCache(): ZoneCache | null {
        if (!existsSync(CACHE_FILE)) {
            return null;
        }
        try {
            return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
        } catch (e) {
            console.error('Failed to parse cache file');
            return null;
        }
    }

    async getZoneId(domain: string): Promise<string> {
        // 1. Try cache first
        let cache = this.loadCache();
        if (cache) {
            // Find exact match or ending with domain (naive approach, refined below)
            // Actually we need to match the zone name.
            // e.g. record 'sub.example.com' belongs to zone 'example.com'
            // We search for the longest matching zone name ending.
            const parts = domain.split('.');
            // Try sub.example.com, then example.com, then com (unlikely)

            // We will iterate from full domain down to top level
            for (let i = 0; i < parts.length - 1; i++) {
                const potentialZone = parts.slice(i).join('.');
                const found = cache.zones.find(z => z.name === potentialZone);
                if (found) return found.id;
            }
        }

        // 2. If not found in cache or cache missing, refresh cache? 
        // The requirement says: "if I am talking about adding these records to a domain that's not in the cache, then call the API to list the zones"

        console.log(`Domain ${domain} not matched in cache. Refreshing zones...`);
        const zones = await this.getAllZones();
        this.saveCache(zones);

        // Retry search
        const parts = domain.split('.');
        for (let i = 0; i < parts.length - 1; i++) {
            const potentialZone = parts.slice(i).join('.');
            const found = zones.find(z => z.name === potentialZone);
            if (found) return found.id;
        }

        throw new Error(`No zone found for domain: ${domain}`);
    }

    async getDNSRecords(zoneId: string, name: string, type?: string): Promise<DNSRecord[]> {
        let query = `/zones/${zoneId}/dns_records?name=${name}`;
        if (type) query += `&type=${type}`;

        const data = await this.fetchAPI(query);
        return data.result;
    }

    async createDNSRecord(zoneId: string, record: Partial<DNSRecord>) {
        return this.fetchAPI(`/zones/${zoneId}/dns_records`, {
            method: 'POST',
            body: JSON.stringify(record),
        });
    }

    async updateDNSRecord(zoneId: string, recordId: string, record: Partial<DNSRecord>) {
        return this.fetchAPI(`/zones/${zoneId}/dns_records/${recordId}`, {
            method: 'PUT',
            body: JSON.stringify(record),
        });
    }

    async deleteDNSRecord(zoneId: string, recordId: string) {
        console.log(`Deleting record ${recordId}...`);
        return this.fetchAPI(`/zones/${zoneId}/dns_records/${recordId}`, {
            method: 'DELETE',
        });
    }

    async purgeCache(zoneId: string, options?: { purge_everything?: boolean; files?: string[]; tags?: string[]; hosts?: string[] }) {
        const body = options || { purge_everything: true };
        console.log(`Purging cache for zone ${zoneId}...`);
        return this.fetchAPI(`/zones/${zoneId}/purge_cache`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async listRedirectRules(zoneId: string): Promise<any[]> {
        try {
            const data = await this.fetchAPI(`/zones/${zoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`);
            return data.result?.rules || [];
        } catch (e: any) {
            // If no ruleset exists yet, return empty
            if (e.message?.includes('could not find a phase entry point ruleset')) {
                return [];
            }
            throw e;
        }
    }

    async createRedirectRule(zoneId: string, zoneName: string, fromHost: string, toHost: string, preservePath: boolean = true, statusCode: number = 301) {
        console.log(`Creating redirect rule: ${fromHost} -> ${toHost}...`);

        const ruleName = `Redirect ${fromHost} to ${toHost}`;

        const newRule = {
            action: 'redirect',
            action_parameters: {
                from_value: {
                    status_code: statusCode,
                    target_url: {
                        expression: preservePath
                            ? `concat("https://${toHost}", http.request.uri.path)`
                            : `"https://${toHost}/"`,
                    },
                    preserve_query_string: true,
                },
            },
            expression: `(http.host eq "${fromHost}")`,
            description: ruleName,
            enabled: true,
        };

        // Try to create a new ruleset first
        try {
            return await this.fetchAPI(`/zones/${zoneId}/rulesets`, {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Dynamic Redirects',
                    kind: 'zone',
                    phase: 'http_request_dynamic_redirect',
                    rules: [newRule],
                }),
            });
        } catch (e: any) {
            // If ruleset already exists, we need to update it
            if (e.message?.includes('already exists') || e.message?.includes('A phase entrypoint')) {
                console.log('Ruleset exists, fetching and updating...');

                const data = await this.fetchAPI(`/zones/${zoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`);
                const existingRuleset = data.result;

                // Check if rule already exists
                const existingRule = existingRuleset.rules?.find((r: any) =>
                    r.expression?.includes(`http.host eq "${fromHost}"`) ||
                    r.description === ruleName
                );

                if (existingRule) {
                    console.log(`Redirect rule already exists, updating...`);
                    const updatedRules = existingRuleset.rules.map((r: any) =>
                        r.id === existingRule.id ? { ...newRule, id: existingRule.id } : r
                    );

                    return this.fetchAPI(`/zones/${zoneId}/rulesets/${existingRuleset.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            ...existingRuleset,
                            rules: updatedRules,
                        }),
                    });
                } else {
                    // Add new rule to existing ruleset
                    return this.fetchAPI(`/zones/${zoneId}/rulesets/${existingRuleset.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            ...existingRuleset,
                            rules: [...(existingRuleset.rules || []), newRule],
                        }),
                    });
                }
            }
            throw e;
        }
    }
}

