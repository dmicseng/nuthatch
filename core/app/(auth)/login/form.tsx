'use client';

import { useActionState } from 'react';
import { loginAction, type LoginActionState } from './actions';

const errorMessages: Record<string, string> = {
  invalid_credentials: 'Invalid email or password.',
  internal_error: 'Something went wrong. Please try again.',
};

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
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
        {pending ? 'Signing in…' : 'Sign in'}
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
  error?: string;
}) {
  const { label, name, error, ...rest } = props;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1 text-[var(--text-1)]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...rest}
        className="w-full px-3 py-2 border border-[var(--border)] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
      />
      {error ? <p className="mt-1 text-sm text-[var(--error)]">{error}</p> : null}
    </div>
  );
}
