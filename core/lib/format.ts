type MoneyInput = number | string | { toNumber(): number; toString(): string };

export function formatMoney(amount: MoneyInput | null | undefined, currency: string): string {
  if (amount == null) return '—';
  const n = typeof amount === 'number'
    ? amount
    : typeof amount === 'string'
      ? Number(amount)
      : amount.toNumber();
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

export function formatRelativeDate(date: Date | null | undefined): string {
  if (!date) return '—';
  const days = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (Math.abs(days) >= 30) return formatDate(date);
  return RELATIVE_FORMATTER.format(days, 'day');
}

export function formatDelta(amount: MoneyInput, currency: string): string {
  const n = typeof amount === 'number'
    ? amount
    : typeof amount === 'string'
      ? Number(amount)
      : amount.toNumber();
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + formatMoney(n, currency);
}

export function formatPercent(n: number, fractionDigits = 0): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(fractionDigits)}%`;
}

export function formatMonthShort(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
}

export function formatMonthLong(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
