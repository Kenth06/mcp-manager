'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Alert } from '@/components/ui';
import {
  X,
  Wand2,
  Code,
  Eye,
  Settings,
  Layers,
  Zap,
  ChevronRight,
  Copy,
  Check,
  Save,
} from 'lucide-react';
import { SchemaBuilder } from './SchemaBuilder';
import { ActionBuilder } from './ActionBuilder';
import { TemplateGallery } from './TemplateGallery';
import {
  Parameter,
  ActionBlock,
  VisualToolDefinition,
  parametersToJsonSchema,
  TOOL_TEMPLATES,
} from '@/types/tool-builder';
import type { Tool } from '@/components/tools/ToolsList';
import { toast } from '@/stores';

interface VisualToolEditorProps {
  tool?: Tool;
  onSave: (tool: Tool) => Promise<void>;
  onCancel: () => void;
}

type EditorTab = 'visual' | 'code' | 'preview';

export function VisualToolEditor({ tool, onSave, onCancel }: VisualToolEditorProps) {
  const [name, setName] = useState(tool?.name || '');
  const [description, setDescription] = useState(tool?.description || '');
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [actions, setActions] = useState<ActionBlock[]>([]);
  const [activeTab, setActiveTab] = useState<EditorTab>('visual');
  const [showTemplates, setShowTemplates] = useState(!tool);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from existing tool
  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setDescription(tool.description);
      // Try to parse existing schema into parameters
      if (tool.inputSchema) {
        const parsed = parseJsonSchemaToParameters(tool.inputSchema);
        setParameters(parsed);
      }
      // We can't reliably parse handler code back to actions,
      // so we leave actions empty for existing tools
    }
  }, [tool]);

  // Generate code from visual definition
  const generatedCode = generateHandlerCode(actions);
  const generatedSchema = parametersToJsonSchema(parameters);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Tool name is required');
      toast.warning('Validation Error', 'Tool name is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      toast.warning('Validation Error', 'Description is required');
      return;
    }

    if (actions.length === 0) {
      setError('At least one action is required');
      toast.warning('Validation Error', 'At least one action is required');
      return;
    }

    // Check if there's a return action
    const hasReturn = actions.some((a) => a.type === 'return');
    if (!hasReturn) {
      setError('A "Return Result" action is required');
      toast.warning('Validation Error', 'A "Return Result" action is required');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        inputSchema: generatedSchema,
        handler: generatedCode,
      });
      toast.success('Tool Saved', `"${name.trim()}" has been saved successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save tool';
      setError(errorMessage);
      toast.error('Save Failed', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTemplate = (template: typeof TOOL_TEMPLATES[0]) => {
    setName(template.tool.name);
    setDescription(template.tool.description);
    setParameters(template.tool.parameters);
    setActions(template.tool.actions);
    setShowTemplates(false);
    toast.info('Template Applied', `"${template.name}" template loaded`);
  };

  const tabs: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'visual', label: 'Visual Builder', icon: <Wand2 className="w-4 h-4" /> },
    { id: 'code', label: 'Generated Code', icon: <Code className="w-4 h-4" /> },
    { id: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {tool ? 'Edit Tool' : 'Create New Tool'}
              </h2>
              <p className="text-xs text-gray-500">
                Build your tool visually without writing code
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Template Gallery (for new tools) */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <TemplateGallery
              onSelect={handleSelectTemplate}
              onDismiss={() => setShowTemplates(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Form */}
      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Tool Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#056DFF] focus:border-transparent"
                placeholder="e.g., get_weather"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Description *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#056DFF] focus:border-transparent"
                placeholder="Describe what this tool does"
                required
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            {activeTab === 'visual' && (
              <motion.div
                key="visual"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Parameters Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <SchemaBuilder
                    parameters={parameters}
                    onChange={setParameters}
                  />
                </div>

                {/* Actions Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <ActionBuilder
                    actions={actions}
                    parameters={parameters}
                    onChange={setActions}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'code' && (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <CodePreview
                  title="Input Schema (JSON)"
                  code={JSON.stringify(generatedSchema, null, 2)}
                  language="json"
                />
                <CodePreview
                  title="Handler Code (JavaScript)"
                  code={generatedCode}
                  language="javascript"
                />
              </motion.div>
            )}

            {activeTab === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <ToolPreview
                  name={name}
                  description={description}
                  parameters={parameters}
                  actions={actions}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 pb-4">
            <Alert variant="error">
              {error}
            </Alert>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Layers className="w-4 h-4" />
            {parameters.length} parameter{parameters.length !== 1 ? 's' : ''}
            <span className="text-gray-300">|</span>
            <Zap className="w-4 h-4" />
            {actions.length} action{actions.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel} size="sm">
              Cancel
            </Button>
            <Button variant="primary" type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving...' : tool ? 'Update Tool' : 'Create Tool'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

// Code Preview Component
function CodePreview({
  title,
  code,
  language,
}: {
  title: string;
  code: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-700">{title}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono bg-gray-900 text-gray-100 overflow-x-auto max-h-64">
        {code || '// No code generated yet'}
      </pre>
    </div>
  );
}

// Tool Preview Component
function ToolPreview({
  name,
  description,
  parameters,
  actions,
}: {
  name: string;
  description: string;
  parameters: Parameter[];
  actions: ActionBlock[];
}) {
  return (
    <div className="space-y-4">
      {/* Tool Card Preview */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Wand2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              {name || 'Untitled Tool'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {description || 'No description'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="info" className="text-xs">
                {parameters.length} param{parameters.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="success" className="text-xs">
                {actions.length} action{actions.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Parameters Preview */}
      {parameters.length > 0 && (
        <div className="border border-gray-200 rounded-lg">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <h4 className="text-xs font-medium text-gray-700">Input Parameters</h4>
          </div>
          <div className="p-3 space-y-2">
            {parameters.map((param) => (
              <div key={param.id} className="flex items-center gap-2 text-xs">
                <Badge className="bg-gray-100 text-gray-700">{param.type}</Badge>
                <span className="font-medium text-gray-900">{param.name || 'unnamed'}</span>
                {param.required && (
                  <span className="text-red-500">*</span>
                )}
                {param.description && (
                  <span className="text-gray-500">- {param.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Flow Preview */}
      {actions.length > 0 && (
        <div className="border border-gray-200 rounded-lg">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <h4 className="text-xs font-medium text-gray-700">Execution Flow</h4>
          </div>
          <div className="p-3">
            <div className="space-y-2">
              {actions.map((action, index) => (
                <div key={action.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5">{index + 1}.</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-gray-900">{action.label}</span>
                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                      {action.type}
                    </Badge>
                  </div>
                  {index < actions.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-gray-400 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Parse JSON Schema back to Parameters (best effort)
function parseJsonSchemaToParameters(schema: Record<string, any>): Parameter[] {
  const parameters: Parameter[] = [];
  const properties = schema.properties || schema;
  const required = schema.required || [];

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value !== 'object' || !value) continue;

    const prop = value as Record<string, any>;
    const isRequired = required.includes(key);

    const base = {
      id: `param_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      name: key,
      description: prop.description || '',
      required: isRequired,
    };

    switch (prop.type) {
      case 'string':
        parameters.push({
          ...base,
          type: 'string',
          defaultValue: prop.default,
          enum: prop.enum,
          pattern: prop.pattern,
          minLength: prop.minLength,
          maxLength: prop.maxLength,
          format: prop.format,
        });
        break;
      case 'number':
      case 'integer':
        parameters.push({
          ...base,
          type: 'number',
          defaultValue: prop.default,
          minimum: prop.minimum,
          maximum: prop.maximum,
          multipleOf: prop.multipleOf,
          isInteger: prop.type === 'integer',
        });
        break;
      case 'boolean':
        parameters.push({
          ...base,
          type: 'boolean',
          defaultValue: prop.default,
        });
        break;
      case 'array':
        // Simplified array handling
        parameters.push({
          ...base,
          type: 'array',
          items: {
            id: `item_${Date.now()}`,
            name: 'item',
            description: '',
            type: (prop.items?.type as any) || 'string',
            required: true,
          },
          minItems: prop.minItems,
          maxItems: prop.maxItems,
          uniqueItems: prop.uniqueItems,
        });
        break;
      case 'object':
        parameters.push({
          ...base,
          type: 'object',
          properties: parseJsonSchemaToParameters(prop),
        });
        break;
    }
  }

  return parameters;
}

