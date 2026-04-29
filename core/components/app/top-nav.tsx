import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';
import { MobileSidebar } from './mobile-sidebar';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

type Props = {
  orgName: string;
  user: { name: string | null; email: string };
  role: string;
};

export function TopNav({ orgName, user, role }: Props) {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:px-6">
      <MobileSidebar />
      <Link
        href="/dashboard"
        className="flex items-center gap-2 lg:hidden"
        aria-label="Nuthatch"
      >
        <BrandMark size={22} />
        <span className="font-serif text-lg italic leading-none">Nuthatch</span>
      </Link>
      <div className="text-muted-foreground flex-1 truncate text-sm">
        <span className="hidden sm:inline">{orgName}</span>
      </div>
      <ThemeToggle />
      <UserMenu name={user.name} email={user.email} role={role} />
    </header>
  );
}
