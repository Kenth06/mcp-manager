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
  bindings: Bindings;
}

interface FormErrors {
  name?: string;
  description?: string;
  authType?: string;
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

      // Convert bindings to the format expected by the API
      const bindingsPayload = uiBindingsToApi(formData.bindings);

      // Check if bindings have changed
      const bindingsChanged = JSON.stringify(bindingsPayload) !== JSON.stringify(mcp?.bindings || {});
      if (bindingsChanged && Object.keys(bindingsPayload).length > 0) {
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

              {formData.authType !== mcp.auth_type && (
                <Alert variant="warning" title="Auth Type Change">
                  Changing the authentication type may require reconfiguring auth credentials.
                  The MCP will need to be redeployed after this change.
                </Alert>
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