// Helper: Generate handler body from actions (wrapped by the worker generator)
function generateHandlerCode(actions: ActionBlock[]): string {
  if (actions.length === 0) {
    return '// Add actions to generate code';
  }

  const lines: string[] = [
    '// Auto-generated handler code',
    'const results = {};',
    '',
  ];

  for (const action of actions) {
    lines.push(`// ${action.label}`);
    lines.push(...generateActionCode(action));
    lines.push('');
  }

  return lines.join('\n');
}

function generateActionCode(action: ActionBlock): string[] {
  const indent = '';

  switch (action.type) {
    case 'http-request': {
      const config = action.config as any;
      const lines = [
        `${indent}const ${config.outputVariable} = await fetch(`,
        `${indent}  \`${resolveTemplate(config.url)}\`,`,
        `${indent}  {`,
        `${indent}    method: '${config.method}',`,
      ];

      if (config.headers.length > 0) {
        lines.push(`${indent}    headers: {`);
        for (const h of config.headers) {
          lines.push(`${indent}      '${h.key}': \`${resolveTemplate(h.value)}\`,`);
        }
        lines.push(`${indent}    },`);
      }

      if (config.body.type !== 'none' && config.body.content) {
        lines.push(`${indent}    body: \`${resolveTemplate(config.body.content)}\`,`);
      }

      lines.push(`${indent}  }`);
      lines.push(`${indent}).then(r => r.json());`);
      lines.push(`${indent}results.${config.outputVariable} = ${config.outputVariable};`);
      return lines;
    }

    case 'transform': {
      const config = action.config as any;
      const lines = [
        `${indent}const ${config.outputVariable} = {`,
      ];
      for (const mapping of config.mappings) {
        lines.push(`${indent}  ${mapping.outputKey}: ${resolveTemplate(mapping.sourcePath)},`);
      }
      lines.push(`${indent}};`);
      lines.push(`${indent}results.${config.outputVariable} = ${config.outputVariable};`);
      return lines;
    }

    case 'd1-query': {
      const config = action.config as any;
      const params = config.params.map((p: string) => resolveTemplate(p)).join(', ');
      return [
        `${indent}const ${config.outputVariable} = await env.${config.databaseBinding}`,
        `${indent}  .prepare(\`${config.query}\`)`,
        `${indent}  .bind(${params})`,
        `${indent}  .all();`,
        `${indent}results.${config.outputVariable} = ${config.outputVariable};`,
      ];
    }

    case 'kv-get': {
      const config = action.config as any;
      return [
        `${indent}const ${config.outputVariable} = await env.${config.namespaceBinding}`,
        `${indent}  .get(\`${resolveTemplate(config.key)}\`, 'json');`,
        `${indent}results.${config.outputVariable} = ${config.outputVariable};`,
      ];
    }

    case 'kv-put': {
      const config = action.config as any;
      const options = config.expirationTtl ? `, { expirationTtl: ${config.expirationTtl} }` : '';
      return [
        `${indent}await env.${config.namespaceBinding}`,
        `${indent}  .put(\`${resolveTemplate(config.key)}\`, \`${resolveTemplate(config.value)}\`${options});`,
      ];
    }

    case 'kv-delete': {
      const config = action.config as any;
      return [
        `${indent}await env.${config.namespaceBinding}`,
        `${indent}  .delete(\`${resolveTemplate(config.key)}\`);`,
      ];
    }

    case 'r2-get': {
      const config = action.config as any;
      return [
        `${indent}const ${config.outputVariable} = await env.${config.bucketBinding}`,
        `${indent}  .get(\`${resolveTemplate(config.key)}\`);`,
        `${indent}results.${config.outputVariable} = ${config.outputVariable};`,
      ];
    }

    case 'r2-put': {
      const config = action.config as any;
      const options = config.contentType ? `, { httpMetadata: { contentType: '${config.contentType}' } }` : '';
      return [
        `${indent}await env.${config.bucketBinding}`,
        `${indent}  .put(\`${resolveTemplate(config.key)}\`, \`${resolveTemplate(config.value)}\`${options});`,
      ];
    }

    case 'return': {
      const config = action.config as any;
      return [
        `${indent}return ${resolveTemplate(config.value)};`,
      ];
    }

    default:
      return [`${indent}// TODO: Implement ${action.type}`];
  }
}

function resolveTemplate(value: string): string {
  if (!value) return '';

  // Convert {{variable}} to ${variable}
  return value.replace(/\{\{([^}]+)\}\}/g, (_, varName) => {
    const trimmed = varName.trim();
    if (trimmed.startsWith('params.')) {
      return `\${params.${trimmed.slice(7)}}`;
    }
    return `\${results.${trimmed}}`;
  });
}
