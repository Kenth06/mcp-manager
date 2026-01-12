interface Bindings {
  d1?: string[];
  kv?: string[];
  r2?: string[];
  secrets?: string[];
}

// Binding configuration with actual Cloudflare resource IDs
export interface BindingConfig {
  d1?: Record<string, string>;  // binding_name -> database_id
  kv?: Record<string, string>;  // binding_name -> namespace_id
  r2?: Record<string, string>;  // binding_name -> bucket_name
}

export class CloudflareApiService {
  private bindingConfig: BindingConfig = {};

  constructor(
    private apiToken: string,
    private accountId: string,
  ) {}

  // Set binding configuration (maps binding names to actual resource IDs)
  setBindingConfig(config: BindingConfig): void {
    this.bindingConfig = config;
  }

  // Get the workers.dev subdomain for this account
  getWorkersSubdomain(): string {
    return `${this.accountId}.workers.dev`;
  }

  // Generate the endpoint URL for a deployed worker
  getWorkerEndpointUrl(workerName: string): string {
    return `https://${workerName}.${this.accountId}.workers.dev`;
  }

  async deployWorker(
    name: string,
    script: string,
    bindings: Bindings = {},
    vars: Record<string, string> = {}
  ): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/workers/scripts/${name}`;

    const formData = new FormData();
    formData.append('metadata', JSON.stringify({
      main_module: 'index.js',
      bindings: this.formatBindings(bindings),
      compatibility_date: '2024-12-01',
      compatibility_flags: ['nodejs_compat'],
    }));

    const blob = new Blob([script], { type: 'application/javascript' });
    formData.append('index.js', blob);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to deploy worker: ${response.status} ${error}`);
    }

    // Set environment variables if provided
    if (Object.keys(vars).length > 0) {
      await this.setWorkerVars(name, vars);
    }
  }

  private async setWorkerVars(name: string, vars: Record<string, string>): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/workers/scripts/${name}/secrets`;

    for (const [key, value] of Object.entries(vars)) {
      const formData = new FormData();
      formData.append('name', key);
      formData.append('text', value);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        console.warn(`Failed to set var ${key}: ${response.status}`);
      }
    }
  }

  private formatBindings(bindings: Bindings): any[] {
    const result: any[] = [];

    if (bindings.d1) {
      bindings.d1.forEach(name => {
        // Use configured ID if available, otherwise use the binding name as fallback
        const databaseId = this.bindingConfig.d1?.[name] || name;
        result.push({
          type: 'd1_database',
          name,
          database_id: databaseId,
        });
      });
    }

    if (bindings.kv) {
      bindings.kv.forEach(name => {
        // Use configured ID if available, otherwise use the binding name as fallback
        const namespaceId = this.bindingConfig.kv?.[name] || name;
        result.push({
          type: 'kv_namespace',
          name,
          namespace_id: namespaceId,
        });
      });
    }

    if (bindings.r2) {
      bindings.r2.forEach(name => {
        // Use configured bucket name if available, otherwise use binding name
        const bucketName = this.bindingConfig.r2?.[name] || name;
        result.push({
          type: 'r2_bucket',
          name,
          bucket_name: bucketName,
        });
      });
    }

    return result;
  }

  async updateWorkerRoute(workerName: string, route: string): Promise<void> {
    // Implementation for updating worker routes
    // This is a placeholder - actual implementation depends on your routing setup
    console.log(`Updating route for ${workerName} to ${route}`);
  }
}

