import Link from 'next/link';
import { LoginForm } from './form';

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-serif italic text-[var(--accent-deep)] mb-2">
        Welcome back
      </h1>
      <p className="text-sm text-[var(--text-2)] mb-6">Sign in to your Nuthatch dashboard.</p>

      <LoginForm />

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/signup" className="text-[var(--accent-warm)] hover:underline">
          Create account
        </Link>
        {/* TODO: implement forgot password flow */}
        <span className="text-[var(--text-2)]">Forgot password?</span>
      </div>
    </div>
  );
}
