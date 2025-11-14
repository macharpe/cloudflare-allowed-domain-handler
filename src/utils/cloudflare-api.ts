import { Env, CloudflareListResponse, CloudflareAddItemResponse, DomainSubmission } from '../types';

export class CloudflareAPI {
  private accountId: string;
  private apiToken: string;
  private dnsListId: string;
  private httpListId: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(env: Env) {
    this.accountId = env.CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = env.CLOUDFLARE_API_TOKEN;
    this.dnsListId = env.CLOUDFLARE_DNS_LIST_ID;
    this.httpListId = env.CLOUDFLARE_HTTP_LIST_ID;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async getList(listId: string): Promise<CloudflareListResponse> {
    // Use Zero Trust Gateway Lists API
    const url = `${this.baseUrl}/accounts/${this.accountId}/gateway/lists/${listId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('List fetch error:', errorData);
      throw new Error(`Failed to fetch list: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }

  async getDNSList(): Promise<CloudflareListResponse> {
    return this.getList(this.dnsListId);
  }

  async getHTTPList(): Promise<CloudflareListResponse> {
    return this.getList(this.httpListId);
  }

  private async addDomainToSpecificList(submission: DomainSubmission, listId: string): Promise<CloudflareAddItemResponse> {
    // Use Zero Trust Gateway Lists API with PATCH to append items
    const url = `${this.baseUrl}/accounts/${this.accountId}/gateway/lists/${listId}`;

    const newItem = {
      value: submission.domain,
      description: submission.description
    };

    const body = JSON.stringify({
      append: [newItem]
    });

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      const errorMessage = errorData.errors?.[0]?.message || response.statusText;
      console.error('API Error:', errorData);
      throw new Error(`Failed to add domain to list: ${errorMessage}`);
    }

    return response.json();
  }

  async addDomainToList(submission: DomainSubmission): Promise<{ success: boolean; results: any[]; errors: string[] }> {
    const targetList = submission.targetList || 'both';
    const results: any[] = [];
    const errors: string[] = [];

    try {
      if (targetList === 'dns' || targetList === 'both') {
        try {
          const result = await this.addDomainToSpecificList(submission, this.dnsListId);
          results.push({ list: 'DNS', result });
        } catch (error) {
          const errorMsg = `DNS list: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
        }
      }

      if (targetList === 'http' || targetList === 'both') {
        try {
          const result = await this.addDomainToSpecificList(submission, this.httpListId);
          results.push({ list: 'HTTP', result });
        } catch (error) {
          const errorMsg = `HTTP list: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
        }
      }

      return {
        success: errors.length === 0 || (targetList === 'both' && results.length > 0),
        results,
        errors
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async checkDomainExists(domain: string, listId?: string): Promise<boolean> {
    try {
      // Check DNS list by default, or specific list if provided
      const targetListId = listId || this.dnsListId;
      const list = await this.getList(targetListId);

      if (!list.result.items || list.result.items.length === 0) {
        return false;
      }

      return list.result.items.some(item =>
        item.value.toLowerCase() === domain.toLowerCase()
      );
    } catch (error) {
      console.error('Error checking domain existence:', String(error));
      return false;
    }
  }
}