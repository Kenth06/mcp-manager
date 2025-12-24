interface Bindings {
  d1?: string[];
  kv?: string[];
  r2?: string[];
  secrets?: string[];
}

interface DeployWorkerOptions {
  bindings?: Bindings;
  vars?: Record<string, string>;
}

export class CloudflareApiService {
  constructor(
    private apiToken: string,
    private accountId: string,
  ) {}

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
        result.push({
          type: 'd1_database',
          name,
          database_id: name, // This should be the actual D1 database ID
        });
      });
    }

    if (bindings.kv) {
      bindings.kv.forEach(name => {
        result.push({
          type: 'kv_namespace',
          name,
          namespace_id: name, // This should be the actual KV namespace ID
        });
      });
    }

    if (bindings.r2) {
      bindings.r2.forEach(name => {
        result.push({
          type: 'r2_bucket',
          name,
          bucket_name: name,
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

