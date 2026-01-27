#!/usr/bin/env bun
import { CloudflareClient } from './cloudflare';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.config', 'cloudflare-cli');
const TOKEN_FILE = join(CONFIG_DIR, 'token');

function getToken(): string | null {
    if (process.env.CLOUDFLARE_API_TOKEN) {
        return process.env.CLOUDFLARE_API_TOKEN;
    }
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
        case 'yml':
            records = Bun.YAML.parse(content);
            break;
        case 'toml': {
            const parsed = Bun.TOML.parse(content);
            records = (parsed as any).records || Object.values(parsed);
            break;
        }
        case 'jsonl':
            records = content.trim().split('\n').map(line => JSON.parse(line));
            break;
        case 'json5':
            records = Bun.JSON5.parse(content);
            break;
        case 'json':
        default:
            records = JSON.parse(content);
    }

    if (!Array.isArray(records)) {
        throw new Error('Batch file must contain an array of records.');
    }

    return records;
}

async function upsertRecord(client: CloudflareClient, domain: string, content: string, type: string, proxied: boolean, priority?: number, ttl: number = 1) {
    const zoneId = await client.getZoneId(domain);
    const existingRecords = await client.getDNSRecords(zoneId, domain, type);
    const allowMultiple = ['MX', 'TXT', 'NS', 'SRV'].includes(type);

    let targetRecord = existingRecords.find(r => r.name === domain && r.type === type);
    if (allowMultiple) {
        targetRecord = existingRecords.find(r => r.name === domain && r.type === type && r.content === content);
    }

    const recordData: any = { type, name: domain, content, ttl, proxied, priority };

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

// Simple CLI parser (no deps needed)
const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
    const idx = args.findIndex(a => a === `--${name}`);
    if (idx !== -1 && args[idx + 1]) return args[idx + 1];
    return undefined;
}

function hasFlag(name: string): boolean {
    return args.includes(`--${name}`);
}

function showHelp() {
    console.log(`cloudflare-cli - Manage Cloudflare DNS records

Usage:
  cloudflare-cli <command> [options]

Commands:
  init                           Initialize zones cache
    --token <token>              Save API token locally

  add <domain> <target> [type]   Add or update a DNS record
    --proxied <true|false>       Enable/disable Cloudflare proxy

  batch <file>                   Process batch records (JSON, YAML, TOML, JSONL, JSON5)

Options:
  -h, --help                     Show this help message
`);
}

async function main() {
    if (!command || command === '-h' || command === '--help') {
        showHelp();
        return;
    }

    switch (command) {
        case 'init': {
            const token = getFlag('token');
            if (token) saveToken(token);
            const client = getClient();
            const zones = await client.getAllZones();
            client.saveCache(zones);
            break;
        }
        case 'add':
        case 'add-record': {
            const domain = args[1];
            const target = args[2];
            const type = (args[3] || 'CNAME').toUpperCase();

            if (!domain || !target) {
                console.error('Usage: cloudflare-cli add <domain> <target> [type]');
                process.exit(1);
            }

            const client = getClient();
            let isProxied = true;
            const proxiedFlag = getFlag('proxied');
            if (proxiedFlag !== undefined) {
                isProxied = proxiedFlag === 'true';
            } else if (['MX', 'TXT', 'SRV', 'NS'].includes(type)) {
                isProxied = false;
                console.log(`Auto-disabling proxy for ${type} record.`);
            }

            console.log(`Processing ${domain} -> ${target} (${type}, proxied: ${isProxied})...`);
            await upsertRecord(client, domain, target, type, isProxied);
            break;
        }
        case 'batch': {
            const file = args[1];
            if (!file) {
                console.error('Usage: cloudflare-cli batch <file>');
                process.exit(1);
            }

            const client = getClient();
            const records = await parseRecordsFile(file);
            console.log(`Processing ${records.length} records from batch...`);

            for (const rec of records) {
                const type = (rec.type || 'CNAME').toUpperCase();
                let proxied = rec.proxied;
                if (proxied === undefined) {
                    proxied = !['MX', 'TXT', 'SRV', 'NS'].includes(type);
                }
                console.log(`Batch Item: ${rec.name} (${type})`);
                await upsertRecord(client, rec.name, rec.content, type, proxied, rec.priority, rec.ttl);
            }
            break;
        }
        default:
            console.error(`Unknown command: ${command}`);
            showHelp();
            process.exit(1);
    }
}

main().catch(err => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
});
