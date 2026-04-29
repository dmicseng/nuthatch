'use client';

import { useActionState } from 'react';
import { signupAction, type SignupActionState } from './actions';

const errorMessages: Record<string, string> = {
  email_exists: 'An account with that email already exists.',
  invite_invalid_or_expired: 'This invite link is invalid or has expired.',
  invite_email_mismatch: 'Email must match the invited address.',
  invite_already_used: 'This invite has already been used.',
  invite_org_missing: 'The invited organization no longer exists.',
  internal_error: 'Something went wrong. Please try again.',
};

const initialState: SignupActionState = {};

export function SignupForm({
  inviteToken,
  lockedEmail,
}: {
  inviteToken?: string;
  lockedEmail?: string | null;
}) {
  const [state, action, pending] = useActionState(signupAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {inviteToken ? <input type="hidden" name="inviteToken" value={inviteToken} /> : null}

      <Field
        label="Name"
        name="name"
        type="text"
        autoComplete="name"
        required
        error={state.fieldErrors?.name}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={lockedEmail ?? undefined}
        readOnly={!!lockedEmail}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        helper="At least 8 characters."
        error={state.fieldErrors?.password}
      />

      {state.error && errorMessages[state.error] ? (
        <p className="text-sm text-[var(--error)]">{errorMessages[state.error]}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[var(--accent-warm)] hover:bg-[var(--accent-warm-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded transition"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

function Field(props: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
  helper?: string;
  error?: string;
}) {
  const { label, name, helper, error, ...rest } = props;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1 text-[var(--text-1)]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...rest}
        className="w-full px-3 py-2 border border-[var(--border-line)] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent disabled:bg-[var(--surface)] read-only:bg-[var(--surface)] read-only:cursor-not-allowed"
      />
      {error ? (
        <p className="mt-1 text-sm text-[var(--error)]">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-xs text-[var(--text-2)]">{helper}</p>
      ) : null}
    </div>
  );
}
