#!/usr/bin/env bun
import cac from 'cac';
import { CloudflareClient } from './cloudflare';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const cli = cac('cloudflare-cli');
const CONFIG_DIR = join(homedir(), '.config', 'cloudflare-cli');
const TOKEN_FILE = join(CONFIG_DIR, 'token');

function getToken(): string | null {
    // 1. Check environment variable first
    if (process.env.CLOUDFLARE_API_TOKEN) {
        return process.env.CLOUDFLARE_API_TOKEN;
    }
    // 2. Check local config file
    if (existsSync(TOKEN_FILE)) {
        return readFileSync(TOKEN_FILE, 'utf-8').trim();
    }
    return null;
}

function saveToken(token: string) {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
    console.log(`Token saved to ${TOKEN_FILE}`);
}

function getClient(): CloudflareClient {
    const token = getToken();
    if (!token) {
        console.error('Error: No Cloudflare API token found.');
        console.error('Set CLOUDFLARE_API_TOKEN env var or run: cloudflare-cli init --token <your-token>');
        process.exit(1);
    }
    return new CloudflareClient(token);
}

async function parseRecordsFile(file: string): Promise<any[]> {
    const ext = file.split('.').pop()?.toLowerCase();
    const content = await Bun.file(file).text();

    let records: any[];

    switch (ext) {
        case 'yaml':
        case 'yml': {
            // Bun doesn't have native YAML, use a simple parser or import
            const YAML = await import('yaml');
            records = YAML.parse(content);
            break;
        }
        case 'toml': {
            // Bun supports TOML natively
            const TOML = await import('toml');
            const parsed = TOML.parse(content);
            records = parsed.records || Object.values(parsed);
            break;
        }
        case 'jsonl': {
            // JSON Lines: one JSON object per line
            records = content.trim().split('\n').map(line => JSON.parse(line));
            break;
        }
        case 'json5': {
            const JSON5 = await import('json5');
            records = JSON5.parse(content);
            break;
        }
        case 'json':
        default:
            records = JSON.parse(content);
    }

    if (!Array.isArray(records)) {
        throw new Error('Batch file must contain an array of records.');
    }

    return records;
}

cli.command('init', 'Initialize zones cache and optionally save token')
    .option('--token <token>', 'Save Cloudflare API token locally')
    .action(async (options: any) => {
        try {
            if (options.token) {
                saveToken(options.token);
            }

            const client = getClient();
            const zones = await client.getAllZones();
            client.saveCache(zones);
        } catch (error: any) {
            console.error(`Failed to initialize: ${error.message}`);
            process.exit(1);
        }
    });

cli.command('add <domain> <target> [type]', 'Add or update a DNS record')
    .alias('add-record')
    .option('--proxied [value]', 'Proxy through Cloudflare (true/false)', { default: undefined })
    .action(async (domain: string, target: string, type: string, options: any) => {
        try {
            const client = getClient();
            const recordType = type ? type.toUpperCase() : 'CNAME';

            let isProxied = true;
            if (options.proxied !== undefined) {
                isProxied = options.proxied === true || options.proxied === 'true';
            } else {
                if (['MX', 'TXT', 'SRV', 'NS'].includes(recordType)) {
                    isProxied = false;
                    console.log(`Auto-disabling proxy for ${recordType} record.`);
                }
            }

            console.log(`Processing ${domain} -> ${target} (${recordType}, proxied: ${isProxied})...`);
            await upsertRecord(client, domain, target, recordType, isProxied);

        } catch (error: any) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    });

cli.command('batch <file>', 'Process batch DNS records (JSON, YAML, TOML, JSONL, JSON5)')
    .action(async (file: string) => {
        try {
            const client = getClient();
            const records = await parseRecordsFile(file);

            console.log(`Processing ${records.length} records from batch...`);

            for (const rec of records) {
                const type = (rec.type || 'CNAME').toUpperCase();
                let proxied = rec.proxied;
                if (proxied === undefined) {
                    if (['MX', 'TXT', 'SRV', 'NS'].includes(type)) proxied = false;
                    else proxied = true;
                }

                console.log(`Batch Item: ${rec.name} (${type})`);
                await upsertRecord(client, rec.name, rec.content, type, proxied, rec.priority, rec.ttl);
            }

        } catch (error: any) {
            console.error(`Batch Error: ${error.message}`);
            process.exit(1);
        }
    });

async function upsertRecord(client: CloudflareClient, domain: string, content: string, type: string, proxied: boolean, priority?: number, ttl: number = 1) {
    const zoneId = await client.getZoneId(domain);
    const existingRecords = await client.getDNSRecords(zoneId, domain, type);
    const allowMultiple = ['MX', 'TXT', 'NS', 'SRV'].includes(type);

    let targetRecord = existingRecords.find(r => r.name === domain && r.type === type);
    if (allowMultiple) {
        targetRecord = existingRecords.find(r => r.name === domain && r.type === type && r.content === content);
    }

    const recordData: any = {
        type,
        name: domain,
        content,
        ttl,
        proxied,
        priority
    };

    if (targetRecord) {
        if (allowMultiple && targetRecord.content === content && targetRecord.priority === priority) {
            console.log(`Record match found, skipping: ${domain} ${type}`);
            return;
        }

        if (!allowMultiple) {
            console.log(`Updating existing record ${domain} (${type})...`);
            await client.updateDNSRecord(zoneId, targetRecord.id, recordData);
            console.log('Updated.');
        } else {
            console.log(`Creating additional record for ${domain} (${type})...`);
            await client.createDNSRecord(zoneId, recordData);
            console.log('Created.');
        }
    } else {
        console.log(`Creating new record ${domain} (${type})...`);
        await client.createDNSRecord(zoneId, recordData);
        console.log('Created.');
    }
}

cli.help();
cli.parse();
