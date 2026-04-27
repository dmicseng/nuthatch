import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--bg)]">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="font-serif text-4xl italic text-[var(--accent-deep)]">
            Nuthatch
          </span>
        </Link>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-8 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
