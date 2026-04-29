import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardEmptyState() {
  return (
    <div className="bg-card flex flex-col items-center justify-center rounded-lg border py-20 text-center">
      <h2 className="font-serif text-3xl">Nothing tracked yet</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        Add your first service to start seeing your spend across SaaS, cloud, and AI.
      </p>
      <Button asChild className="mt-6">
        <Link href="/services/new">
          <Plus className="size-4" />
          Add your first service
        </Link>
      </Button>
    </div>
  );
}
