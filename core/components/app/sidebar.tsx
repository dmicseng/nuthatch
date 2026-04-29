import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';
import { SidebarNav } from './sidebar-nav';

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:flex-col lg:border-r lg:bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="Nuthatch">
          <BrandMark size={24} />
          <span className="font-serif text-xl italic leading-none">Nuthatch</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
