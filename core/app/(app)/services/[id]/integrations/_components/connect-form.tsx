'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CredentialFieldMeta } from '@/lib/adapters/introspect';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Vendor rejected these credentials.',
  no_adapter: 'No integration available for this vendor yet.',
  validation_failed: 'Some fields are not valid.',
  forbidden: 'Owner or admin role required.',
  internal_error: 'Something went wrong. Please try again.',
};

function camelToTitle(s: string): string {
  return s
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function ConnectForm({
  serviceId,
  adapterDisplayName,
  fields,
}: {
  serviceId: string;
  adapterDisplayName: string;
  fields: CredentialFieldMeta[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-xl font-normal">
          Connect {adapterDisplayName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setFieldErrors({});
            setSubmitting(true);
            try {
              const formData = new FormData(e.currentTarget);
              const payload: Record<string, string> = {};
              for (const field of fields) {
                const v = formData.get(field.name);
                if (typeof v === 'string' && v.trim()) {
                  payload[field.name] = v.trim();
                }
              }
              const res = await fetch(`/api/services/${serviceId}/credentials`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (res.ok) {
                toast.success('Connected. First sync queued.');
                router.refresh();
                return;
              }
              const body = await res.json().catch(() => ({}));
              if (body.error === 'validation_failed' && body.details) {
                const next: Record<string, string> = {};
                for (const [k, msgs] of Object.entries(body.details)) {
                  if (Array.isArray(msgs) && msgs.length > 0) next[k] = String(msgs[0]);
                }
                setFieldErrors(next);
              } else if (body.error === 'invalid_credentials' && body.message) {
                setError(body.message);
              } else {
                setError(ERROR_MESSAGES[body.error as string] ?? 'connection_failed');
              }
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name} className="text-sm font-medium">
                {camelToTitle(field.name)}
                {field.required ? <span className="text-destructive ml-0.5">*</span> : null}
              </Label>
              <Input
                id={field.name}
                name={field.name}
                type={field.inputType}
                autoComplete="off"
                spellCheck={false}
              />
              {fieldErrors[field.name] ? (
                <p className="text-destructive text-sm">{fieldErrors[field.name]}</p>
              ) : field.description ? (
                <p className="text-muted-foreground text-xs">{field.description}</p>
              ) : null}
            </div>
          ))}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Validating…' : 'Connect'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
