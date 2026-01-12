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
  Type,
  Hash,
  ToggleLeft,
  List,
  Braces,
} from 'lucide-react';
import {
  Parameter,
  ParameterType,
  StringParameter,
  NumberParameter,
  BooleanParameter,
  ArrayParameter,
  ObjectParameter,
  createDefaultParameter,
  generateParameterId,
} from '@/types/tool-builder';

interface SchemaBuilderProps {
  parameters: Parameter[];
  onChange: (parameters: Parameter[]) => void;
  disabled?: boolean;
}

const TYPE_OPTIONS: { value: ParameterType; label: string; icon: React.ReactNode }[] = [
  { value: 'string', label: 'String', icon: <Type className="w-3.5 h-3.5" /> },
  { value: 'number', label: 'Number', icon: <Hash className="w-3.5 h-3.5" /> },
  { value: 'boolean', label: 'Boolean', icon: <ToggleLeft className="w-3.5 h-3.5" /> },
  { value: 'array', label: 'Array', icon: <List className="w-3.5 h-3.5" /> },
  { value: 'object', label: 'Object', icon: <Braces className="w-3.5 h-3.5" /> },
];

const TYPE_COLORS: Record<ParameterType, string> = {
  string: 'bg-blue-100 text-blue-700',
  number: 'bg-green-100 text-green-700',
  boolean: 'bg-purple-100 text-purple-700',
  array: 'bg-orange-100 text-orange-700',
  object: 'bg-pink-100 text-pink-700',
};

