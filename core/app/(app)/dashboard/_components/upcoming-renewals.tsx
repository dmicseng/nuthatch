import Link from 'next/link';
import type { ServiceWithRelations } from '@/lib/db/repositories/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney, formatRelativeDate } from '@/lib/format';

export function UpcomingRenewals({
  items,
  totalCount,
  limit = 5,
}: {
  items: ServiceWithRelations[];
  totalCount: number;
  limit?: number;
}) {
  const visible = items.slice(0, limit);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-serif text-lg font-normal">Upcoming renewals</CardTitle>
        {totalCount > limit ? (
          <Link
            href="/services?filter=upcoming"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            View all ({totalCount})
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">
        {visible.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">
            No upcoming renewals in the next 14 days.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {visible.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/services/${s.id}/edit`}
                    className="hover:text-primary block truncate font-medium"
                  >
                    {s.displayName}
                  </Link>
                  <p className="text-muted-foreground truncate text-xs">
                    {s.vendor?.name ?? 'Custom'} ·{' '}
                    {s.nextRenewal ? formatRelativeDate(s.nextRenewal) : '—'}
                  </p>
                </div>
                <div className="font-mono text-sm tabular-nums">
                  {s.fixedCost
                    ? formatMoney(s.fixedCost.toString(), s.currency)
                    : '—'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
