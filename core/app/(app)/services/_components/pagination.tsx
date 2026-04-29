import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
  page,
  pageSize,
  total,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function pageHref(p: number) {
    const q = new URLSearchParams(searchParams);
    if (p <= 1) {
      q.delete('page');
    } else {
      q.set('page', String(p));
    }
    const s = q.toString();
    return s ? `/services?${s}` : '/services';
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <p className="text-muted-foreground text-sm">
        Page {page} of {totalPages} · {total} {total === 1 ? 'service' : 'services'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={prevDisabled} asChild={!prevDisabled}>
          {prevDisabled ? (
            <span>
              <ChevronLeft className="size-4" /> Previous
            </span>
          ) : (
            <Link href={pageHref(page - 1)}>
              <ChevronLeft className="size-4" /> Previous
            </Link>
          )}
        </Button>
        <Button variant="outline" size="sm" disabled={nextDisabled} asChild={!nextDisabled}>
          {nextDisabled ? (
            <span>
              Next <ChevronRight className="size-4" />
            </span>
          ) : (
            <Link href={pageHref(page + 1)}>
              Next <ChevronRight className="size-4" />
            </Link>
          )}
        </Button>
      </div>
    </div>
  );
}
