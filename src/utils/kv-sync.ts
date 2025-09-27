import { Env, KVDomainEntry } from '../types';
import { CloudflareAPI } from './cloudflare-api';

export class KVSync {
  private dnsKV: KVNamespace;
  private httpKV: KVNamespace;
  private cfApi: CloudflareAPI;

  constructor(env: Env) {
    this.dnsKV = env.DNS_DOMAINS_BACKUP;
    this.httpKV = env.HTTP_DOMAINS_BACKUP;
    this.cfApi = new CloudflareAPI(env);
  }

  private getKVKey(domain: string): string {
    return `domain:${domain.toLowerCase()}`;
  }

  async syncFromCloudflare(): Promise<{ dns: { imported: number; errors: number }, http: { imported: number; errors: number } }> {
    const dnsResult = await this.syncListToKV('dns');
    const httpResult = await this.syncListToKV('http');

    return { dns: dnsResult, http: httpResult };
  }

  private async syncListToKV(listType: 'dns' | 'http'): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;

    try {
      console.log(`Starting sync from Cloudflare ${listType.toUpperCase()} list to KV...`);

      const list = listType === 'dns'
        ? await this.cfApi.getDNSList()
        : await this.cfApi.getHTTPList();

      const kv = listType === 'dns' ? this.dnsKV : this.httpKV;

      if (!list.result || !list.result.items) {
        console.log(`No items to sync from Cloudflare ${listType.toUpperCase()} list`);
        return { imported, errors };
      }

      const syncTime = new Date().toISOString();
      const syncPromises: Promise<void>[] = [];

      for (const item of list.result.items) {
        const kvEntry: KVDomainEntry = {
          domain: item.value,
          description: item.comment || item.description || 'Imported from Cloudflare',
          addedAt: item.created_at || syncTime,
          syncedAt: syncTime,
          source: 'cloudflare'
        };

        syncPromises.push(
          kv.put(this.getKVKey(item.value), JSON.stringify(kvEntry))
            .then(() => {
              imported++;
              console.log(`Synced ${listType.toUpperCase()} domain: ${item.value}`);
            })
            .catch((error) => {
              errors++;
              console.error(`Failed to sync ${listType.toUpperCase()} domain ${item.value}:`, String(error));
            })
        );
      }

      await Promise.all(syncPromises);

      await kv.put('sync:last', JSON.stringify({
        timestamp: syncTime,
        imported,
        errors,
        total: list.result.items.length,
        listType
      }));

      console.log(`${listType.toUpperCase()} sync completed: ${imported} imported, ${errors} errors`);
      return { imported, errors };
    } catch (error) {
      console.error(`Sync from Cloudflare ${listType.toUpperCase()} list failed:`, String(error));
      return { imported, errors: errors + 1 };
    }
  }

  async addDomainToKV(domain: string, description: string, targetList: 'dns' | 'http' | 'both' = 'both'): Promise<void> {
    const kvEntry: KVDomainEntry = {
      domain,
      description,
      addedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      source: 'manual'
    };

    const promises: Promise<void>[] = [];

    if (targetList === 'dns' || targetList === 'both') {
      promises.push(this.dnsKV.put(this.getKVKey(domain), JSON.stringify(kvEntry)));
    }

    if (targetList === 'http' || targetList === 'both') {
      promises.push(this.httpKV.put(this.getKVKey(domain), JSON.stringify(kvEntry)));
    }

    await Promise.all(promises);

    const targets = targetList === 'both' ? 'both DNS and HTTP' : targetList.toUpperCase();
    console.log(`Added domain to ${targets} KV backup: ${domain}`);
  }

  async getDomainFromKV(domain: string, listType: 'dns' | 'http' = 'dns'): Promise<KVDomainEntry | null> {
    const kv = listType === 'dns' ? this.dnsKV : this.httpKV;
    const data = await kv.get(this.getKVKey(domain));
    if (!data) return null;

    return JSON.parse(data) as KVDomainEntry;
  }

  async getAllDomainsFromKV(listType?: 'dns' | 'http'): Promise<{ dns: KVDomainEntry[], http: KVDomainEntry[] } | KVDomainEntry[]> {
    if (listType) {
      return this.getDomainsFromSpecificKV(listType);
    }

    // Return both DNS and HTTP domains
    const dnsPromise = this.getDomainsFromSpecificKV('dns');
    const httpPromise = this.getDomainsFromSpecificKV('http');

    const [dns, http] = await Promise.all([dnsPromise, httpPromise]);

    return { dns, http };
  }

  private async getDomainsFromSpecificKV(listType: 'dns' | 'http'): Promise<KVDomainEntry[]> {
    const domains: KVDomainEntry[] = [];
    const kv = listType === 'dns' ? this.dnsKV : this.httpKV;

    const list = await kv.list({ prefix: 'domain:' });

    for (const key of list.keys) {
      const data = await kv.get(key.name);
      if (data) {
        domains.push(JSON.parse(data) as KVDomainEntry);
      }
    }

    return domains.sort((a, b) =>
      new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }

  async getLastSyncInfo(listType?: 'dns' | 'http'): Promise<any> {
    if (listType) {
      const kv = listType === 'dns' ? this.dnsKV : this.httpKV;
      const data = await kv.get('sync:last');
      return data ? JSON.parse(data) : null;
    }

    // Return sync info for both
    const dnsPromise = this.dnsKV.get('sync:last');
    const httpPromise = this.httpKV.get('sync:last');

    const [dnsData, httpData] = await Promise.all([dnsPromise, httpPromise]);

    return {
      dns: dnsData ? JSON.parse(dnsData) : null,
      http: httpData ? JSON.parse(httpData) : null
    };
  }

  async checkAndInitializeSync(): Promise<void> {
    const lastSyncInfo = await this.getLastSyncInfo();

    // Check DNS sync
    await this.checkAndSyncList('dns', lastSyncInfo.dns);

    // Check HTTP sync
    await this.checkAndSyncList('http', lastSyncInfo.http);
  }

  private async checkAndSyncList(listType: 'dns' | 'http', lastSync: any): Promise<void> {
    if (!lastSync) {
      console.log(`No previous ${listType.toUpperCase()} sync found, initializing KV backup from Cloudflare...`);
      await this.syncListToKV(listType);
    } else {
      const lastSyncTime = new Date(lastSync.timestamp);
      const hoursSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceSync > 24) {
        console.log(`Last ${listType.toUpperCase()} sync was ${hoursSinceSync.toFixed(1)} hours ago, re-syncing...`);
        await this.syncListToKV(listType);
      } else {
        console.log(`Last ${listType.toUpperCase()} sync was ${hoursSinceSync.toFixed(1)} hours ago, skipping sync`);
      }
    }
  }
}