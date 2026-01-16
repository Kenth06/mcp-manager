export type BindingInput = {
  d1?: Array<string | { name: string; databaseId?: string }>;
  kv?: Array<string | { name: string; namespaceId?: string }>;
  r2?: Array<string | { name: string; bucketName?: string }>;
  secrets?: string[];
};

export type BindingConfig = {
  d1?: Record<string, string>;
  kv?: Record<string, string>;
  r2?: Record<string, string>;
};

export function extractBindings(input?: BindingInput): {
  bindings: { d1?: string[]; kv?: string[]; r2?: string[]; secrets?: string[] };
  bindingConfig: BindingConfig;
} {
  const bindings: { d1?: string[]; kv?: string[]; r2?: string[]; secrets?: string[] } = {};
  const bindingConfig: BindingConfig = {};

  const handle = <T extends string>(
    items: Array<string | Record<string, string>> | undefined,
    idKey: T,
    target: 'd1' | 'kv' | 'r2'
  ) => {
    if (!items) return;
    const names: string[] = [];
    const mapping: Record<string, string> = {};

    for (const item of items) {
      if (typeof item === 'string') {
        names.push(item);
        continue;
      }
      if (item && typeof item === 'object' && 'name' in item) {
        const name = String(item.name);
        names.push(name);
        const idValue = (item as Record<string, string>)[idKey];
        if (idValue) {
          mapping[name] = String(idValue);
        }
      }
    }

    if (names.length > 0) {
      bindings[target] = names;
    }
    if (Object.keys(mapping).length > 0) {
      bindingConfig[target] = mapping;
    }
  };

  handle(input?.d1, 'databaseId', 'd1');
  handle(input?.kv, 'namespaceId', 'kv');
  handle(input?.r2, 'bucketName', 'r2');

  if (input?.secrets?.length) {
    bindings.secrets = input.secrets.map((secret) => String(secret)).filter(Boolean);
  }

  return { bindings, bindingConfig };
}

export function mergeBindingConfig(primary: BindingConfig, fallback: BindingConfig): BindingConfig {
  const merge = (a?: Record<string, string>, b?: Record<string, string>) => {
    if (!a && !b) return undefined;
    return { ...(b || {}), ...(a || {}) };
  };

  return {
    d1: merge(primary.d1, fallback.d1),
    kv: merge(primary.kv, fallback.kv),
    r2: merge(primary.r2, fallback.r2),
  };
}
