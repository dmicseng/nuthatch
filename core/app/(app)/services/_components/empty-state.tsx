import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ServicesEmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="bg-card flex flex-col items-center justify-center rounded-lg border py-16 text-center">
        <h3 className="font-serif text-xl">No matches</h3>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Try a different search or clear the filters.
        </p>
        <Button variant="ghost" asChild className="mt-4">
          <Link href="/services">Clear filters</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="bg-card flex flex-col items-center justify-center rounded-lg border py-16 text-center">
      <h3 className="font-serif text-2xl">No services yet</h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        Add your first service to start tracking SaaS, cloud, and AI spend in one place.
      </p>
      <Button asChild className="mt-4">
        <Link href="/services/new">
          <Plus className="size-4" />
          Add your first service
        </Link>
      </Button>
    </div>
  );
}
