import Link from 'next/link';
import { verifyInviteToken } from '@/lib/auth/invite';
import { SignupForm } from './form';

type Props = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const inviteToken = params.invite;

  let invitedEmail: string | null = null;
  let inviteError: string | null = null;
  if (inviteToken) {
    const invite = await verifyInviteToken(inviteToken);
    if (invite) {
      invitedEmail = invite.email;
    } else {
      inviteError = 'This invite link is invalid or has expired.';
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-serif italic text-[var(--accent-deep)] mb-2">
        {invitedEmail ? 'Accept invitation' : 'Create your account'}
      </h1>
      <p className="text-sm text-[var(--text-2)] mb-6">
        {invitedEmail
          ? `You were invited to join an organization on Nuthatch.`
          : `Start tracking your team's spend.`}
      </p>

      {inviteError ? (
        <div className="mb-4 p-3 rounded border border-[var(--error)] text-[var(--error)] text-sm">
          {inviteError}
        </div>
      ) : null}

      <SignupForm
        inviteToken={!inviteError ? inviteToken : undefined}
        lockedEmail={invitedEmail}
      />

      <p className="mt-6 text-sm text-[var(--text-2)] text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--accent-warm)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
