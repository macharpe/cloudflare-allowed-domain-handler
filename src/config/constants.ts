export const API_ENDPOINTS = {
  ADD_DOMAIN: '/api/add-domain',
  KV_BACKUP: '/api/kv-backup',
  SYNC_STATUS: '/api/sync-status'
} as const;

export const RATE_LIMITS = {
  DOMAIN_ADDITIONS_PER_HOUR: 100,
  API_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_USER_PER_HOUR: 200
} as const;

export const VALIDATION_RULES = {
  DOMAIN_REGEX: /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_DESCRIPTION_LENGTH: 1,
  MAX_DOMAINS_PER_REQUEST: 10,
  MAX_DOMAIN_LENGTH: 255
} as const;

export const CACHE_CONFIG = {
  SYNC_STATUS_TTL: 300, // 5 minutes
  DOMAIN_LIST_TTL: 900,  // 15 minutes
  RATE_LIMIT_WINDOW: 3600, // 1 hour in seconds
  REQUEST_DEDUP_TTL: 60 // 1 minute
} as const;

export const SECURITY_CONFIG = {
  MAX_REQUEST_SIZE: 1024 * 10, // 10KB
  BLOCKED_USER_AGENTS: [
    'bot',
    'crawler',
    'spider'
  ],
  SUSPICIOUS_PATTERNS: [
    '<script',
    'javascript:',
    'data:text/html',
    'vbscript:'
  ]
} as const;

export const KV_KEYS = {
  RATE_LIMIT_PREFIX: 'rl:',
  SYNC_INFO_PREFIX: 'sync:',
  DOMAIN_PREFIX: 'domain:',
  CACHE_PREFIX: 'cache:',
  SECURITY_LOG_PREFIX: 'security:'
} as const;

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;