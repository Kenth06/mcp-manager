/**
 * Types for the Visual Tool Builder
 * Inspired by workflows-plus-plus patterns
 */

// ============================================
// Parameter Schema Types
// ============================================

export type ParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface BaseParameter {
  id: string;
  name: string;
  description: string;
  type: ParameterType;
  required: boolean;
}

export interface StringParameter extends BaseParameter {
  type: 'string';
  defaultValue?: string;
  enum?: string[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  format?: 'email' | 'uri' | 'date' | 'date-time' | 'uuid';
}

export interface NumberParameter extends BaseParameter {
  type: 'number';
  defaultValue?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  isInteger?: boolean;
}

export interface BooleanParameter extends BaseParameter {
  type: 'boolean';
  defaultValue?: boolean;
}

export interface ArrayParameter extends BaseParameter {
  type: 'array';
  items: Parameter;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

export interface ObjectParameter extends BaseParameter {
  type: 'object';
  properties: Parameter[];
}

export type Parameter =
  | StringParameter
  | NumberParameter
  | BooleanParameter
  | ArrayParameter
  | ObjectParameter;

// ============================================
// Action Block Types
// ============================================

export type ActionType =
  | 'http-request'
  | 'transform'
  | 'conditional'
  | 'loop'
  | 'd1-query'
  | 'kv-get'
  | 'kv-put'
  | 'kv-delete'
  | 'r2-get'
  | 'r2-put'
  | 'return';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface HttpRequestConfig {
  url: string;
  method: HttpMethod;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  body: {
    type: 'none' | 'json' | 'text' | 'form';
    content: string;
  };
  timeout?: number;
  outputVariable: string;
}

export interface TransformConfig {
  inputVariable: string;
  mappings: Array<{
    outputKey: string;
    sourcePath: string;
  }>;
  outputVariable: string;
}

export interface ConditionalConfig {
  condition: string;
  thenActions: ActionBlock[];
  elseActions: ActionBlock[];
}

export interface LoopConfig {
  arrayVariable: string;
  itemVariable: string;
  indexVariable?: string;
  actions: ActionBlock[];
}

export interface D1QueryConfig {
  databaseBinding: string;
  query: string;
  params: string[];
  outputVariable: string;
}

export interface KVGetConfig {
  namespaceBinding: string;
  key: string;
  outputVariable: string;
}

export interface KVPutConfig {
  namespaceBinding: string;
  key: string;
  value: string;
  expirationTtl?: number;
}

export interface KVDeleteConfig {
  namespaceBinding: string;
  key: string;
}

export interface R2GetConfig {
  bucketBinding: string;
  key: string;
  outputVariable: string;
}

export interface R2PutConfig {
  bucketBinding: string;
  key: string;
  value: string;
  contentType?: string;
}

export interface ReturnConfig {
  value: string;
}

export type ActionConfig =
  | { type: 'http-request'; config: HttpRequestConfig }
  | { type: 'transform'; config: TransformConfig }
  | { type: 'conditional'; config: ConditionalConfig }
  | { type: 'loop'; config: LoopConfig }
  | { type: 'd1-query'; config: D1QueryConfig }
  | { type: 'kv-get'; config: KVGetConfig }
  | { type: 'kv-put'; config: KVPutConfig }
  | { type: 'kv-delete'; config: KVDeleteConfig }
  | { type: 'r2-get'; config: R2GetConfig }
  | { type: 'r2-put'; config: R2PutConfig }
  | { type: 'return'; config: ReturnConfig };

export interface ActionBlock {
  id: string;
  type: ActionType;
  label: string;
  config: ActionConfig['config'];
}

// ============================================
// Variable System
// ============================================

export interface VariableDefinition {
  name: string;
  source: 'parameter' | 'action';
  sourceId: string;
  type: ParameterType | 'any';
  path?: string;
}

export interface VariableSuggestion {
  variable: string;
  label: string;
  description: string;
  type: ParameterType | 'any';
}

// ============================================
// Tool Definition (Visual)
// ============================================

export interface VisualToolDefinition {
  name: string;
  description: string;
  parameters: Parameter[];
  actions: ActionBlock[];
}

// ============================================
// Template System
// ============================================

export interface TemplateSegment {
  type: 'text' | 'variable';
  content: string;
}

// ============================================
// Action Metadata (for UI)
// ============================================

export interface ActionMetadata {
  type: ActionType;
  label: string;
  description: string;
  icon: string;
  category: 'http' | 'storage' | 'database' | 'control' | 'transform' | 'output';
  color: string;
}

export const ACTION_CATALOG: ActionMetadata[] = [
  {
    type: 'http-request',
    label: 'HTTP Request',
    description: 'Make an HTTP request to an external API',
    icon: 'Globe',
    category: 'http',
    color: '#3B82F6',
  },
  {
    type: 'transform',
    label: 'Transform Data',
    description: 'Map and transform data from one shape to another',
    icon: 'Shuffle',
    category: 'transform',
    color: '#8B5CF6',
  },
  {
    type: 'conditional',
    label: 'Conditional',
    description: 'Execute different actions based on a condition',
    icon: 'GitBranch',
    category: 'control',
    color: '#F59E0B',
  },
  {
    type: 'loop',
    label: 'Loop',
    description: 'Iterate over an array and execute actions',
    icon: 'Repeat',
    category: 'control',
    color: '#F59E0B',
  },
  {
    type: 'd1-query',
    label: 'D1 Query',
    description: 'Execute a SQL query on a D1 database',
    icon: 'Database',
    category: 'database',
    color: '#10B981',
  },
  {
    type: 'kv-get',
    label: 'KV Get',
    description: 'Get a value from KV storage',
    icon: 'Download',
    category: 'storage',
    color: '#EC4899',
  },
  {
    type: 'kv-put',
    label: 'KV Put',
    description: 'Store a value in KV storage',
    icon: 'Upload',
    category: 'storage',
    color: '#EC4899',
  },
  {
    type: 'kv-delete',
    label: 'KV Delete',
    description: 'Delete a value from KV storage',
    icon: 'Trash2',
    category: 'storage',
    color: '#EC4899',
  },
  {
    type: 'r2-get',
    label: 'R2 Get',
    description: 'Download an object from R2 storage',
    icon: 'FileDown',
    category: 'storage',
    color: '#06B6D4',
  },
  {
    type: 'r2-put',
    label: 'R2 Put',
    description: 'Upload an object to R2 storage',
    icon: 'FileUp',
    category: 'storage',
    color: '#06B6D4',
  },
  {
    type: 'return',
    label: 'Return Result',
    description: 'Return the final result of the tool',
    icon: 'CornerDownLeft',
    category: 'output',
    color: '#6366F1',
  },
];

// ============================================
// Tool Templates
// ============================================

export interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tool: VisualToolDefinition;
}

export const TOOL_TEMPLATES: ToolTemplate[] = [
  {
    id: 'api-proxy',
    name: 'API Proxy',
    description: 'Proxy requests to an external API',
    icon: 'Globe',
    category: 'HTTP',
    tool: {
      name: 'api_proxy',
      description: 'Proxy a request to an external API',
      parameters: [
        {
          id: 'endpoint',
          name: 'endpoint',
          description: 'The API endpoint to call',
          type: 'string',
          required: true,
        },
      ],
      actions: [
        {
          id: 'request',
          type: 'http-request',
          label: 'Call API',
          config: {
            url: '{{params.endpoint}}',
            method: 'GET',
            headers: [],
            queryParams: [],
            body: { type: 'none', content: '' },
            outputVariable: 'response',
          } as HttpRequestConfig,
        },
        {
          id: 'return',
          type: 'return',
          label: 'Return Response',
          config: {
            value: '{{response}}',
          } as ReturnConfig,
        },
      ],
    },
  },
  {
    id: 'crud-read',
    name: 'Database Read',
    description: 'Read data from a D1 database',
    icon: 'Database',
    category: 'Database',
    tool: {
      name: 'get_record',
      description: 'Get a record from the database by ID',
      parameters: [
        {
          id: 'id',
          name: 'id',
          description: 'The record ID',
          type: 'string',
          required: true,
        },
      ],
      actions: [
        {
          id: 'query',
          type: 'd1-query',
          label: 'Query Database',
          config: {
            databaseBinding: 'DB',
            query: 'SELECT * FROM records WHERE id = ?',
            params: ['{{params.id}}'],
            outputVariable: 'result',
          } as D1QueryConfig,
        },
        {
          id: 'return',
          type: 'return',
          label: 'Return Result',
          config: {
            value: '{{result.results[0]}}',
          } as ReturnConfig,
        },
      ],
    },
  },
  {
    id: 'kv-cache',
    name: 'KV Cache',
    description: 'Cache data in KV storage',
    icon: 'HardDrive',
    category: 'Storage',
    tool: {
      name: 'cache_data',
      description: 'Store data in KV cache with optional TTL',
      parameters: [
        {
          id: 'key',
          name: 'key',
          description: 'The cache key',
          type: 'string',
          required: true,
        },
        {
          id: 'value',
          name: 'value',
          description: 'The value to cache',
          type: 'string',
          required: true,
        },
        {
          id: 'ttl',
          name: 'ttl',
          description: 'Time to live in seconds',
          type: 'number',
          required: false,
          defaultValue: 3600,
        },
      ],
      actions: [
        {
          id: 'store',
          type: 'kv-put',
          label: 'Store in KV',
          config: {
            namespaceBinding: 'CACHE',
            key: '{{params.key}}',
            value: '{{params.value}}',
            expirationTtl: 3600,
          } as KVPutConfig,
        },
        {
          id: 'return',
          type: 'return',
          label: 'Return Success',
          config: {
            value: '{ "success": true, "key": "{{params.key}}" }',
          } as ReturnConfig,
        },
      ],
    },
  },
  {
    id: 'weather-api',
    name: 'Weather Lookup',
    description: 'Get weather data for a city',
    icon: 'Globe',
    category: 'HTTP',
    tool: {
      name: 'get_weather',
      description: 'Get current weather for a specified city',
      parameters: [
        {
          id: 'city',
          name: 'city',
          description: 'City name to get weather for',
          type: 'string',
          required: true,
        },
        {
          id: 'units',
          name: 'units',
          description: 'Temperature units',
          type: 'string',
          required: false,
          enum: ['metric', 'imperial'],
          defaultValue: 'metric',
        },
      ],
      actions: [
        {
          id: 'fetch-weather',
          type: 'http-request',
          label: 'Fetch Weather Data',
          config: {
            url: 'https://api.openweathermap.org/data/2.5/weather',
            method: 'GET',
            headers: [],
            queryParams: [
              { key: 'q', value: '{{params.city}}' },
              { key: 'units', value: '{{params.units}}' },
              { key: 'appid', value: '{{secrets.OPENWEATHER_API_KEY}}' },
            ],
            body: { type: 'none', content: '' },
            outputVariable: 'weatherData',
          } as HttpRequestConfig,
        },
        {
          id: 'transform',
          type: 'transform',
          label: 'Format Response',
          config: {
            inputVariable: '{{weatherData}}',
            mappings: [
              { outputKey: 'city', sourcePath: '{{weatherData.name}}' },
              { outputKey: 'temperature', sourcePath: '{{weatherData.main.temp}}' },
              { outputKey: 'description', sourcePath: '{{weatherData.weather[0].description}}' },
              { outputKey: 'humidity', sourcePath: '{{weatherData.main.humidity}}' },
            ],
            outputVariable: 'formatted',
          } as TransformConfig,
        },
        {
          id: 'return',
          type: 'return',
          label: 'Return Weather',
          config: {
            value: '{{formatted}}',
          } as ReturnConfig,
        },
      ],
    },
  },
  {
    id: 'crud-create',
    name: 'Database Insert',
    description: 'Insert a new record into D1 database',
    icon: 'Database',
    category: 'Database',
    tool: {
      name: 'create_record',
      description: 'Create a new record in the database',
      parameters: [
        {
          id: 'name',
          name: 'name',
          description: 'Name of the record',
          type: 'string',
          required: true,
        },
        {
          id: 'data',
          name: 'data',
          description: 'JSON data to store',
          type: 'string',
          required: true,
        },
      ],
      actions: [
        {
          id: 'insert',
          type: 'd1-query',
          label: 'Insert Record',
          config: {
            databaseBinding: 'DB',
            query: 'INSERT INTO records (name, data, created_at) VALUES (?, ?, datetime("now")) RETURNING *',
            params: ['{{params.name}}', '{{params.data}}'],
            outputVariable: 'insertResult',
          } as D1QueryConfig,
        },
        {
          id: 'return',
          type: 'return',
          label: 'Return Created Record',
          config: {
            value: '{{insertResult.results[0]}}',
          } as ReturnConfig,
        },
      ],
    },
  },
  {
    id: 'file-upload',
    name: 'File Upload',
    description: 'Upload a file to R2 storage',
    icon: 'HardDrive',
    category: 'Storage',
    tool: {
      name: 'upload_file',
      description: 'Upload a file to R2 object storage',
      parameters: [
        {
          id: 'filename',
          name: 'filename',
          description: 'Name for the uploaded file',
          type: 'string',
          required: true,
        },
        {
          id: 'content',
          name: 'content',
          description: 'File content to upload',
          type: 'string',
          required: true,
        },
        {
          id: 'contentType',
          name: 'contentType',
          description: 'MIME type of the file',
          type: 'string',
          required: false,
          defaultValue: 'application/octet-stream',
        },
      ],
      actions: [
        {
          id: 'upload',
          type: 'r2-put',
          label: 'Upload to R2',
          config: {
            bucketBinding: 'FILES',
            key: 'uploads/{{params.filename}}',
            value: '{{params.content}}',
            contentType: '{{params.contentType}}',
          } as R2PutConfig,
        },
        {
          id: 'return',
          type: 'return',
          label: 'Return URL',
          config: {
            value: '{ "success": true, "path": "uploads/{{params.filename}}" }',
          } as ReturnConfig,
        },
      ],
    },
  },
  {
    id: 'webhook-handler',
    name: 'Webhook Handler',
    description: 'Process incoming webhook data',
    icon: 'Zap',
    category: 'HTTP',
    tool: {
      name: 'handle_webhook',
      description: 'Process and store incoming webhook data',
      parameters: [
        {
          id: 'event_type',
          name: 'event_type',
          description: 'Type of webhook event',
          type: 'string',
          required: true,
        },
        {
          id: 'payload',
          name: 'payload',
          description: 'Webhook payload data',
          type: 'string',
          required: true,
        },
      ],
      actions: [
        {
          id: 'store-event',
          type: 'kv-put',
          label: 'Store Event',
          config: {
            namespaceBinding: 'EVENTS',
            key: 'webhook:{{params.event_type}}:' + Date.now(),
            value: '{{params.payload}}',
            expirationTtl: 86400, // 24 hours
          } as KVPutConfig,
        },
        {
          id: 'log-event',
          type: 'd1-query',
          label: 'Log Event',
          config: {
            databaseBinding: 'DB',
            query: 'INSERT INTO webhook_logs (event_type, payload, created_at) VALUES (?, ?, datetime("now"))',
            params: ['{{params.event_type}}', '{{params.payload}}'],
            outputVariable: 'logResult',
          } as D1QueryConfig,
        },
        {
          id: 'return',
          type: 'return',
          label: 'Acknowledge',
          config: {
            value: '{ "received": true, "event_type": "{{params.event_type}}" }',
          } as ReturnConfig,
        },
      ],
    },
  },
];

// ============================================
// Utility Functions
// ============================================

export function generateParameterId(): string {
  return `param_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function createDefaultParameter(type: ParameterType): Parameter {
  const base = {
    id: generateParameterId(),
    name: '',
    description: '',
    required: true,
  };

  switch (type) {
    case 'string':
      return { ...base, type: 'string' };
    case 'number':
      return { ...base, type: 'number' };
    case 'boolean':
      return { ...base, type: 'boolean', defaultValue: false };
    case 'array':
      return {
        ...base,
        type: 'array',
        items: { ...base, id: generateParameterId(), type: 'string' },
      };
    case 'object':
      return { ...base, type: 'object', properties: [] };
  }
}

export function createDefaultAction(type: ActionType): ActionBlock {
  const id = generateActionId();
  const metadata = ACTION_CATALOG.find((a) => a.type === type);

  switch (type) {
    case 'http-request':
      return {
        id,
        type,
        label: metadata?.label || 'HTTP Request',
        config: {
          url: '',
          method: 'GET',
          headers: [],
          queryParams: [],
          body: { type: 'none', content: '' },
          outputVariable: 'response',
        } as HttpRequestConfig,
      };
    case 'transform':
      return {
        id,
        type,
        label: metadata?.label || 'Transform',
        config: {
          inputVariable: '',
          mappings: [],
          outputVariable: 'transformed',
        } as TransformConfig,
      };
    case 'conditional':
      return {
        id,
        type,
        label: metadata?.label || 'Conditional',
        config: {
          condition: '',
          thenActions: [],
          elseActions: [],
        } as ConditionalConfig,
      };
    case 'loop':
      return {
        id,
        type,
        label: metadata?.label || 'Loop',
        config: {
          arrayVariable: '',
          itemVariable: 'item',
          actions: [],
        } as LoopConfig,
      };
    case 'd1-query':
      return {
        id,
        type,
        label: metadata?.label || 'D1 Query',
        config: {
          databaseBinding: 'DB',
          query: '',
          params: [],
          outputVariable: 'queryResult',
        } as D1QueryConfig,
      };
    case 'kv-get':
      return {
        id,
        type,
        label: metadata?.label || 'KV Get',
        config: {
          namespaceBinding: 'KV',
          key: '',
          outputVariable: 'kvValue',
        } as KVGetConfig,
      };
    case 'kv-put':
      return {
        id,
        type,
        label: metadata?.label || 'KV Put',
        config: {
          namespaceBinding: 'KV',
          key: '',
          value: '',
        } as KVPutConfig,
      };
    case 'kv-delete':
      return {
        id,
        type,
        label: metadata?.label || 'KV Delete',
        config: {
          namespaceBinding: 'KV',
          key: '',
        } as KVDeleteConfig,
      };
    case 'r2-get':
      return {
        id,
        type,
        label: metadata?.label || 'R2 Get',
        config: {
          bucketBinding: 'R2',
          key: '',
          outputVariable: 'r2Object',
        } as R2GetConfig,
      };
    case 'r2-put':
      return {
        id,
        type,
        label: metadata?.label || 'R2 Put',
        config: {
          bucketBinding: 'R2',
          key: '',
          value: '',
        } as R2PutConfig,
      };
    case 'return':
      return {
        id,
        type,
        label: metadata?.label || 'Return',
        config: {
          value: '',
        } as ReturnConfig,
      };
  }
}

/**
 * Convert visual parameters to JSON Schema
 */
export function parametersToJsonSchema(
  parameters: Parameter[]
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of parameters) {
    properties[param.name] = parameterToSchemaProperty(param);
    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function parameterToSchemaProperty(param: Parameter): Record<string, unknown> {
  const base: Record<string, unknown> = {
    description: param.description,
  };

  switch (param.type) {
    case 'string': {
      const stringParam = param as StringParameter;
      return {
        ...base,
        type: 'string',
        ...(stringParam.enum && { enum: stringParam.enum }),
        ...(stringParam.pattern && { pattern: stringParam.pattern }),
        ...(stringParam.minLength && { minLength: stringParam.minLength }),
        ...(stringParam.maxLength && { maxLength: stringParam.maxLength }),
        ...(stringParam.format && { format: stringParam.format }),
        ...(stringParam.defaultValue !== undefined && {
          default: stringParam.defaultValue,
        }),
      };
    }
    case 'number': {
      const numberParam = param as NumberParameter;
      return {
        ...base,
        type: numberParam.isInteger ? 'integer' : 'number',
        ...(numberParam.minimum !== undefined && {
          minimum: numberParam.minimum,
        }),
        ...(numberParam.maximum !== undefined && {
          maximum: numberParam.maximum,
        }),
        ...(numberParam.multipleOf && { multipleOf: numberParam.multipleOf }),
        ...(numberParam.defaultValue !== undefined && {
          default: numberParam.defaultValue,
        }),
      };
    }
    case 'boolean': {
      const boolParam = param as BooleanParameter;
      return {
        ...base,
        type: 'boolean',
        ...(boolParam.defaultValue !== undefined && {
          default: boolParam.defaultValue,
        }),
      };
    }
    case 'array': {
      const arrayParam = param as ArrayParameter;
      return {
        ...base,
        type: 'array',
        items: parameterToSchemaProperty(arrayParam.items),
        ...(arrayParam.minItems && { minItems: arrayParam.minItems }),
        ...(arrayParam.maxItems && { maxItems: arrayParam.maxItems }),
        ...(arrayParam.uniqueItems && { uniqueItems: arrayParam.uniqueItems }),
      };
    }
    case 'object': {
      const objectParam = param as ObjectParameter;
      const nestedProperties: Record<string, unknown> = {};
      const nestedRequired: string[] = [];
      for (const prop of objectParam.properties) {
        nestedProperties[prop.name] = parameterToSchemaProperty(prop);
        if (prop.required) {
          nestedRequired.push(prop.name);
        }
      }
      return {
        ...base,
        type: 'object',
        properties: nestedProperties,
        ...(nestedRequired.length > 0 && { required: nestedRequired }),
      };
    }
  }
}

/**
 * Parse template expressions like {{variable.path}}
 */
export function parseTemplateValue(value: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  const regex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: value.substring(lastIndex, match.index),
      });
    }
    segments.push({
      type: 'variable',
      content: match[1].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    segments.push({
      type: 'text',
      content: value.substring(lastIndex),
    });
  }

  return segments;
}

/**
 * Generate variable suggestions based on parameters and action outputs
 */
export function generateVariableSuggestions(
  parameters: Parameter[],
  actions: ActionBlock[],
  currentActionIndex: number
): VariableSuggestion[] {
  const suggestions: VariableSuggestion[] = [];

  // Add parameter suggestions
  for (const param of parameters) {
    suggestions.push({
      variable: `params.${param.name}`,
      label: param.name,
      description: param.description || `Parameter: ${param.name}`,
      type: param.type,
    });
  }

  // Add action output suggestions (only from previous actions)
  for (let i = 0; i < currentActionIndex; i++) {
    const action = actions[i];
    const outputVar = getActionOutputVariable(action);
    if (outputVar) {
      suggestions.push({
        variable: outputVar,
        label: outputVar,
        description: `Output from: ${action.label}`,
        type: 'any',
      });
    }
  }

  return suggestions;
}

function getActionOutputVariable(action: ActionBlock): string | null {
  switch (action.type) {
    case 'http-request':
      return (action.config as HttpRequestConfig).outputVariable;
    case 'transform':
      return (action.config as TransformConfig).outputVariable;
    case 'd1-query':
      return (action.config as D1QueryConfig).outputVariable;
    case 'kv-get':
      return (action.config as KVGetConfig).outputVariable;
    case 'r2-get':
      return (action.config as R2GetConfig).outputVariable;
    default:
      return null;
  }
}
