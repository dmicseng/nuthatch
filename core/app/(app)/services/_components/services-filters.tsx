'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CATEGORIES = [
  { value: 'all', label: 'All categories' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'ai', label: 'AI' },
  { value: 'design', label: 'Design' },
  { value: 'comms', label: 'Comms' },
  { value: 'dev', label: 'Dev' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Other' },
];

export function ServicesFilters({
  search,
  category,
  type,
  includeInactive,
}: {
  search: string;
  category: string;
  type: 'all' | 'subscription' | 'usage';
  includeInactive: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value == null || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.delete('page');
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          defaultValue={search}
          placeholder="Search services or notes…"
          onChange={(e) => setParam('search', e.target.value)}
          className="max-w-sm"
          data-pending={pending || undefined}
        />
        <Select
          value={category || 'all'}
          onValueChange={(v) => setParam('category', v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="text-muted-foreground inline-flex cursor-pointer items-center gap-2 text-sm sm:ml-auto">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setParam('include', e.target.checked ? 'all' : null)}
            className="border-input size-4 rounded"
          />
          Show deactivated
        </label>
      </div>
      <Tabs value={type} onValueChange={(v) => setParam('type', v === 'all' ? null : v)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="usage">Usage-based</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
