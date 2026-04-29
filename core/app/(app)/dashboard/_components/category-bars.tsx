import type { CategoryBreakdownRow } from '@/lib/db/repositories/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/format';

const CATEGORY_LABELS: Record<string, string> = {
  cloud: 'Cloud',
  ai: 'AI',
  design: 'Design',
  comms: 'Comms',
  dev: 'Dev',
  finance: 'Finance',
  other: 'Other',
};

const COLOR_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function CategoryBars({
  rows,
  currency,
}: {
  rows: CategoryBreakdownRow[];
  currency: string;
}) {
  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.total)) : 0;
  const totalSum = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg font-normal">By category</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No spend tracked this month.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r, i) => {
              const widthPct = max > 0 ? (r.total / max) * 100 : 0;
              const sharePct = totalSum > 0 ? Math.round((r.total / totalSum) * 100) : 0;
              const color =
                i < COLOR_PALETTE.length ? COLOR_PALETTE[i] : 'var(--muted)';
              return (
                <li key={r.category} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-foreground">
                      {CATEGORY_LABELS[r.category] ?? r.category}
                    </span>
                    <span className="font-mono text-xs tabular-nums">
                      {formatMoney(r.total, currency)}{' '}
                      <span className="text-muted-foreground">{sharePct}%</span>
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: `hsl(${color})`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
