import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Tone = 'default' | 'good' | 'concerning' | 'warn';

const TONE_CLASS: Record<Tone, string> = {
  default: 'text-foreground',
  good: 'text-secondary',
  concerning: 'text-primary',
  warn: 'text-primary',
};

export function KpiCard({
  label,
  value,
  sub,
  tone = 'default',
  mono = true,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  mono?: boolean;
}) {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-1">
        <CardTitle className="text-muted-foreground text-xs font-normal uppercase tracking-[0.12em]">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            'text-2xl leading-tight tracking-tight',
            mono && 'font-mono',
            TONE_CLASS[tone],
          )}
        >
          {value}
        </p>
        {sub ? (
          <p className="text-muted-foreground mt-1 text-xs">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