export function SchemaBuilder({ parameters, onChange, disabled }: SchemaBuilderProps) {
  const handleAddParameter = () => {
    const newParam = createDefaultParameter('string');
    onChange([...parameters, newParam]);
  };

  const handleUpdateParameter = (id: string, updates: Partial<Parameter>) => {
    onChange(
      parameters.map((p) => (p.id === id ? ({ ...p, ...updates } as Parameter) : p))
    );
  };

  const handleDeleteParameter = (id: string) => {
    onChange(parameters.filter((p) => p.id !== id));
  };

  const handleReorder = (newOrder: Parameter[]) => {
    onChange(newOrder);
  };

  const handleTypeChange = (id: string, newType: ParameterType) => {
    const param = parameters.find((p) => p.id === id);
    if (!param) return;

    const newParam = createDefaultParameter(newType);
    newParam.id = param.id;
    newParam.name = param.name;
    newParam.description = param.description;
    newParam.required = param.required;

    onChange(parameters.map((p) => (p.id === id ? newParam : p)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Parameters</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Define the input parameters for this tool
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAddParameter}
          disabled={disabled}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Parameter
        </Button>
      </div>

      {parameters.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <Type className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">No parameters defined</p>
          <p className="text-xs text-gray-400 mt-1">
            Click &quot;Add Parameter&quot; to create one
          </p>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={parameters}
          onReorder={handleReorder}
          className="space-y-2"
        >
          <AnimatePresence>
            {parameters.map((param) => (
              <ParameterField
                key={param.id}
                parameter={param}
                onUpdate={(updates) => handleUpdateParameter(param.id, updates)}
                onDelete={() => handleDeleteParameter(param.id)}
                onTypeChange={(type) => handleTypeChange(param.id, type)}
                disabled={disabled}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </div>
  );
}

interface ParameterFieldProps {
  parameter: Parameter;
  onUpdate: (updates: Partial<Parameter>) => void;
  onDelete: () => void;
  onTypeChange: (type: ParameterType) => void;
  disabled?: boolean;
  depth?: number;
}

function ParameterField({
  parameter,
  onUpdate,
  onDelete,
  onTypeChange,
  disabled,
  depth = 0,
}: ParameterFieldProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const typeOption = TYPE_OPTIONS.find((t) => t.value === parameter.type);

  return (
    <Reorder.Item
      value={parameter}
      dragListener={!disabled}
      className={`border border-gray-200 rounded-lg bg-white ${depth > 0 ? 'ml-6' : ''}`}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-gray-100">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            disabled={disabled}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          <input
            type="text"
            value={parameter.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="parameter_name"
            className="flex-1 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0"
            disabled={disabled}
          />

          <Badge className={`text-xs ${TYPE_COLORS[parameter.type]}`}>
            {typeOption?.icon}
            <span className="ml-1">{typeOption?.label}</span>
          </Badge>

          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={parameter.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={disabled}
            />
            Required
          </label>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
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
              <div className="p-3 space-y-3">
                {/* Type selector */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <Select
                      value={parameter.type}
                      onChange={(e) => onTypeChange(e.target.value as ParameterType)}
                      options={TYPE_OPTIONS.map((t) => ({
                        value: t.value,
                        label: t.label,
                      }))}
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={parameter.description}
                      onChange={(e) => onUpdate({ description: e.target.value })}
                      placeholder="Describe this parameter"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Type-specific options */}
                <TypeSpecificOptions
                  parameter={parameter}
                  onUpdate={onUpdate}
                  disabled={disabled}
                  showAdvanced={showAdvanced}
                  onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Reorder.Item>
  );
}

interface TypeSpecificOptionsProps {
  parameter: Parameter;
  onUpdate: (updates: Partial<Parameter>) => void;
  disabled?: boolean;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

function TypeSpecificOptions({
  parameter,
  onUpdate,
  disabled,
  showAdvanced,
  onToggleAdvanced,
}: TypeSpecificOptionsProps) {
  switch (parameter.type) {
    case 'string':
      return (
        <StringOptions
          parameter={parameter as StringParameter}
          onUpdate={onUpdate}
          disabled={disabled}
          showAdvanced={showAdvanced}
          onToggleAdvanced={onToggleAdvanced}
        />
      );
    case 'number':
      return (
        <NumberOptions
          parameter={parameter as NumberParameter}
          onUpdate={onUpdate}
          disabled={disabled}
          showAdvanced={showAdvanced}
          onToggleAdvanced={onToggleAdvanced}
        />
      );
    case 'boolean':
      return (
        <BooleanOptions
          parameter={parameter as BooleanParameter}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'array':
      return (
        <ArrayOptions
          parameter={parameter as ArrayParameter}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'object':
      return (
        <ObjectOptions
          parameter={parameter as ObjectParameter}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    default:
      return null;
  }
}

function StringOptions({
  parameter,
  onUpdate,
  disabled,
  showAdvanced,
  onToggleAdvanced,
}: {
  parameter: StringParameter;
  onUpdate: (updates: Partial<StringParameter>) => void;
  disabled?: boolean;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}) {
  const [enumValue, setEnumValue] = useState('');

  const handleAddEnum = () => {
    if (!enumValue.trim()) return;
    const currentEnum = parameter.enum || [];
    onUpdate({ enum: [...currentEnum, enumValue.trim()] });
    setEnumValue('');
  };

  const handleRemoveEnum = (index: number) => {
    const currentEnum = parameter.enum || [];
    onUpdate({ enum: currentEnum.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      {/* Default value */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Default Value
        </label>
        <input
          type="text"
          value={parameter.defaultValue || ''}
          onChange={(e) => onUpdate({ defaultValue: e.target.value || undefined })}
          placeholder="Optional default value"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      </div>

      {/* Enum values */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Allowed Values (Enum)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={enumValue}
            onChange={(e) => setEnumValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddEnum()}
            placeholder="Add allowed value"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddEnum}
            disabled={disabled || !enumValue.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {parameter.enum && parameter.enum.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {parameter.enum.map((value, index) => (
              <Badge
                key={index}
                variant="info"
                className="text-xs cursor-pointer hover:bg-blue-200"
                onClick={() => handleRemoveEnum(index)}
              >
                {value}
                <span className="ml-1 text-blue-400">&times;</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        {showAdvanced ? 'Hide' : 'Show'} advanced options
      </button>

      {/* Advanced options */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Min Length
                </label>
                <input
                  type="number"
                  value={parameter.minLength || ''}
                  onChange={(e) =>
                    onUpdate({
                      minLength: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={disabled}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Length
                </label>
                <input
                  type="number"
                  value={parameter.maxLength || ''}
                  onChange={(e) =>
                    onUpdate({
                      maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="No limit"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={disabled}
                  min={0}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Pattern (Regex)
              </label>
              <input
                type="text"
                value={parameter.pattern || ''}
                onChange={(e) => onUpdate({ pattern: e.target.value || undefined })}
                placeholder="^[a-z]+$"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                disabled={disabled}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Format
              </label>
              <Select
                value={parameter.format || ''}
                onChange={(e) =>
                  onUpdate({
                    format: (e.target.value as StringParameter['format']) || undefined,
                  })
                }
                options={[
                  { value: '', label: 'None' },
                  { value: 'email', label: 'Email' },
                  { value: 'uri', label: 'URI' },
                  { value: 'date', label: 'Date' },
                  { value: 'date-time', label: 'Date-Time' },
                  { value: 'uuid', label: 'UUID' },
                ]}
                disabled={disabled}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NumberOptions({
  parameter,
  onUpdate,
  disabled,
  showAdvanced,
  onToggleAdvanced,
}: {
  parameter: NumberParameter;
  onUpdate: (updates: Partial<NumberParameter>) => void;
  disabled?: boolean;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Default value */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Default Value
          </label>
          <input
            type="number"
            value={parameter.defaultValue ?? ''}
            onChange={(e) =>
              onUpdate({
                defaultValue: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            placeholder="Optional"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={parameter.isInteger || false}
              onChange={(e) => onUpdate({ isInteger: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={disabled}
            />
            Integer only
          </label>
        </div>
      </div>

      {/* Min/Max */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Minimum
          </label>
          <input
            type="number"
            value={parameter.minimum ?? ''}
            onChange={(e) =>
              onUpdate({
                minimum: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            placeholder="No limit"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Maximum
          </label>
          <input
            type="number"
            value={parameter.maximum ?? ''}
            onChange={(e) =>
              onUpdate({
                maximum: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            placeholder="No limit"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        {showAdvanced ? 'Hide' : 'Show'} advanced options
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Multiple Of
              </label>
              <input
                type="number"
                value={parameter.multipleOf || ''}
                onChange={(e) =>
                  onUpdate({
                    multipleOf: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="e.g., 0.01 for currency"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled}
                step="any"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BooleanOptions({
  parameter,
  onUpdate,
  disabled,
}: {
  parameter: BooleanParameter;
  onUpdate: (updates: Partial<BooleanParameter>) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Default Value
      </label>
      <Select
        value={parameter.defaultValue === undefined ? '' : String(parameter.defaultValue)}
        onChange={(e) =>
          onUpdate({
            defaultValue: e.target.value === '' ? undefined : e.target.value === 'true',
          })
        }
        options={[
          { value: '', label: 'No default' },
          { value: 'true', label: 'True' },
          { value: 'false', label: 'False' },
        ]}
        disabled={disabled}
      />
    </div>
  );
}

function ArrayOptions({
  parameter,
  onUpdate,
  disabled,
}: {
  parameter: ArrayParameter;
  onUpdate: (updates: Partial<ArrayParameter>) => void;
  disabled?: boolean;
}) {
  const handleItemTypeChange = (type: ParameterType) => {
    const newItem = createDefaultParameter(type);
    newItem.name = 'item';
    onUpdate({ items: newItem });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Item Type
          </label>
          <Select
            value={parameter.items.type}
            onChange={(e) => handleItemTypeChange(e.target.value as ParameterType)}
            options={TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
            disabled={disabled}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={parameter.uniqueItems || false}
              onChange={(e) => onUpdate({ uniqueItems: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={disabled}
            />
            Unique items only
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Min Items
          </label>
          <input
            type="number"
            value={parameter.minItems || ''}
            onChange={(e) =>
              onUpdate({
                minItems: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="0"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
            min={0}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Max Items
          </label>
          <input
            type="number"
            value={parameter.maxItems || ''}
            onChange={(e) =>
              onUpdate({
                maxItems: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="No limit"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
            min={0}
          />
        </div>
      </div>
    </div>
  );
}

function ObjectOptions({
  parameter,
  onUpdate,
  disabled,
}: {
  parameter: ObjectParameter;
  onUpdate: (updates: Partial<ObjectParameter>) => void;
  disabled?: boolean;
}) {
  const handleAddProperty = () => {
    const newProp = createDefaultParameter('string');
    onUpdate({ properties: [...parameter.properties, newProp] });
  };

  const handleUpdateProperty = (id: string, updates: Partial<Parameter>) => {
    onUpdate({
      properties: parameter.properties.map((p) =>
        p.id === id ? ({ ...p, ...updates } as Parameter) : p
      ),
    });
  };

  const handleDeleteProperty = (id: string) => {
    onUpdate({
      properties: parameter.properties.filter((p) => p.id !== id),
    });
  };

  const handlePropertyTypeChange = (id: string, newType: ParameterType) => {
    const prop = parameter.properties.find((p) => p.id === id);
    if (!prop) return;

    const newProp = createDefaultParameter(newType);
    newProp.id = prop.id;
    newProp.name = prop.name;
    newProp.description = prop.description;
    newProp.required = prop.required;

    onUpdate({
      properties: parameter.properties.map((p) => (p.id === id ? newProp : p)),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-700">
          Properties
        </label>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAddProperty}
          disabled={disabled}
          className="text-xs h-7"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Property
        </Button>
      </div>

      {parameter.properties.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500">No properties defined</p>
        </div>
      ) : (
        <div className="space-y-2 pl-4 border-l-2 border-gray-200">
          {parameter.properties.map((prop) => (
            <ParameterField
              key={prop.id}
              parameter={prop}
              onUpdate={(updates) => handleUpdateProperty(prop.id, updates)}
              onDelete={() => handleDeleteProperty(prop.id)}
              onTypeChange={(type) => handlePropertyTypeChange(prop.id, type)}
              disabled={disabled}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
