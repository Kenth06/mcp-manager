'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Button, Badge, Select } from '@/components/ui';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Globe,
  Shuffle,
  GitBranch,
  Repeat,
  Database,
  Download,
  Upload,
  FileDown,
  FileUp,
  CornerDownLeft,
} from 'lucide-react';
import { TemplateInput, KeyValueEditor } from './TemplateInput';
import {
  ActionBlock,
  ActionType,
  Parameter,
  ACTION_CATALOG,
  createDefaultAction,
  generateVariableSuggestions,
  HttpRequestConfig,
  TransformConfig,
  D1QueryConfig,
  KVGetConfig,
  KVPutConfig,
  KVDeleteConfig,
  R2GetConfig,
  R2PutConfig,
  ReturnConfig,
  VariableSuggestion,
} from '@/types/tool-builder';

interface ActionBuilderProps {
  actions: ActionBlock[];
  parameters: Parameter[];
  onChange: (actions: ActionBlock[]) => void;
  disabled?: boolean;
}

const ICON_MAP: Record<ActionType, React.ReactNode> = {
  'http-request': <Globe className="w-4 h-4" />,
  transform: <Shuffle className="w-4 h-4" />,
  conditional: <GitBranch className="w-4 h-4" />,
  loop: <Repeat className="w-4 h-4" />,
  'd1-query': <Database className="w-4 h-4" />,
  'kv-get': <Download className="w-4 h-4" />,
  'kv-put': <Upload className="w-4 h-4" />,
  'kv-delete': <Trash2 className="w-4 h-4" />,
  'r2-get': <FileDown className="w-4 h-4" />,
  'r2-put': <FileUp className="w-4 h-4" />,
  return: <CornerDownLeft className="w-4 h-4" />,
};

