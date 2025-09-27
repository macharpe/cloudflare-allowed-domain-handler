export interface Env {
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  CF_DNS_LIST_ID: string;
  CF_HTTP_LIST_ID: string;
  DNS_DOMAINS_BACKUP: KVNamespace;
  HTTP_DOMAINS_BACKUP: KVNamespace;
}

export interface DomainSubmission {
  domain: string;
  description: string;
  targetList?: 'dns' | 'http' | 'both';
  submittedAt?: string;
  ip?: string;
}

export interface CloudflareListItem {
  value: string;
  comment?: string;
  description?: string;
  created_at?: string;
}

export interface CloudflareListResponse {
  result: {
    id: string;
    name: string;
    kind: string;
    num_items: number;
    items?: CloudflareListItem[];
  };
  success: boolean;
  errors: any[];
  messages: any[];
}

export interface CloudflareAddItemResponse {
  result: {
    operation_id: string;
  };
  success: boolean;
  errors: any[];
  messages: any[];
}

export interface FormResponse {
  success: boolean;
  message: string;
  domain?: string;
  error?: string;
}

export interface KVDomainEntry {
  domain: string;
  description: string;
  addedAt: string;
  syncedAt: string;
  source: 'cloudflare' | 'manual';
}