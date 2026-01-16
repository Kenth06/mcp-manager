'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Textarea, Select, Alert, Loader } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { BindingsConfig, type Bindings } from '@/components/mcp';
import { useMcpById, apiBindingsToUi, uiBindingsToApi } from '@/lib/hooks/useMcp';
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
  oauthIntrospectionUrl: string;
  oauthScopes: string;
  bindings: Bindings;
}

interface FormErrors {
  name?: string;
  description?: string;
  authType?: string;
  apiKey?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthIntrospectionUrl?: string;
}

export default function EditMcpPage() {
  const params = useParams();
  const router = useRouter();
  const mcpId = params.id as string;

  const { mcp, loading: mcpLoading, error: mcpError } = useMcpById(mcpId);

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
    oauthIntrospectionUrl: '',
    oauthScopes: '',
    bindings: {},
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Populate form when MCP data loads
  useEffect(() => {
    if (mcp) {
      setFormData({
        name: mcp.name,
        description: mcp.description || '',
        authType: mcp.auth_type,
        apiKey: '',
        oauthProvider: mcp.oauth_provider || '',
        oauthClientId: mcp.oauth_client_id || '',
        oauthClientSecret: '',
        oauthIntrospectionUrl: mcp.oauth_introspection_url || '',
        oauthScopes: Array.isArray(mcp.oauth_scopes) ? mcp.oauth_scopes.join(', ') : '',
        bindings: apiBindingsToUi(mcp.bindings),
      });
    }
  }, [mcp]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      newErrors.name = 'Name can only contain lowercase letters, numbers, and hyphens';
    }

    if (formData.authType === 'api_key' && !formData.apiKey && !mcp?.has_api_key) {
      newErrors.apiKey = 'API key is required when enabling API key auth';
    }

    if (formData.authType === 'oauth') {
      if (!formData.oauthClientId && !mcp?.oauth_client_id) {
        newErrors.oauthClientId = 'OAuth Client ID is required';
      }
      if (!formData.oauthClientSecret && !mcp?.has_oauth_secret) {
        newErrors.oauthClientSecret = 'OAuth Client Secret is required';
      }
      if (!formData.oauthIntrospectionUrl && !mcp?.oauth_introspection_url) {
        newErrors.oauthIntrospectionUrl = 'OAuth Introspection URL is required';
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
      const payload: Record<string, unknown> = {};

      // Only include fields that have changed
      if (formData.name !== mcp?.name) {
        payload.name = formData.name;
      }
      if (formData.description !== (mcp?.description || '')) {
        payload.description = formData.description || undefined;
      }
      if (formData.authType !== mcp?.auth_type) {
        payload.authType = formData.authType;
      }

      if (formData.authType === 'api_key' && formData.apiKey) {
        payload.authConfig = {
          apiKey: formData.apiKey,
        };
      }

      if (formData.authType === 'oauth') {
        const scopes = formData.oauthScopes
          .split(',')
          .map((scope) => scope.trim())
          .filter(Boolean);
        payload.authConfig = {
          oauthProvider: formData.oauthProvider || undefined,
          oauthClientId: formData.oauthClientId || undefined,
          oauthClientSecret: formData.oauthClientSecret || undefined,
          oauthIntrospectionUrl: formData.oauthIntrospectionUrl || undefined,
          scopes: scopes.length > 0 ? scopes : undefined,
        };
      }

      // Convert bindings to the format expected by the API
      const bindingsPayload = uiBindingsToApi(formData.bindings);
      const existingBindings = uiBindingsToApi(apiBindingsToUi(mcp?.bindings));

      // Check if bindings have changed
      const bindingsChanged = JSON.stringify(bindingsPayload) !== JSON.stringify(existingBindings);
      if (bindingsChanged) {
        payload.bindings = bindingsPayload;
      }

      if (Object.keys(payload).length === 0) {
        toast.info('No Changes', 'No changes were made');
        router.push(`/mcp/${mcpId}`);
        return;
      }

      await api.patch(`/api/mcp/${mcpId}`, payload);
      toast.success('MCP Updated', `"${formData.name}" has been updated successfully`);
      router.push(`/mcp/${mcpId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update MCP';
      setError(errorMessage);
      toast.error('Update Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBindingsChange = (bindings: Bindings) => {
    setFormData((prev) => ({ ...prev, bindings }));
    setHasChanges(true);
  };

  if (mcpLoading) {
    return (
      <main className="container mx-auto p-8">
        <Loader variant="overlay" text="Loading MCP..." />
      </main>
    );
  }

  if (mcpError || !mcp) {
    return (
      <main className="container mx-auto p-8">
        <Card className="p-6">
          <div className="text-center">
            <p className="text-red-700 mb-4">Error: {mcpError?.message || 'MCP not found'}</p>
            <Link href="/mcp">
              <Button variant="secondary">← Back to MCPs</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <div className="relative z-10 w-full px-6 py-8 max-w-2xl mx-auto">
        <Link href={`/mcp/${mcpId}`} className="text-[#056DFF] hover:opacity-80 mb-6 inline-block no-underline text-sm">
          ← Back to {mcp.name}
        </Link>

        <PageHeader
          title={`Edit ${mcp.name}`}
          description="Update your MCP server configuration"
        />

        {error && (
          <Alert variant="error" title="Error updating MCP" className="mb-6">
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
                    placeholder="Enter a new API key (optional)"
                    value={formData.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    error={errors.apiKey}
                    hint="Leave blank to keep existing key"
                    disabled={loading}
                  />
                </div>
              )}

              {formData.authType !== mcp.auth_type && (
                <Alert variant="warning" title="Auth Type Change">
                  Changing the authentication type may require reconfiguring auth credentials.
                  The MCP will need to be redeployed after this change.
                </Alert>
              )}

              {formData.authType === 'oauth' && (
                <div className="pl-4 border-l-2 border-blue-200 space-y-4">
                  <Input
                    label="OAuth Provider"
                    placeholder="e.g., github, google, auth0"
                    value={formData.oauthProvider}
                    onChange={(e) => handleChange('oauthProvider', e.target.value)}
                    disabled={loading}
                  />
                  <Input
                    label="Client ID"
                    placeholder="OAuth Client ID"
                    value={formData.oauthClientId}
                    onChange={(e) => handleChange('oauthClientId', e.target.value)}
                    error={errors.oauthClientId}
                    disabled={loading}
                  />
                  <Input
                    label="Client Secret"
                    type="password"
                    placeholder="Enter a new Client Secret (optional)"
                    value={formData.oauthClientSecret}
                    onChange={(e) => handleChange('oauthClientSecret', e.target.value)}
                    error={errors.oauthClientSecret}
                    hint="Leave blank to keep existing secret"
                    disabled={loading}
                  />
                  <Input
                    label="Introspection URL"
                    placeholder="https://provider.com/oauth/introspect"
                    value={formData.oauthIntrospectionUrl}
                    onChange={(e) => handleChange('oauthIntrospectionUrl', e.target.value)}
                    error={errors.oauthIntrospectionUrl}
                    disabled={loading}
                  />
                  <Input
                    label="Scopes (comma-separated)"
                    placeholder="read:tools, write:tools"
                    value={formData.oauthScopes}
                    onChange={(e) => handleChange('oauthScopes', e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              <BindingsConfig
                bindings={formData.bindings}
                onChange={handleBindingsChange}
                disabled={loading}
              />
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {hasChanges ? 'You have unsaved changes' : 'No changes made'}
              </div>
              <div className="flex gap-3">
                <Link href={`/mcp/${mcpId}`}>
                  <Button type="button" variant="secondary" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" variant="primary" disabled={loading || !hasChanges}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
