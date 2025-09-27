import { Env, DomainSubmission, FormResponse } from './types';
import { getHTML } from './handlers/html';
import { CloudflareAPI } from './utils/cloudflare-api';
import { validateDomain, validateDescription, sanitizeInput, validateTargetList } from './utils/validation';
import { getCorsHeaders, handleOptions } from './utils/cors';
import { KVSync } from './utils/kv-sync';
import { SecurityManager, validateEnvironment } from './utils/security';
import { PerformanceManager, withRetry, createRequestKey } from './utils/performance';
import { API_ENDPOINTS, HTTP_STATUS } from './config/constants';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    try {
      validateEnvironment(env);
    } catch (error) {
      console.error('Environment validation failed:', String(error));
      return new Response('Configuration Error', {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    const securityManager = new SecurityManager(env);
    const performanceManager = new PerformanceManager(env.DNS_DOMAINS_BACKUP, env.HTTP_DOMAINS_BACKUP);
    const securityCheck = await securityManager.validateRequest(request);
    if (!securityCheck.valid) {
      return new Response(securityCheck.reason || 'Request blocked', {
        status: securityCheck.reason === 'Rate limit exceeded'
          ? HTTP_STATUS.TOO_MANY_REQUESTS
          : HTTP_STATUS.FORBIDDEN,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    const kvSync = new KVSync(env);
    ctx.waitUntil(kvSync.checkAndInitializeSync());

    if (method === 'OPTIONS') {
      return handleOptions(request);
    }

    try {
      if (path === '/' && method === 'GET') {
        return new Response(getHTML(), {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'public, max-age=3600',
            'Permissions-Policy': 'interest-cohort=()',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
          },
        });
      }

      if (path === API_ENDPOINTS.ADD_DOMAIN && method === 'POST') {
        return handleAddDomain(request, env, ctx, securityManager, performanceManager);
      }

      if (path === API_ENDPOINTS.KV_BACKUP && method === 'GET') {
        return handleGetKVBackup(env, performanceManager);
      }

      if (path === API_ENDPOINTS.SYNC_STATUS && method === 'GET') {
        return handleGetSyncStatus(env, performanceManager);
      }

      if (path === '/favicon.ico' && method === 'GET') {
        return handleFavicon();
      }

      return new Response('Not Found', {
        status: HTTP_STATUS.NOT_FOUND,
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch (error) {
      console.error('Worker error:', String(error));
      await securityManager.logSecurityEvent({
        type: 'validation_failure',
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
        userAgent: request.headers.get('User-Agent') || 'unknown',
        timestamp: new Date().toISOString(),
        details: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        endpoint: path
      });

      return new Response('Internal Server Error', {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },
};

async function handleAddDomain(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  securityManager: SecurityManager,
  performanceManager: PerformanceManager
): Promise<Response> {
  const requestKey = createRequestKey(request, ['add-domain']);

  return performanceManager.withRequestDeduplication(requestKey, async () => {
    try {
      const contentType = request.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return jsonResponse({ success: false, message: 'Invalid content type' }, HTTP_STATUS.BAD_REQUEST);
      }

      const body = await request.json() as any;

      if (!body.domain || !body.description) {
        return jsonResponse({
          success: false,
          message: 'Domain and description are required'
        }, HTTP_STATUS.BAD_REQUEST);
      }

      const domain = sanitizeInput(body.domain).toLowerCase();
      const description = sanitizeInput(body.description);
      const targetList = body.targetList || 'both';
      if (!validateDomain(domain)) {
        await securityManager.logSecurityEvent({
          type: 'validation_failure',
          ip: request.headers.get('CF-Connecting-IP') || 'unknown',
          userAgent: request.headers.get('User-Agent') || 'unknown',
          timestamp: new Date().toISOString(),
          details: `Invalid domain format: ${domain}`,
          endpoint: '/api/add-domain'
        });
        return jsonResponse({ success: false, message: 'Invalid domain format' }, HTTP_STATUS.BAD_REQUEST);
      }

      if (!validateDescription(description)) {
        return jsonResponse({
          success: false,
          message: 'Description must be between 1 and 500 characters'
        }, HTTP_STATUS.BAD_REQUEST);
      }

      if (!validateTargetList(targetList)) {
        return jsonResponse({
          success: false,
          message: 'Invalid target list. Must be dns, http, or both'
        }, HTTP_STATUS.BAD_REQUEST);
      }
      if (!await securityManager.validateInput(domain, 'domain') ||
          !await securityManager.validateInput(description, 'description')) {
        await securityManager.logSecurityEvent({
          type: 'suspicious_input',
          ip: request.headers.get('CF-Connecting-IP') || 'unknown',
          userAgent: request.headers.get('User-Agent') || 'unknown',
          timestamp: new Date().toISOString(),
          details: `Suspicious input detected: ${domain}`,
          endpoint: '/api/add-domain'
        });
        return jsonResponse({
          success: false,
          message: 'Input validation failed'
        }, HTTP_STATUS.BAD_REQUEST);
      }

      const cfApi = new CloudflareAPI(env);

      const submission: DomainSubmission = {
        domain,
        description,
        targetList: targetList as 'dns' | 'http' | 'both',
        submittedAt: new Date().toISOString(),
        ip: request.headers.get('CF-Connecting-IP') || undefined,
      };
      const result = await withRetry(() => cfApi.addDomainToList(submission));

      if (!result.success) {
        const errorMessage = result.errors.length > 0
          ? result.errors.join('; ')
          : 'Failed to add domain to list';
        return jsonResponse({
          success: false,
          message: errorMessage,
        }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
      const kvSync = new KVSync(env);
      ctx.waitUntil(kvSync.addDomainToKV(domain, description, submission.targetList));
      let message = `Successfully added ${domain} to `;
      const listNames: string[] = [];

      result.results.forEach(r => {
        listNames.push(`${r.list} Allowed Domains`);
      });

      if (listNames.length === 1) {
        message += listNames[0];
      } else if (listNames.length === 2) {
        message += `both ${listNames.join(' and ')} lists`;
      }

      if (result.errors.length > 0 && result.results.length > 0) {
        message += ` (Note: ${result.errors.join('; ')})`;
      }

      return jsonResponse({
        success: true,
        message,
        domain,
      });
    } catch (error) {
      console.error('Error adding domain:', String(error));

      await securityManager.logSecurityEvent({
        type: 'validation_failure',
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
        userAgent: request.headers.get('User-Agent') || 'unknown',
        timestamp: new Date().toISOString(),
        details: `Error adding domain: ${error instanceof Error ? error.message : 'Unknown error'}`,
        endpoint: '/api/add-domain'
      });

      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

      return jsonResponse({
        success: false,
        message: errorMessage,
      }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  });
}

async function handleGetKVBackup(env: Env, performanceManager: PerformanceManager): Promise<Response> {
  try {
    const responseData = await performanceManager.getCachedData('kv-backup', async () => {
      const kvSync = new KVSync(env);
      const domains = await kvSync.getAllDomainsFromKV();
      const syncInfo = await kvSync.getLastSyncInfo();

      const domainsData = Array.isArray(domains) ? domains : domains;
      const totalCount = Array.isArray(domains)
        ? domains.length
        : (domains.dns?.length || 0) + (domains.http?.length || 0);

      return {
        success: true,
        data: {
          domains: domainsData,
          count: totalCount,
          lastSync: syncInfo
        }
      };
    });

    return new Response(JSON.stringify(responseData), {
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(),
      },
    });
  } catch (error) {
    console.error('Error fetching KV backup:', String(error));
    return jsonResponse({
      success: false,
      message: 'Failed to fetch KV backup',
    }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

async function handleGetSyncStatus(env: Env, performanceManager: PerformanceManager): Promise<Response> {
  try {
    const responseData = await performanceManager.getCachedData('sync-status', async () => {
      const kvSync = new KVSync(env);
      const syncInfo = await kvSync.getLastSyncInfo();
      const domains = await kvSync.getAllDomainsFromKV();

      const totalCount = Array.isArray(domains)
        ? domains.length
        : (domains.dns?.length || 0) + (domains.http?.length || 0);

      const domainCounts = Array.isArray(domains)
        ? { total: domains.length }
        : { dns: domains.dns?.length || 0, http: domains.http?.length || 0, total: totalCount };

      const cacheStats = performanceManager.getCacheStats();

      return {
        success: true,
        data: {
          lastSync: syncInfo,
          domainCounts,
          kvNamespaces: ['DNS_DOMAINS_BACKUP', 'HTTP_DOMAINS_BACKUP'],
          performance: cacheStats
        }
      };
    });

    return new Response(JSON.stringify(responseData), {
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(),
      },
    });
  } catch (error) {
    console.error('Error fetching sync status:', String(error));
    return jsonResponse({
      success: false,
      message: 'Failed to fetch sync status',
    }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

function jsonResponse(data: FormResponse, status: number = HTTP_STATUS.OK): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(),
    },
  });
}

function handleFavicon(): Response {
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <rect width="32" height="32" fill="#1f2937"/>
    <circle cx="16" cy="16" r="10" fill="#3b82f6" stroke="#60a5fa" stroke-width="1"/>
    <path d="M12 16l3 3 5-5" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  return new Response(favicon, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}