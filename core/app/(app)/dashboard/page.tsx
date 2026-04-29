import { requireAuth } from '@/lib/auth/middleware';
import {
  categoryBreakdown,
  last6MonthsTotals,
  listUpcomingRenewals,
  monthlySummary,
} from '@/lib/db/repositories/services';
import { getOrgBudget } from '@/lib/db/repositories/budgets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDelta, formatMoney, formatPercent } from '@/lib/format';
import { KpiCard } from './_components/kpi-card';
import { TrendChart } from './_components/trend-chart';
import { UpcomingRenewals } from './_components/upcoming-renewals';
import { CategoryBars } from './_components/category-bars';
import { DashboardEmptyState } from './_components/empty-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await requireAuth();
  const now = new Date();

  const [summary, categories, trend, upcoming, budget] = await Promise.all([
    monthlySummary(session.orgId, now),
    categoryBreakdown(session.orgId, now),
    last6MonthsTotals(session.orgId, now),
    listUpcomingRenewals(session.orgId, 14),
    getOrgBudget(session.orgId),
  ]);

  if (summary.activeServicesCount === 0) {
    return <DashboardEmptyState />;
  }

  const sevenDayCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const next7 = upcoming.filter((s) => s.nextRenewal && s.nextRenewal <= sevenDayCutoff);
  const next7Total = next7.reduce(
    (sum, s) => sum + Number(s.fixedCost?.toString() ?? '0'),
    0,
  );

  const delta = summary.thisMonthTotal - summary.lastMonthTotal;
  const deltaPct =
    summary.lastMonthTotal > 0
      ? (delta / summary.lastMonthTotal) * 100
      : null;

  let budgetValue = '—';
  let budgetSub = 'No budget set';
  let budgetTone: 'default' | 'warn' = 'default';
  if (budget) {
    const limit = Number(budget.monthlyLimit.toString());
    const usedPct = limit > 0 ? Math.round((summary.thisMonthTotal / limit) * 100) : 0;
    budgetValue = `${usedPct}%`;
    budgetSub = `of ${formatMoney(limit, budget.currency)}`;
    if (usedPct >= budget.alertThresholdPct) budgetTone = 'warn';
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {summary.currency} · {summary.activeServicesCount}{' '}
          {summary.activeServicesCount === 1 ? 'active service' : 'active services'}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="This month"
          value={formatMoney(summary.thisMonthTotal, summary.currency)}
          sub={
            summary.thisMonthProjected > 0
              ? `${formatMoney(summary.thisMonthActual, summary.currency)} actual + ${formatMoney(summary.thisMonthProjected, summary.currency)} projected`
              : `${summary.activeServicesCount} active ${summary.activeServicesCount === 1 ? 'service' : 'services'}`
          }
        />
        <KpiCard
          label="vs last month"
          value={
            summary.lastMonthTotal === 0 && summary.thisMonthTotal === 0
              ? '—'
              : formatDelta(delta, summary.currency)
          }
          sub={deltaPct == null ? 'No comparison data' : formatPercent(deltaPct, 0)}
          tone={delta > 0 ? 'concerning' : delta < 0 ? 'good' : 'default'}
        />
        <KpiCard
          label="Next 7 days"
          value={formatMoney(next7Total, summary.currency)}
          sub={`${next7.length} ${next7.length === 1 ? 'renewal' : 'renewals'}`}
        />
        <KpiCard
          label="Budget used"
          value={budgetValue}
          sub={budgetSub}
          tone={budgetTone}
          mono={Boolean(budget)}
        />
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-lg font-normal">Last 6 months</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trend} currency={summary.currency} />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UpcomingRenewals items={upcoming} totalCount={upcoming.length} />
        </div>
        <div>
          <CategoryBars rows={categories} currency={summary.currency} />
        </div>
      </section>
    </div>
  );
}