export function ActionBuilder({
  actions,
  parameters,
  onChange,
  disabled,
}: ActionBuilderProps) {
  const [showActionPalette, setShowActionPalette] = useState(false);

  const handleAddAction = (type: ActionType) => {
    const newAction = createDefaultAction(type);
    onChange([...actions, newAction]);
    setShowActionPalette(false);
  };

  const handleUpdateAction = (id: string, updates: Partial<ActionBlock>) => {
    onChange(
      actions.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const handleDeleteAction = (id: string) => {
    onChange(actions.filter((a) => a.id !== id));
  };

  const handleReorder = (newOrder: ActionBlock[]) => {
    onChange(newOrder);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Actions</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Define what this tool does step by step
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowActionPalette(true)}
          disabled={disabled}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Action
        </Button>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <CornerDownLeft className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">No actions defined</p>
          <p className="text-xs text-gray-400 mt-1">
            Click &quot;Add Action&quot; to create your first step
          </p>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={actions}
          onReorder={handleReorder}
          className="space-y-2"
        >
          <AnimatePresence>
            {actions.map((action, index) => (
              <ActionBlockField
                key={action.id}
                action={action}
                index={index}
                parameters={parameters}
                allActions={actions}
                onUpdate={(updates) => handleUpdateAction(action.id, updates)}
                onDelete={() => handleDeleteAction(action.id)}
                disabled={disabled}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* Action Palette Modal */}
      <AnimatePresence>
        {showActionPalette && (
          <ActionPalette
            onSelect={handleAddAction}
            onClose={() => setShowActionPalette(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ActionPaletteProps {
  onSelect: (type: ActionType) => void;
  onClose: () => void;
}

function ActionPalette({ onSelect, onClose }: ActionPaletteProps) {
  const categories = ['http', 'transform', 'control', 'database', 'storage', 'output'] as const;
  const categoryLabels: Record<string, string> = {
    http: 'HTTP',
    transform: 'Transform',
    control: 'Control Flow',
    database: 'Database',
    storage: 'Storage',
    output: 'Output',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Action</h2>
            <p className="text-sm text-gray-500">
              Select an action type to add to your tool
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <div className="space-y-6">
          {categories.map((category) => {
            const categoryActions = ACTION_CATALOG.filter(
              (a) => a.category === category
            );
            if (categoryActions.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {categoryLabels[category]}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {categoryActions.map((action) => (
                    <button
                      key={action.type}
                      type="button"
                      onClick={() => onSelect(action.type)}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${action.color}20` }}
                      >
                        <span style={{ color: action.color }}>
                          {ICON_MAP[action.type]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {action.label}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {action.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ActionBlockFieldProps {
  action: ActionBlock;
  index: number;
  parameters: Parameter[];
  allActions: ActionBlock[];
  onUpdate: (updates: Partial<ActionBlock>) => void;
  onDelete: () => void;
  disabled?: boolean;
}

function ActionBlockField({
  action,
  index,
  parameters,
  allActions,
  onUpdate,
  onDelete,
  disabled,
}: ActionBlockFieldProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const metadata = ACTION_CATALOG.find((a) => a.type === action.type);
  const suggestions = generateVariableSuggestions(parameters, allActions, index);

  return (
    <Reorder.Item
      value={action}
      dragListener={!disabled}
      className="border border-gray-200 rounded-lg bg-white"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 p-3 border-b border-gray-100 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <span className="text-xs font-medium text-gray-400 w-6">{index + 1}</span>

          <div
            className="p-1.5 rounded"
            style={{ backgroundColor: `${metadata?.color}20` }}
          >
            <span style={{ color: metadata?.color }}>{ICON_MAP[action.type]}</span>
          </div>

          <input
            type="text"
            value={action.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0"
            disabled={disabled}
          />

          <Badge
            className="text-xs"
            style={{
              backgroundColor: `${metadata?.color}20`,
              color: metadata?.color,
            }}
          >
            {metadata?.label}
          </Badge>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={disabled}
            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Body */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4">
                <ActionConfigEditor
                  action={action}
                  suggestions={suggestions}
                  onUpdate={(config) => onUpdate({ config })}
                  disabled={disabled}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Reorder.Item>
  );
}

interface ActionConfigEditorProps {
  action: ActionBlock;
  suggestions: VariableSuggestion[];
  onUpdate: (config: ActionBlock['config']) => void;
  disabled?: boolean;
}

function ActionConfigEditor({
  action,
  suggestions,
  onUpdate,
  disabled,
}: ActionConfigEditorProps) {
  switch (action.type) {
    case 'http-request':
      return (
        <HttpRequestEditor
          config={action.config as HttpRequestConfig}
          suggestions={suggestions}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'transform':
      return (
        <TransformEditor
          config={action.config as TransformConfig}
          suggestions={suggestions}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'd1-query':
      return (
        <D1QueryEditor
          config={action.config as D1QueryConfig}
          suggestions={suggestions}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'kv-get':
      return (
        <KVGetEditor
          config={action.config as KVGetConfig}
          suggestions={suggestions}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'kv-put':
      return (
        <KVPutEditor
          config={action.config as KVPutConfig}
          suggestions={suggestions}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'kv-delete':
      return (
        <KVDeleteEditor
          config={action.config as KVDeleteConfig}
          suggestions={suggestions}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'r2-get':
      return (
        <R2GetEditor
          config={action.config as R2GetConfig}
          suggestions={suggestions}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'r2-put':
      return (
        <R2PutEditor
          config={action.config as R2PutConfig}
          suggestions={suggestions}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'return':
      return (
        <ReturnEditor
          config={action.config as ReturnConfig}
          suggestions={suggestions}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    default:
      return (
        <div className="text-sm text-gray-500">
          Configuration for {action.type} coming soon...
        </div>
      );
  }
}

// HTTP Request Editor
function HttpRequestEditor({
  config,
  suggestions,
  onUpdate,
  disabled,
}: {
  config: HttpRequestConfig;
  suggestions: VariableSuggestion[];
  onUpdate: (config: HttpRequestConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Method
          </label>
          <Select
            value={config.method}
            onChange={(e) =>
              onUpdate({ ...config, method: e.target.value as HttpRequestConfig['method'] })
            }
            options={[
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'PATCH', label: 'PATCH' },
              { value: 'DELETE', label: 'DELETE' },
            ]}
            disabled={disabled}
          />
        </div>
        <div className="col-span-3">
          <TemplateInput
            label="URL"
            value={config.url}
            onChange={(url) => onUpdate({ ...config, url })}
            suggestions={suggestions}
            placeholder="https://api.example.com/endpoint"
            disabled={disabled}
          />
        </div>
      </div>

      <KeyValueEditor
        label="Headers"
        pairs={config.headers}
        onChange={(headers) => onUpdate({ ...config, headers })}
        suggestions={suggestions}
        keyPlaceholder="Header name"
        valuePlaceholder="Header value"
        disabled={disabled}
      />

      <KeyValueEditor
        label="Query Parameters"
        pairs={config.queryParams}
        onChange={(queryParams) => onUpdate({ ...config, queryParams })}
        suggestions={suggestions}
        keyPlaceholder="Param name"
        valuePlaceholder="Param value"
        disabled={disabled}
      />

      {config.method !== 'GET' && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">
            Request Body
          </label>
          <Select
            value={config.body.type}
            onChange={(e) =>
              onUpdate({
                ...config,
                body: { ...config.body, type: e.target.value as HttpRequestConfig['body']['type'] },
              })
            }
            options={[
              { value: 'none', label: 'No Body' },
              { value: 'json', label: 'JSON' },
              { value: 'text', label: 'Plain Text' },
              { value: 'form', label: 'Form Data' },
            ]}
            disabled={disabled}
          />
          {config.body.type !== 'none' && (
            <TemplateInput
              value={config.body.content}
              onChange={(content) =>
                onUpdate({ ...config, body: { ...config.body, content } })
              }
              suggestions={suggestions}
              placeholder={
                config.body.type === 'json' ? '{"key": "value"}' : 'Body content'
              }
              multiline
              rows={4}
              disabled={disabled}
            />
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Save Response As
        </label>
        <input
          type="text"
          value={config.outputVariable}
          onChange={(e) => onUpdate({ ...config, outputVariable: e.target.value })}
          placeholder="response"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
        <p className="text-xs text-gray-500 mt-1">
          This variable will be available as {`{{${config.outputVariable}}}`}
        </p>
      </div>
    </div>
  );
}

// Transform Editor
function TransformEditor({
  config,
  suggestions,
  onUpdate,
  disabled,
}: {
  config: TransformConfig;
  suggestions: VariableSuggestion[];
  onUpdate: (config: TransformConfig) => void;
  disabled?: boolean;
}) {
  const handleAddMapping = () => {
    onUpdate({
      ...config,
      mappings: [...config.mappings, { outputKey: '', sourcePath: '' }],
    });
  };

  const handleRemoveMapping = (index: number) => {
    onUpdate({
      ...config,
      mappings: config.mappings.filter((_, i) => i !== index),
    });
  };

  const handleUpdateMapping = (
    index: number,
    field: 'outputKey' | 'sourcePath',
    value: string
  ) => {
    onUpdate({
      ...config,
      mappings: config.mappings.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    });
  };

  return (
    <div className="space-y-4">
      <TemplateInput
        label="Input Variable"
        value={config.inputVariable}
        onChange={(inputVariable) => onUpdate({ ...config, inputVariable })}
        suggestions={suggestions}
        placeholder="{{response}}"
        disabled={disabled}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-700">
            Field Mappings
          </label>
          <button
            type="button"
            onClick={handleAddMapping}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            disabled={disabled}
          >
            + Add Mapping
          </button>
        </div>

        {config.mappings.length === 0 ? (
          <div className="text-center py-3 border border-dashed border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500">No mappings defined</p>
          </div>
        ) : (
          <div className="space-y-2">
            {config.mappings.map((mapping, index) => (
              <div key={index} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={mapping.outputKey}
                  onChange={(e) =>
                    handleUpdateMapping(index, 'outputKey', e.target.value)
                  }
                  placeholder="output_field"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={disabled}
                />
                <span className="py-2 text-gray-400">&larr;</span>
                <TemplateInput
                  value={mapping.sourcePath}
                  onChange={(v) => handleUpdateMapping(index, 'sourcePath', v)}
                  suggestions={suggestions}
                  placeholder="{{input.field.path}}"
                  disabled={disabled}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveMapping(index)}
                  className="p-2 text-gray-400 hover:text-red-500"
                  disabled={disabled}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Save Result As
        </label>
        <input
          type="text"
          value={config.outputVariable}
          onChange={(e) => onUpdate({ ...config, outputVariable: e.target.value })}
          placeholder="transformed"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// D1 Query Editor
function D1QueryEditor({
  config,
  suggestions,
  onUpdate,
  disabled,
}: {
  config: D1QueryConfig;
  suggestions: VariableSuggestion[];
  onUpdate: (config: D1QueryConfig) => void;
  disabled?: boolean;
}) {
  const handleAddParam = () => {
    onUpdate({ ...config, params: [...config.params, ''] });
  };

  const handleRemoveParam = (index: number) => {
    onUpdate({
      ...config,
      params: config.params.filter((_, i) => i !== index),
    });
  };

  const handleUpdateParam = (index: number, value: string) => {
    onUpdate({
      ...config,
      params: config.params.map((p, i) => (i === index ? value : p)),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Database Binding
        </label>
        <input
          type="text"
          value={config.databaseBinding}
          onChange={(e) =>
            onUpdate({ ...config, databaseBinding: e.target.value })
          }
          placeholder="DB"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          SQL Query
        </label>
        <textarea
          value={config.query}
          onChange={(e) => onUpdate({ ...config, query: e.target.value })}
          placeholder="SELECT * FROM users WHERE id = ?"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          rows={4}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500 mt-1">
          Use ? for parameter placeholders
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-700">
            Query Parameters
          </label>
          <button
            type="button"
            onClick={handleAddParam}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            disabled={disabled}
          >
            + Add Parameter
          </button>
        </div>

        {config.params.map((param, index) => (
          <div key={index} className="flex gap-2 items-start">
            <span className="py-2 text-xs text-gray-400 w-6">{index + 1}.</span>
            <TemplateInput
              value={param}
              onChange={(v) => handleUpdateParam(index, v)}
              suggestions={suggestions}
              placeholder="{{params.id}}"
              disabled={disabled}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => handleRemoveParam(index)}
              className="p-2 text-gray-400 hover:text-red-500"
              disabled={disabled}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Save Result As
        </label>
        <input
          type="text"
          value={config.outputVariable}
          onChange={(e) => onUpdate({ ...config, outputVariable: e.target.value })}
          placeholder="queryResult"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// KV Get Editor
function KVGetEditor({
  config,
  suggestions,
  onUpdate,
  disabled,
}: {
  config: KVGetConfig;
  suggestions: VariableSuggestion[];
  onUpdate: (config: KVGetConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          KV Namespace Binding
        </label>
        <input
          type="text"
          value={config.namespaceBinding}
          onChange={(e) =>
            onUpdate({ ...config, namespaceBinding: e.target.value })
          }
          placeholder="KV"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>

      <TemplateInput
        label="Key"
        value={config.key}
        onChange={(key) => onUpdate({ ...config, key })}
        suggestions={suggestions}
        placeholder="user:{{params.userId}}"
        disabled={disabled}
      />

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Save Value As
        </label>
        <input
          type="text"
          value={config.outputVariable}
          onChange={(e) => onUpdate({ ...config, outputVariable: e.target.value })}
          placeholder="kvValue"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// KV Put Editor
function KVPutEditor({
  config,
  suggestions,
  onUpdate,
  disabled,
}: {
  config: KVPutConfig;
  suggestions: VariableSuggestion[];
  onUpdate: (config: KVPutConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          KV Namespace Binding
        </label>
        <input
          type="text"
          value={config.namespaceBinding}
          onChange={(e) =>
            onUpdate({ ...config, namespaceBinding: e.target.value })
          }
          placeholder="KV"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>

      <TemplateInput
        label="Key"
        value={config.key}
        onChange={(key) => onUpdate({ ...config, key })}
        suggestions={suggestions}
        placeholder="user:{{params.userId}}"
        disabled={disabled}
      />

      <TemplateInput
        label="Value"
        value={config.value}
        onChange={(value) => onUpdate({ ...config, value })}
        suggestions={suggestions}
        placeholder="{{transformed}}"
        multiline
        rows={3}
        disabled={disabled}
      />

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          TTL (seconds, optional)
        </label>
        <input
          type="number"
          value={config.expirationTtl || ''}
          onChange={(e) =>
            onUpdate({
              ...config,
              expirationTtl: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
          placeholder="No expiration"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
          min={60}
        />
      </div>
    </div>
  );
}

// KV Delete Editor
function KVDeleteEditor({
  config,
  suggestions,
  onUpdate,
  disabled,
}: {
  config: KVDeleteConfig;
  suggestions: VariableSuggestion[];
  onUpdate: (config: KVDeleteConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          KV Namespace Binding
        </label>
        <input
          type="text"
          value={config.namespaceBinding}
          onChange={(e) =>
            onUpdate({ ...config, namespaceBinding: e.target.value })
          }
          placeholder="KV"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>

      <TemplateInput
        label="Key"
        value={config.key}
        onChange={(key) => onUpdate({ ...config, key })}
        suggestions={suggestions}
        placeholder="user:{{params.userId}}"
        disabled={disabled}
      />
    </div>
  );
}

// R2 Get Editor
function R2GetEditor({
  config,
  suggestions,
  onUpdate,
  disabled,
}: {
  config: R2GetConfig;
  suggestions: VariableSuggestion[];
  onUpdate: (config: R2GetConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          R2 Bucket Binding
        </label>
        <input
          type="text"
          value={config.bucketBinding}
          onChange={(e) =>
            onUpdate({ ...config, bucketBinding: e.target.value })
          }
          placeholder="R2"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>

      <TemplateInput
        label="Object Key"
        value={config.key}
        onChange={(key) => onUpdate({ ...config, key })}
        suggestions={suggestions}
        placeholder="files/{{params.filename}}"
        disabled={disabled}
      />

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Save Object As
        </label>
        <input
          type="text"
          value={config.outputVariable}
          onChange={(e) => onUpdate({ ...config, outputVariable: e.target.value })}
          placeholder="r2Object"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// R2 Put Editor
function R2PutEditor({
  config,
  suggestions,
  onUpdate,
  disabled,
}: {
  config: R2PutConfig;
  suggestions: VariableSuggestion[];
  onUpdate: (config: R2PutConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          R2 Bucket Binding
        </label>
        <input
          type="text"
          value={config.bucketBinding}
          onChange={(e) =>
            onUpdate({ ...config, bucketBinding: e.target.value })
          }
          placeholder="R2"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>

      <TemplateInput
        label="Object Key"
        value={config.key}
        onChange={(key) => onUpdate({ ...config, key })}
        suggestions={suggestions}
        placeholder="files/{{params.filename}}"
        disabled={disabled}
      />

      <TemplateInput
        label="Content"
        value={config.value}
        onChange={(value) => onUpdate({ ...config, value })}
        suggestions={suggestions}
        placeholder="{{transformed}}"
        multiline
        rows={3}
        disabled={disabled}
      />

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Content Type (optional)
        </label>
        <input
          type="text"
          value={config.contentType || ''}
          onChange={(e) =>
            onUpdate({ ...config, contentType: e.target.value || undefined })
          }
          placeholder="application/json"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// Return Editor
function ReturnEditor({
  config,
  suggestions,
  onUpdate,
  disabled,
}: {
  config: ReturnConfig;
  suggestions: VariableSuggestion[];
  onUpdate: (config: ReturnConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <TemplateInput
        label="Return Value"
        value={config.value}
        onChange={(value) => onUpdate({ ...config, value })}
        suggestions={suggestions}
        placeholder="{{transformed}}"
        hint="This is what the tool will return when called"
        multiline
        rows={4}
        disabled={disabled}
      />
    </div>
  );
}
