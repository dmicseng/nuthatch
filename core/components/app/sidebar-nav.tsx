'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/services', label: 'Services', Icon: Receipt },
  { href: '/settings', label: 'Settings', Icon: Settings },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            data-active={active}
            className={cn(
              'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-accent hover:text-foreground',
              active && 'bg-accent text-foreground',
            )}
          >
            <span
              className={cn(
                'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-opacity',
                'bg-primary opacity-0',
                active && 'opacity-100',
              )}
              aria-hidden
            />
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
