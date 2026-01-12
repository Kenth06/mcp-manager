'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Badge } from '@/components/ui';
import {
  Globe,
  Database,
  HardDrive,
  FileText,
  Zap,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { TOOL_TEMPLATES, ToolTemplate } from '@/types/tool-builder';

interface TemplateGalleryProps {
  onSelect: (template: ToolTemplate) => void;
  onDismiss: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Globe: <Globe className="w-5 h-5" />,
  Database: <Database className="w-5 h-5" />,
  HardDrive: <HardDrive className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  HTTP: 'bg-blue-100 text-blue-700',
  Database: 'bg-green-100 text-green-700',
  Storage: 'bg-purple-100 text-purple-700',
  Transform: 'bg-orange-100 text-orange-700',
};

export function TemplateGallery({ onSelect, onDismiss }: TemplateGalleryProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  return (
    <div className="border-b border-gray-200 bg-gradient-to-b from-blue-50 to-white">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Start from a Template
              </h3>
              <p className="text-xs text-gray-500">
                Choose a pre-built template or start from scratch
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {TOOL_TEMPLATES.map((template) => (
            <motion.button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative p-4 text-left border border-gray-200 rounded-lg bg-white hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <span className="text-gray-600 group-hover:text-blue-600 transition-colors">
                    {ICON_MAP[template.icon] || <Zap className="w-5 h-5" />}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {template.name}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {template.description}
                  </p>
                  <Badge className={`mt-2 text-xs ${CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-700'}`}>
                    {template.category}
                  </Badge>
                </div>
              </div>

              {/* Hover indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredTemplate === template.id ? 1 : 0 }}
                className="absolute inset-0 flex items-center justify-center bg-blue-600/90 rounded-lg"
              >
                <span className="flex items-center gap-1 text-sm font-medium text-white">
                  Use Template
                  <ArrowRight className="w-4 h-4" />
                </span>
              </motion.div>
            </motion.button>
          ))}

          {/* Blank Template */}
          <motion.button
            type="button"
            onClick={onDismiss}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 text-left border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-200 rounded-lg">
                <FileText className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">
                  Start from Scratch
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Build your tool from the ground up
                </p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Expanded Template Card for detailed view
interface TemplateDetailProps {
  template: ToolTemplate;
  onSelect: () => void;
  onBack: () => void;
}

export function TemplateDetail({ template, onSelect, onBack }: TemplateDetailProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to templates
        </button>
      </div>

      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-lg">
          <span className="text-blue-600">
            {ICON_MAP[template.icon] || <Zap className="w-6 h-6" />}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{template.description}</p>
          <Badge className={`mt-2 ${CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-700'}`}>
            {template.category}
          </Badge>
        </div>
      </div>

      {/* Template Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Parameters
          </h4>
          <div className="space-y-1">
            {template.tool.parameters.map((param) => (
              <div key={param.id} className="flex items-center gap-2 text-sm">
                <Badge className="bg-gray-100 text-gray-600 text-xs">
                  {param.type}
                </Badge>
                <span className="font-medium">{param.name}</span>
                {param.required && <span className="text-red-500">*</span>}
              </div>
            ))}
            {template.tool.parameters.length === 0 && (
              <p className="text-sm text-gray-400">No parameters</p>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Actions
          </h4>
          <div className="space-y-1">
            {template.tool.actions.map((action, index) => (
              <div key={action.id} className="flex items-center gap-2 text-sm">
                <span className="text-xs text-gray-400">{index + 1}.</span>
                <span className="font-medium">{action.label}</span>
                <Badge className="bg-gray-100 text-gray-600 text-xs">
                  {action.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={onSelect}>
          Use This Template
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
