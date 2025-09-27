import { KVDomainEntry } from '../types';
import { CACHE_CONFIG, KV_KEYS } from '../config/constants';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface DomainEntry {
  name: string;
  description: string;
  targetList: 'dns' | 'http' | 'both';
  addedAt: string;
}

export class PerformanceManager {
  private requestCache = new Map<string, Promise<any>>();
  private memoryCache = new Map<string, CacheEntry<any>>();

  constructor(private dnsKV: KVNamespace, private httpKV: KVNamespace) {}

  async batchKVUpdate(domains: DomainEntry[]): Promise<void> {
    const dnsOperations: Promise<void>[] = [];
    const httpOperations: Promise<void>[] = [];

    for (const domain of domains) {
      const kvEntry: KVDomainEntry = {
        domain: domain.name,
        description: domain.description,
        addedAt: domain.addedAt,
        syncedAt: new Date().toISOString(),
        source: 'manual'
      };

      const key = `${KV_KEYS.DOMAIN_PREFIX}${domain.name.toLowerCase()}`;
      const value = JSON.stringify(kvEntry);

      if (domain.targetList === 'dns' || domain.targetList === 'both') {
        dnsOperations.push(this.dnsKV.put(key, value));
      }

      if (domain.targetList === 'http' || domain.targetList === 'both') {
        httpOperations.push(this.httpKV.put(key, value));
      }
    }

    await Promise.all([...dnsOperations, ...httpOperations]);
  }

  async batchKVGet(keys: string[], namespace: 'dns' | 'http'): Promise<(string | null)[]> {
    const kv = namespace === 'dns' ? this.dnsKV : this.httpKV;
    const operations = keys.map(key => kv.get(key));
    return Promise.all(operations);
  }

  async getCachedData<T>(key: string, fetcher: () => Promise<T>, ttl: number = CACHE_CONFIG.SYNC_STATUS_TTL): Promise<T> {
    const cached = this.memoryCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl * 1000) {
      return cached.data;
    }
    const kvCacheKey = `${KV_KEYS.CACHE_PREFIX}${key}`;
    const kvCached = await this.dnsKV.get(kvCacheKey);

    if (kvCached) {
      const entry = JSON.parse(kvCached) as CacheEntry<T>;
      if ((Date.now() - entry.timestamp) < entry.ttl * 1000) {
        this.memoryCache.set(key, entry);
        return entry.data;
      }
    }
    const data = await fetcher();
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };
    this.memoryCache.set(key, entry);
    await this.dnsKV.put(kvCacheKey, JSON.stringify(entry), {
      expirationTtl: ttl
    });

    return data;
  }

  async withRequestDeduplication<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = this.requestCache.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    const promise = operation();
    this.requestCache.set(key, promise);

    try {
      const result = await promise;
      setTimeout(() => {
        this.requestCache.delete(key);
      }, CACHE_CONFIG.REQUEST_DEDUP_TTL * 1000);

      return result;
    } catch (error) {
      // Remove failed request from cache immediately
      this.requestCache.delete(key);
      throw error;
    }
  }

  async invalidateCache(pattern: string): Promise<void> {
    // Clear memory cache entries matching pattern
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // For KV cache, we'll let entries expire naturally since KV doesn't support pattern deletion
  }

  getCacheStats(): {
    memoryEntries: number;
    activeRequests: number;
  } {
    return {
      memoryEntries: this.memoryCache.size,
      activeRequests: this.requestCache.size
    };
  }

  clearMemoryCache(): void {
    this.memoryCache.clear();
    this.requestCache.clear();
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export function createRequestKey(request: Request, additionalParams?: string[]): string {
  const url = new URL(request.url);
  const parts = [
    request.method,
    url.pathname,
    url.search,
    ...(additionalParams || [])
  ];

  return parts.join('|');
}