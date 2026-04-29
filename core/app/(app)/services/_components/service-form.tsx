'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Vendor } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { SERVICE_CURRENCIES } from '@/lib/schemas/service';
import { toDateInputValue } from '@/lib/format';
import {
  createServiceAction,
  updateServiceAction,
  type ServiceFormState,
} from '../actions';

type Member = { id: string; name: string | null; email: string };

type Initial = {
  id?: string;
  vendorId: string | null;
  displayName: string;
  type: 'subscription' | 'usage';
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | null;
  fixedCost: string | null;
  currency: string;
  nextRenewal: Date | null;
  ownerUserId: string | null;
  notes: string | null;
};

type Props = {
  vendors: Vendor[];
  members: Member[];
  initial?: Initial;
  currentUserId: string;
};

const ROOT_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Service not found.',
  forbidden: 'You are not allowed to perform this action.',
  unauthenticated: 'Please sign in again.',
  internal_error: 'Something went wrong. Please try again.',
};

const initialState: ServiceFormState = {};

export function ServiceForm({ vendors, members, initial, currentUserId }: Props) {
  const isEdit = Boolean(initial?.id);

  const action = isEdit
    ? updateServiceAction.bind(null, initial!.id!)
    : createServiceAction;
  const [state, dispatch, pending] = useActionState(action, initialState);

  const [type, setType] = useState<'subscription' | 'usage'>(initial?.type ?? 'subscription');
  const [vendorId, setVendorId] = useState<string | null>(initial?.vendorId ?? null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'yearly' | null>(
    initial?.billingCycle ?? 'monthly',
  );
  const [currency, setCurrency] = useState<string>(initial?.currency ?? 'USD');
  const [ownerUserId, setOwnerUserId] = useState<string | null>(
    initial?.ownerUserId ?? currentUserId,
  );

  useEffect(() => {
    if (type === 'usage') {
      setBillingCycle(null);
    } else if (billingCycle == null) {
      setBillingCycle('monthly');
    }
  }, [type, billingCycle]);

  useEffect(() => {
    if (state.fieldErrors?._form) {
      toast.error(ROOT_ERROR_MESSAGES[state.fieldErrors._form] ?? state.fieldErrors._form);
    }
    if (state.error) {
      toast.error(ROOT_ERROR_MESSAGES[state.error] ?? state.error);
    }
  }, [state]);

  return (
    <form action={dispatch} noValidate className="space-y-6">
      <input type="hidden" name="vendorId" value={vendorId ?? ''} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="billingCycle" value={billingCycle ?? ''} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="ownerUserId" value={ownerUserId ?? ''} />

      <Field
        label="Vendor"
        helper="Choose from the catalog or leave blank for a custom service."
        error={state.fieldErrors?.vendorId}
      >
        <VendorCombobox vendors={vendors} value={vendorId} onChange={setVendorId} />
      </Field>

      <Field
        label="Display name"
        required
        error={state.fieldErrors?.displayName}
      >
        <Input
          name="displayName"
          defaultValue={initial?.displayName ?? ''}
          placeholder="e.g. Acme's AWS production"
          required
        />
      </Field>

      <Field
        label="Type"
        required
        error={state.fieldErrors?.type}
      >
        <div className="flex gap-2">
          <TypeRadio value="subscription" current={type} onSelect={setType}>
            Subscription
          </TypeRadio>
          <TypeRadio value="usage" current={type} onSelect={setType}>
            Usage-based
          </TypeRadio>
        </div>
      </Field>

      {type === 'subscription' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Billing cycle" required error={state.fieldErrors?.billingCycle}>
            <Select
              value={billingCycle ?? ''}
              onValueChange={(v) => setBillingCycle(v as 'monthly' | 'quarterly' | 'yearly')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Next renewal" required error={state.fieldErrors?.nextRenewal}>
            <Input
              name="nextRenewal"
              type="date"
              defaultValue={toDateInputValue(initial?.nextRenewal ?? null)}
              required
            />
          </Field>

          <Field label="Fixed cost" required error={state.fieldErrors?.fixedCost}>
            <Input
              name="fixedCost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.fixedCost ?? ''}
              placeholder="0.00"
              required
            />
          </Field>

          <Field label="Currency" required error={state.fieldErrors?.currency}>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
          Usage-based services don&apos;t have a fixed cost or renewal date. Costs come from
          billing events recorded against the service.
        </p>
      )}

      <Field label="Owner" helper="Defaults to you. Used for audit trails and renewal reminders." error={state.fieldErrors?.ownerUserId}>
        <Select
          value={ownerUserId ?? '__none__'}
          onValueChange={(v) => setOwnerUserId(v === '__none__' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="No owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No owner</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Notes" error={state.fieldErrors?.notes}>
        <textarea
          name="notes"
          defaultValue={initial?.notes ?? ''}
          rows={3}
          maxLength={2000}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          placeholder="Optional notes about this service…"
        />
      </Field>

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" asChild>
          <Link href="/services">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create service'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  helper,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      <div id={id}>{children}</div>
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : helper ? (
        <p className="text-muted-foreground text-xs">{helper}</p>
      ) : null}
    </div>
  );
}

function TypeRadio({
  value,
  current,
  onSelect,
  children,
}: {
  value: 'subscription' | 'usage';
  current: 'subscription' | 'usage';
  onSelect: (v: 'subscription' | 'usage') => void;
  children: React.ReactNode;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onSelect(value)}
      className={cn(
        'border-input flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}

function VendorCombobox({
  vendors,
  value,
  onChange,
}: {
  vendors: Vendor[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = vendors.find((v) => v.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className={cn(!selected && 'text-muted-foreground')}>
            {selected ? selected.name : 'Custom (no vendor)'}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search vendors…" />
          <CommandList>
            <CommandEmpty>No vendor found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__custom__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 size-4',
                    value === null ? 'opacity-100' : 'opacity-0',
                  )}
                />
                Custom (no vendor)
              </CommandItem>
              {vendors.map((v) => (
                <CommandItem
                  key={v.id}
                  value={v.name}
                  onSelect={() => {
                    onChange(v.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value === v.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="flex-1">{v.name}</span>
                  <span className="text-muted-foreground text-xs uppercase">{v.category}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
