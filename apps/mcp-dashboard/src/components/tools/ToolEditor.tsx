'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { X } from 'lucide-react';
import type { Tool } from './ToolsList';

interface ToolEditorProps {
  tool?: Tool;
  onSave: (tool: Tool) => Promise<void>;
  onCancel: () => void;
}

export function ToolEditor({ tool, onSave, onCancel }: ToolEditorProps) {
  const [name, setName] = useState(tool?.name || '');
  const [description, setDescription] = useState(tool?.description || '');
  const [inputSchema, setInputSchema] = useState(
    tool?.inputSchema ? JSON.stringify(tool.inputSchema, null, 2) : '{}'
  );
  const [handler, setHandler] = useState(tool?.handler || '');
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    // Validate JSON schema on change
    try {
      JSON.parse(inputSchema);
      setSchemaError(null);
    } catch (e) {
      setSchemaError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, [inputSchema]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !description || !handler) {
      alert('Please fill in all required fields');
      return;
    }

    if (schemaError) {
      alert('Please fix the JSON schema error');
      return;
    }

    let parsedSchema: Record<string, any>;
    try {
      parsedSchema = JSON.parse(inputSchema);
    } catch {
      alert('Invalid JSON schema');
      return;
    }

    await onSave({
      name,
      description,
      inputSchema: parsedSchema,
      handler,
    });
  };

  return (
    <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {tool ? 'Edit Tool' : 'Add New Tool'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Tool Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#056DFF] focus:border-transparent"
            placeholder="e.g., get_weather"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#056DFF] focus:border-transparent resize-none"
            rows={2}
            placeholder="Describe what this tool does"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Input Schema (JSON) *
          </label>
          <textarea
            value={inputSchema}
            onChange={(e) => setInputSchema(e.target.value)}
            className={`w-full px-3 py-2 text-xs border rounded-md bg-gray-50 focus:outline-none focus:ring-2 font-mono resize-none ${
              schemaError
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-200 focus:ring-[#056DFF] focus:border-transparent'
            }`}
            rows={6}
            placeholder='{"location": {"type": "string", "description": "City name"}}'
            required
          />
          {schemaError && (
            <p className="text-xs text-red-600 mt-1.5">{schemaError}</p>
          )}
          <p className="text-xs text-gray-500 mt-1.5">
            Define the input parameters using JSON Schema format
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Handler Code *
          </label>
          <textarea
            value={handler}
            onChange={(e) => setHandler(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#056DFF] focus:border-transparent font-mono resize-none"
            rows={10}
            placeholder="// Your tool implementation&#10;return { result: 'success' };"
            required
          />
          <p className="text-xs text-gray-500 mt-1.5">
            JavaScript/TypeScript code that implements the tool logic
          </p>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onCancel} size="sm">
            Cancel
          </Button>
          <Button variant="primary" type="submit" size="sm">
            {tool ? 'Update Tool' : 'Add Tool'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

