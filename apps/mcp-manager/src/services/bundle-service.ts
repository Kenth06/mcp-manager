interface BundleResult {
  key: string;
  size: number;
  hash: string;
}

interface BundleMetadata {
  mcpId: string;
  version: string;
  createdAt: string;
  dependencies?: Record<string, string>;
}

export class BundleService {
  constructor(
    private r2: R2Bucket,
    _db: D1Database,
  ) {}

  async createBundle(
    mcpId: string,
    version: string,
    sourceCode: string,
    dependencies?: Record<string, string>
  ): Promise<BundleResult> {
    // Generate hash of the content
    const hash = await this.generateHash(sourceCode);
    
    // Unique key in R2
    const key = `${mcpId}/${version}/${hash}.js`;

    const metadata: BundleMetadata = {
      mcpId,
      version,
      createdAt: new Date().toISOString(),
      ...(dependencies && { dependencies }),
    };
    
    // Upload to R2 with metadata
    await this.r2.put(key, sourceCode, {
      customMetadata: metadata as unknown as Record<string, string>,
      httpMetadata: {
        contentType: 'application/javascript',
        cacheControl: 'public, max-age=31536000',
      },
    });

    const size = new TextEncoder().encode(sourceCode).length;

    return {
      key,
      size,
      hash,
    };
  }

  private async generateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async getBundle(key: string): Promise<string | null> {
    const object = await this.r2.get(key);
    return object ? await object.text() : null;
  }

  async listVersionBundles(mcpId: string): Promise<R2Objects> {
    return this.r2.list({ prefix: `${mcpId}/` });
  }
}

