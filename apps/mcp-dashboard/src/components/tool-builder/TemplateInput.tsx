'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Variable, ChevronRight } from 'lucide-react';
import {
  VariableSuggestion,
  parseTemplateValue,
  TemplateSegment,
} from '@/types/tool-builder';
import { cn } from '@/lib/utils';

interface TemplateInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: VariableSuggestion[];
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
}

export function TemplateInput({
  value,
  onChange,
  suggestions,
  placeholder,
  label,
  hint,
  error,
  disabled,
  multiline = false,
  rows = 3,
  className,
}: TemplateInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<VariableSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Parse value to highlight variables
  const segments = parseTemplateValue(value);

  // Check if cursor is inside a template expression
  const getCurrentTemplateContext = useCallback(() => {
    const beforeCursor = value.substring(0, cursorPosition);
    const openBraceIndex = beforeCursor.lastIndexOf('{{');
    const closeBraceIndex = beforeCursor.lastIndexOf('}}');

    if (openBraceIndex > closeBraceIndex) {
      // We're inside a template expression
      const searchText = beforeCursor.substring(openBraceIndex + 2).trim().toLowerCase();
      return { isInTemplate: true, searchText };
    }

    // Check if we just typed {{
    if (beforeCursor.endsWith('{{')) {
      return { isInTemplate: true, searchText: '' };
    }

    return { isInTemplate: false, searchText: '' };
  }, [value, cursorPosition]);

  // Filter suggestions based on current input
  useEffect(() => {
    const { isInTemplate, searchText } = getCurrentTemplateContext();

    if (isInTemplate) {
      const filtered = suggestions.filter(
        (s) =>
          s.variable.toLowerCase().includes(searchText) ||
          s.label.toLowerCase().includes(searchText)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [value, cursorPosition, suggestions, getCurrentTemplateContext]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      // Trigger suggestions on {{ typing
      if (e.key === '{' && value.slice(-1) === '{') {
        setShowSuggestions(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
      case 'Tab':
        if (filteredSuggestions.length > 0) {
          e.preventDefault();
          insertSuggestion(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Insert a suggestion at the current cursor position
  const insertSuggestion = (suggestion: VariableSuggestion) => {
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);

    // Find the start of the current template expression
    const openBraceIndex = beforeCursor.lastIndexOf('{{');
    const prefix = beforeCursor.substring(0, openBraceIndex);

    // Check if there's a closing }} after cursor
    const closingBraceIndex = afterCursor.indexOf('}}');
    const suffix =
      closingBraceIndex >= 0
        ? afterCursor.substring(closingBraceIndex + 2)
        : afterCursor;

    const newValue = `${prefix}{{${suggestion.variable}}}${suffix}`;
    onChange(newValue);
    setShowSuggestions(false);

    // Set cursor position after the inserted suggestion
    const newCursorPos = prefix.length + suggestion.variable.length + 4;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);
  };

  // Track cursor position
  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCursorPosition(e.currentTarget.selectionStart || 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const inputClassName = cn(
    'w-full px-3 py-2 text-sm border rounded-lg transition-colors',
    'bg-white text-gray-900 placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-[#056DFF] focus:border-transparent',
    error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 hover:border-gray-400',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    multiline && 'resize-y min-h-[80px]',
    className
  );

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        <InputComponent
          ref={inputRef as any}
          value={value}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Type {{ to insert a variable'}
          className={inputClassName}
          disabled={disabled}
          {...(multiline && { rows })}
        />

        {/* Variable indicator */}
        {segments.some((s) => s.type === 'variable') && (
          <div className="absolute right-2 top-2">
            <Variable className="w-4 h-4 text-blue-500" />
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.variable}
                  type="button"
                  onClick={() => insertSuggestion(suggestion)}
                  className={cn(
                    'w-full px-3 py-2 text-left flex items-center gap-2 transition-colors',
                    index === selectedIndex
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span className="flex-shrink-0">
                    <Variable className="w-4 h-4 text-blue-500" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {suggestion.variable}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">
                      {suggestion.description}
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {suggestion.type}
                  </span>
                </button>
              ))}
            </div>
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> to navigate,{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> to select
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint or error */}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Preview component to show parsed template
interface TemplatePreviewProps {
  value: string;
  className?: string;
}

export function TemplatePreview({ value, className }: TemplatePreviewProps) {
  const segments = parseTemplateValue(value);

  if (segments.length === 0) {
    return <span className="text-gray-400 italic">Empty</span>;
  }

  return (
    <span className={cn('font-mono text-sm', className)}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>;
        }
        return (
          <span
            key={index}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
          >
            <Variable className="w-3 h-3" />
            {segment.content}
          </span>
        );
      })}
    </span>
  );
}

// Key-value pair editor with template support
interface KeyValueEditorProps {
  pairs: Array<{ key: string; value: string }>;
  onChange: (pairs: Array<{ key: string; value: string }>) => void;
  suggestions: VariableSuggestion[];
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  label?: string;
  disabled?: boolean;
}

export function KeyValueEditor({
  pairs,
  onChange,
  suggestions,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  label,
  disabled,
}: KeyValueEditorProps) {
  const handleAdd = () => {
    onChange([...pairs, { key: '', value: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: 'key' | 'value', value: string) => {
    onChange(
      pairs.map((pair, i) =>
        i === index ? { ...pair, [field]: value } : pair
      )
    );
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-medium text-gray-700">{label}</label>
      )}

      {pairs.length === 0 ? (
        <div className="text-center py-3 border border-dashed border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500">No items</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pairs.map((pair, index) => (
            <div key={index} className="flex gap-2 items-start">
              <input
                type="text"
                value={pair.key}
                onChange={(e) => handleUpdate(index, 'key', e.target.value)}
                placeholder={keyPlaceholder}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled}
              />
              <div className="flex-1">
                <TemplateInput
                  value={pair.value}
                  onChange={(v) => handleUpdate(index, 'value', v)}
                  suggestions={suggestions}
                  placeholder={valuePlaceholder}
                  disabled={disabled}
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                disabled={disabled}
              >
                <span className="sr-only">Remove</span>
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        disabled={disabled}
      >
        + Add item
      </button>
    </div>
  );
}
