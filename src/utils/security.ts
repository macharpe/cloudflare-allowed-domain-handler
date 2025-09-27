import { Env } from '../types';
import { RATE_LIMITS, SECURITY_CONFIG, KV_KEYS, CACHE_CONFIG } from '../config/constants';

export interface SecurityEvent {
  type: 'rate_limit' | 'suspicious_input' | 'blocked_request' | 'validation_failure';
  ip: string;
  userAgent: string;
  timestamp: string;
  details: string;
  endpoint?: string;
}

export class SecurityManager {
  constructor(private env: Env) {}

  async validateEnvironment(env: Env): Promise<void> {
    const required = [
      'CF_ACCOUNT_ID',
      'CF_API_TOKEN',
      'CF_DNS_LIST_ID',
      'CF_HTTP_LIST_ID',
      'DNS_DOMAINS_BACKUP',
      'HTTP_DOMAINS_BACKUP'
    ];

    for (const key of required) {
      if (!env[key as keyof Env]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
  }

  async checkRateLimit(ip: string, endpoint: string): Promise<boolean> {
    const key = `${KV_KEYS.RATE_LIMIT_PREFIX}${ip}:${endpoint}`;
    const now = Math.floor(Date.now() / 1000);
    const window = CACHE_CONFIG.RATE_LIMIT_WINDOW;

    try {
      const stored = await this.env.DNS_DOMAINS_BACKUP.get(key);
      const data = stored ? JSON.parse(stored) : { count: 0, window: now };
      if (now - data.window > window) {
        data.count = 0;
        data.window = now;
      }
      const limit = endpoint === '/api/add-domain'
        ? RATE_LIMITS.DOMAIN_ADDITIONS_PER_HOUR
        : RATE_LIMITS.API_REQUESTS_PER_MINUTE;

      if (data.count >= limit) {
        await this.logSecurityEvent({
          type: 'rate_limit',
          ip,
          userAgent: '',
          timestamp: new Date().toISOString(),
          details: `Rate limit exceeded: ${data.count}/${limit}`,
          endpoint
        });
        return false;
      }
      data.count++;
      await this.env.DNS_DOMAINS_BACKUP.put(key, JSON.stringify(data), {
        expirationTtl: window
      });

      return true;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true;
    }
  }

  async validateInput(input: string, type: 'domain' | 'description' | 'general'): Promise<boolean> {
    for (const pattern of SECURITY_CONFIG.SUSPICIOUS_PATTERNS) {
      if (input.toLowerCase().includes(pattern.toLowerCase())) {
        return false;
      }
    }
    switch (type) {
      case 'domain':
        return input.length <= 255 && input.length > 0;
      case 'description':
        return input.length <= 500 && input.length >= 1;
      case 'general':
        return input.length <= 1000;
    }

    return true;
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const key = `${KV_KEYS.SECURITY_LOG_PREFIX}${Date.now()}:${event.ip}`;
      await this.env.DNS_DOMAINS_BACKUP.put(key, JSON.stringify(event), {
        expirationTtl: 86400 * 7
      });

      console.warn('Security Event:', {
        type: event.type,
        ip: event.ip,
        details: event.details,
        endpoint: event.endpoint
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  isBlockedUserAgent(userAgent: string): boolean {
    if (!userAgent) return false;

    const lowerUA = userAgent.toLowerCase();
    return SECURITY_CONFIG.BLOCKED_USER_AGENTS.some(blocked =>
      lowerUA.includes(blocked.toLowerCase())
    );
  }

  async validateRequest(request: Request): Promise<{ valid: boolean; reason?: string }> {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || '';
    const url = new URL(request.url);
    if (this.isBlockedUserAgent(userAgent)) {
      await this.logSecurityEvent({
        type: 'blocked_request',
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        details: 'Blocked user agent',
        endpoint: url.pathname
      });
      return { valid: false, reason: 'Blocked user agent' };
    }
    if (url.pathname.startsWith('/api/')) {
      const withinLimit = await this.checkRateLimit(ip, url.pathname);
      if (!withinLimit) {
        return { valid: false, reason: 'Rate limit exceeded' };
      }
    }
    if (request.method === 'POST') {
      const contentLength = parseInt(request.headers.get('Content-Length') || '0');
      if (contentLength > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
        await this.logSecurityEvent({
          type: 'blocked_request',
          ip,
          userAgent,
          timestamp: new Date().toISOString(),
          details: `Request too large: ${contentLength} bytes`,
          endpoint: url.pathname
        });
        return { valid: false, reason: 'Request too large' };
      }
    }

    return { valid: true };
  }
}

export function validateEnvironment(env: Env): void {
  const required = [
    'CF_ACCOUNT_ID',
    'CF_API_TOKEN',
    'CF_DNS_LIST_ID',
    'CF_HTTP_LIST_ID'
  ];

  for (const key of required) {
    if (!env[key as keyof Env]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}