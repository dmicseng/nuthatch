'use client';

import { useEffect, useRef, useState } from 'react';
import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '@/lib/format';

type TrendPoint = {
  month: string;
  monthFull: string;
  total: number;
  serviceCount: number;
  isCurrent: boolean;
};

const CHART_HEIGHT = 240;

export function TrendChart({
  data,
  currency,
}: {
  data: TrendPoint[];
  currency: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setWidth(node.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ width: '100%', height: CHART_HEIGHT, minWidth: 0 }}
    >
      {width > 0 ? (
        <LineChart
          width={width}
          height={CHART_HEIGHT}
          data={data}
          margin={{ top: 8, right: 12, left: 12, bottom: 4 }}
        >
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickFormatter={(v: number) => abbreviate(v, currency)}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }}
            content={<TrendTooltip currency={currency} />}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: 'hsl(var(--chart-1))' }}
            activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--chart-1))' }}
            isAnimationActive={false}
          />
        </LineChart>
      ) : null}
    </div>
  );
}

function abbreviate(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
}

function TrendTooltip({
  currency,
  active,
  payload,
}: {
  currency: string;
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
      <div className="font-medium">
        {point.monthFull}
        {point.isCurrent ? (
          <span className="text-muted-foreground ml-1 text-xs">(partial)</span>
        ) : null}
      </div>
      <div className="font-mono">{formatMoney(point.total, currency)}</div>
      <div className="text-muted-foreground text-xs">
        {point.serviceCount} {point.serviceCount === 1 ? 'service' : 'services'}
      </div>
    </div>
  );
}
