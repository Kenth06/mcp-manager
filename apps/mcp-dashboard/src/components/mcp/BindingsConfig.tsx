'use client';

import React, { useState } from 'react';
import { Button, Badge, Input } from '@/components/ui';
import { Plus, Trash2, Database, HardDrive, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Bindings {
  d1?: Array<{ name: string; databaseId: string }>;
  kv?: Array<{ name: string; namespaceId: string }>;
  r2?: Array<{ name: string; bucketName: string }>;
  secrets?: string[];
}

interface BindingsConfigProps {
  bindings: Bindings;
  onChange: (bindings: Bindings) => void;
  disabled?: boolean;
}

export function BindingsConfig({ bindings, onChange, disabled }: BindingsConfigProps) {
  const [expanded, setExpanded] = useState(false);

  const hasBindings =
    (bindings.d1?.length || 0) +
    (bindings.kv?.length || 0) +
    (bindings.r2?.length || 0) +
    (bindings.secrets?.length || 0) > 0;

  // D1 Database handlers
  const addD1 = () => {
    onChange({
      ...bindings,
      d1: [...(bindings.d1 || []), { name: '', databaseId: '' }],
    });
  };

  const updateD1 = (index: number, field: 'name' | 'databaseId', value: string) => {
    const newD1 = [...(bindings.d1 || [])];
    newD1[index] = { ...newD1[index], [field]: value };
    onChange({ ...bindings, d1: newD1 });
  };

  const removeD1 = (index: number) => {
    const newD1 = [...(bindings.d1 || [])];
    newD1.splice(index, 1);
    onChange({ ...bindings, d1: newD1 });
  };

  // KV Namespace handlers
  const addKV = () => {
    onChange({
      ...bindings,
      kv: [...(bindings.kv || []), { name: '', namespaceId: '' }],
    });
  };

  const updateKV = (index: number, field: 'name' | 'namespaceId', value: string) => {
    const newKV = [...(bindings.kv || [])];
    newKV[index] = { ...newKV[index], [field]: value };
    onChange({ ...bindings, kv: newKV });
  };

  const removeKV = (index: number) => {
    const newKV = [...(bindings.kv || [])];
    newKV.splice(index, 1);
    onChange({ ...bindings, kv: newKV });
  };

  // R2 Bucket handlers
  const addR2 = () => {
    onChange({
      ...bindings,
      r2: [...(bindings.r2 || []), { name: '', bucketName: '' }],
    });
  };

  const updateR2 = (index: number, field: 'name' | 'bucketName', value: string) => {
    const newR2 = [...(bindings.r2 || [])];
    newR2[index] = { ...newR2[index], [field]: value };
    onChange({ ...bindings, r2: newR2 });
  };

  const removeR2 = (index: number) => {
    const newR2 = [...(bindings.r2 || [])];
    newR2.splice(index, 1);
    onChange({ ...bindings, r2: newR2 });
  };

  // Secrets handlers
  const addSecret = () => {
    onChange({
      ...bindings,
      secrets: [...(bindings.secrets || []), ''],
    });
  };

  const updateSecret = (index: number, value: string) => {
    const newSecrets = [...(bindings.secrets || [])];
    newSecrets[index] = value;
    onChange({ ...bindings, secrets: newSecrets });
  };

  const removeSecret = (index: number) => {
    const newSecrets = [...(bindings.secrets || [])];
    newSecrets.splice(index, 1);
    onChange({ ...bindings, secrets: newSecrets });
  };

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        disabled={disabled}
      >
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-gray-500" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">Cloudflare Bindings</h3>
            <p className="text-xs text-gray-500">
              Configure D1, KV, R2, and Secrets for your MCP
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasBindings && (
            <Badge variant="info" className="text-xs">
              {(bindings.d1?.length || 0) + (bindings.kv?.length || 0) + (bindings.r2?.length || 0) + (bindings.secrets?.length || 0)} configured
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-200 space-y-6">
              {/* D1 Databases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-medium text-gray-700">D1 Databases</h4>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addD1}
                    disabled={disabled}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                {(bindings.d1?.length || 0) === 0 ? (
                  <p className="text-xs text-gray-400 italic">No D1 databases configured</p>
                ) : (
                  <div className="space-y-2">
                    {bindings.d1?.map((db, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Binding name (e.g., DB)"
                          value={db.name}
                          onChange={(e) => updateD1(index, 'name', e.target.value)}
                          disabled={disabled}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Database ID"
                          value={db.databaseId}
                          onChange={(e) => updateD1(index, 'databaseId', e.target.value)}
                          disabled={disabled}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeD1(index)}
                          disabled={disabled}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* KV Namespaces */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-green-600" />
                    <h4 className="text-sm font-medium text-gray-700">KV Namespaces</h4>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addKV}
                    disabled={disabled}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                {(bindings.kv?.length || 0) === 0 ? (
                  <p className="text-xs text-gray-400 italic">No KV namespaces configured</p>
                ) : (
                  <div className="space-y-2">
                    {bindings.kv?.map((kv, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Binding name (e.g., CACHE)"
                          value={kv.name}
                          onChange={(e) => updateKV(index, 'name', e.target.value)}
                          disabled={disabled}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Namespace ID"
                          value={kv.namespaceId}
                          onChange={(e) => updateKV(index, 'namespaceId', e.target.value)}
                          disabled={disabled}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeKV(index)}
                          disabled={disabled}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* R2 Buckets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-purple-600" />
                    <h4 className="text-sm font-medium text-gray-700">R2 Buckets</h4>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addR2}
                    disabled={disabled}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                {(bindings.r2?.length || 0) === 0 ? (
                  <p className="text-xs text-gray-400 italic">No R2 buckets configured</p>
                ) : (
                  <div className="space-y-2">
                    {bindings.r2?.map((r2, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Binding name (e.g., FILES)"
                          value={r2.name}
                          onChange={(e) => updateR2(index, 'name', e.target.value)}
                          disabled={disabled}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Bucket name"
                          value={r2.bucketName}
                          onChange={(e) => updateR2(index, 'bucketName', e.target.value)}
                          disabled={disabled}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeR2(index)}
                          disabled={disabled}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Secrets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-600" />
                    <h4 className="text-sm font-medium text-gray-700">Environment Secrets</h4>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addSecret}
                    disabled={disabled}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                {(bindings.secrets?.length || 0) === 0 ? (
                  <p className="text-xs text-gray-400 italic">No secrets configured</p>
                ) : (
                  <div className="space-y-2">
                    {bindings.secrets?.map((secret, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Secret name (e.g., API_KEY)"
                          value={secret}
                          onChange={(e) => updateSecret(index, e.target.value)}
                          disabled={disabled}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSecret(index)}
                          disabled={disabled}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Secret values must be set via Wrangler CLI: <code className="bg-gray-100 px-1 rounded">wrangler secret put SECRET_NAME</code>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
