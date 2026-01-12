'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Textarea, Select, Alert } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { BindingsConfig, type Bindings } from '@/components/mcp';
import { uiBindingsToApi } from '@/lib/hooks/useMcp';
import { api } from '@/lib/api';
import { toast } from '@/stores';

interface FormData {
  name: string;
  description: string;
  authType: 'public' | 'api_key' | 'oauth';
  apiKey: string;
  oauthProvider: string;
  oauthClientId: string;
  oauthClientSecret: string;
  bindings: Bindings;
}

interface FormErrors {
  name?: string;
  description?: string;
  authType?: string;
  apiKey?: string;
  oauthProvider?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
}

export default function CreateMcpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    authType: 'public',
    apiKey: '',
    oauthProvider: '',
    oauthClientId: '',
    oauthClientSecret: '',
    bindings: {},
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      newErrors.name = 'Name can only contain lowercase letters, numbers, and hyphens';
    }

    // Auth-specific validation
    if (formData.authType === 'api_key' && !formData.apiKey) {
      newErrors.apiKey = 'API key is required for API key authentication';
    }

    if (formData.authType === 'oauth') {
      if (!formData.oauthClientId) {
        newErrors.oauthClientId = 'OAuth Client ID is required';
      }
      if (!formData.oauthClientSecret) {
        newErrors.oauthClientSecret = 'OAuth Client Secret is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      toast.warning('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    setLoading(true);

    try {
      // Convert bindings to the format expected by the API
      const bindingsPayload = uiBindingsToApi(formData.bindings);

      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || undefined,
        authType: formData.authType,
        bindings: Object.keys(bindingsPayload).length > 0 ? bindingsPayload : undefined,
      };

      // Add auth config if needed
      if (formData.authType === 'api_key' && formData.apiKey) {
        payload.authConfig = {
          apiKey: formData.apiKey,
        };
      } else if (formData.authType === 'oauth') {
        payload.authConfig = {
          oauthProvider: formData.oauthProvider || undefined,
          oauthClientId: formData.oauthClientId,
          oauthClientSecret: formData.oauthClientSecret,
        };
      }

      const result = await api.post<{ id: string; name: string }>('/api/mcp', payload);
      toast.success('MCP Created', `"${formData.name}" has been created successfully`);
      router.push(`/mcp/${result.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create MCP';
      setError(errorMessage);
      toast.error('Creation Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBindingsChange = (bindings: Bindings) => {
    setFormData((prev) => ({ ...prev, bindings }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <div className="relative z-10 w-full px-6 py-8 max-w-2xl mx-auto">
        <Link href="/mcp" className="text-[#056DFF] hover:opacity-80 mb-6 inline-block no-underline text-sm">
          ← Back to MCPs
        </Link>

        <PageHeader
          title="Create New MCP"
          description="Configure a new Model Context Protocol server"
        />

        {error && (
          <Alert variant="error" title="Error creating MCP" className="mb-6">
            {error}
          </Alert>
        )}

        <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              <Input
                label="Name"
                placeholder="my-mcp-server"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={errors.name}
                hint="Lowercase letters, numbers, and hyphens only (3-50 chars)"
                disabled={loading}
                required
              />

              <Textarea
                label="Description"
                placeholder="A brief description of what this MCP server does..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                error={errors.description}
                disabled={loading}
                rows={3}
              />

              <Select
                label="Authentication Type"
                value={formData.authType}
                onChange={(e) => handleChange('authType', e.target.value as FormData['authType'])}
                error={errors.authType}
                disabled={loading}
                options={[
                  { value: 'public', label: 'Public (No Authentication)' },
                  { value: 'api_key', label: 'API Key' },
                  { value: 'oauth', label: 'OAuth 2.0' },
                ]}
              />

              {formData.authType === 'api_key' && (
                <div className="pl-4 border-l-2 border-blue-200 space-y-4">
                  <Input
                    label="API Key"
                    type="password"
                    placeholder="Enter your API key"
                    value={formData.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    error={errors.apiKey}
                    hint="This key will be hashed and stored securely"
                    disabled={loading}
                    required
                  />
                </div>
              )}

              {formData.authType === 'oauth' && (
                <div className="pl-4 border-l-2 border-blue-200 space-y-4">
                  <Input
                    label="OAuth Provider"
                    placeholder="e.g., github, google, auth0"
                    value={formData.oauthProvider}
                    onChange={(e) => handleChange('oauthProvider', e.target.value)}
                    error={errors.oauthProvider}
                    disabled={loading}
                  />
                  <Input
                    label="Client ID"
                    placeholder="OAuth Client ID"
                    value={formData.oauthClientId}
                    onChange={(e) => handleChange('oauthClientId', e.target.value)}
                    error={errors.oauthClientId}
                    disabled={loading}
                    required
                  />
                  <Input
                    label="Client Secret"
                    type="password"
                    placeholder="OAuth Client Secret"
                    value={formData.oauthClientSecret}
                    onChange={(e) => handleChange('oauthClientSecret', e.target.value)}
                    error={errors.oauthClientSecret}
                    hint="Will be stored securely"
                    disabled={loading}
                    required
                  />
                </div>
              )}

              <BindingsConfig
                bindings={formData.bindings}
                onChange={handleBindingsChange}
                disabled={loading}
              />
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end gap-3">
              <Link href="/mcp">
                <Button type="button" variant="secondary" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create MCP'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
