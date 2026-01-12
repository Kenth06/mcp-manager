'use client';

import React, { useState } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { SectionHeader } from '@/components/common';
import { Plus, Edit2, Trash2, Code, ChevronRight, Wand2 } from 'lucide-react';
import { VisualToolEditor } from '@/components/tool-builder';
import { motion, AnimatePresence } from 'framer-motion';

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: string;
}

interface ToolsListProps {
  tools: Tool[];
  onUpdate: (tools: Tool[]) => Promise<void>;
  loading?: boolean;
}

export function ToolsList({ tools, onUpdate, loading }: ToolsListProps) {
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const handleSave = async (tool: Tool) => {
    let updatedTools: Tool[];
    
    if (editingTool && editingTool.name === tool.name) {
      // Update existing tool
      updatedTools = tools.map(t => t.name === tool.name ? tool : t);
    } else if (editingTool) {
      // Tool name changed, replace old one
      updatedTools = tools.map(t => t.name === editingTool.name ? tool : t);
    } else {
      // Add new tool
      updatedTools = [...tools, tool];
    }
    
    await onUpdate(updatedTools);
    setEditingTool(null);
    setIsAdding(false);
  };

  const handleDelete = async (toolName: string) => {
    if (confirm(`Are you sure you want to delete tool "${toolName}"?`)) {
      const updatedTools = tools.filter(t => t.name !== toolName);
      await onUpdate(updatedTools);
    }
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setIsAdding(false);
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingTool(null);
  };

  const handleCancel = () => {
    setEditingTool(null);
    setIsAdding(false);
  };

  if (editingTool || isAdding) {
    return (
      <VisualToolEditor
        tool={editingTool || undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  const toggleExpand = (toolName: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolName)) {
      newExpanded.delete(toolName);
    } else {
      newExpanded.add(toolName);
    }
    setExpandedTools(newExpanded);
  };

  return (
    <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <SectionHeader
          title="Tools"
          subtitle={`${tools.length} tool${tools.length !== 1 ? 's' : ''} defined`}
          actions={[
            {
              label: 'Add Tool',
              onClick: handleAdd,
              variant: 'primary',
              size: 'sm',
              icon: <Wand2 className="w-4 h-4" />,
              disabled: loading,
            },
          ]}
        />
      </div>

      <div className="p-4">
        {tools.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <Wand2 className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">No tools defined</p>
            <p className="text-xs mt-1 text-gray-400">Create your first tool visually - no code required</p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              className="mt-4"
              disabled={loading}
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              Create Tool
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {tools.map((tool) => {
                const isExpanded = expandedTools.has(tool.name);
                const paramCount = Object.keys(tool.inputSchema || {}).length;
                
                return (
                  <motion.div
                    key={tool.name}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors"
                  >
                    <div
                      className="flex items-start justify-between p-4 cursor-pointer"
                      onClick={() => toggleExpand(tool.name)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900">{tool.name}</h3>
                          <Badge variant="info" className="text-xs">
                            {paramCount} param{paramCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-1">{tool.description}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <ChevronRight
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tool)}
                            disabled={loading}
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tool.name)}
                            disabled={loading}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Description</p>
                              <p className="text-xs text-gray-600">{tool.description}</p>
                            </div>
                            {paramCount > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 mb-2">Input Schema</p>
                                <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto font-mono">
                                  {JSON.stringify(tool.inputSchema, null, 2)}
                                </pre>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-2">Handler Code</p>
                              <pre className="text-xs bg-gray-900 text-gray-100 border border-gray-800 rounded p-3 overflow-x-auto font-mono max-h-32 overflow-y-auto">
                                {tool.handler}
                              </pre>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Card>
  );
}

