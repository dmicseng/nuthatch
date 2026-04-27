'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          router.push('/login');
          router.refresh();
        })
      }
      className="text-sm text-[var(--accent-warm)] hover:underline disabled:opacity-50"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
