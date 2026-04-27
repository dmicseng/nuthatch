'use client';

import { useState } from 'react';

export function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="wl-success" role="status" aria-live="polite">
        <strong>You&apos;re on the list.</strong>
        We&apos;ll email when early access opens. In the meantime, watch the repo on GitHub.
      </div>
    );
  }

  return (
    <form
      className="wl-form"
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: replace with form backend (Formspree, etc.)
        setSubmitted(true);
      }}
    >
      <div className="row">
        <input
          type="email"
          name="email"
          placeholder="you@company.com"
          required
          autoComplete="email"
          aria-label="Email address"
        />
        <select name="size" required defaultValue="" aria-label="Team size">
          <option value="" disabled>
            Team size
          </option>
          <option value="solo">Just me</option>
          <option value="2-10">2–10</option>
          <option value="11-50">11–50</option>
          <option value="51-200">51–200</option>
          <option value="200+">200+</option>
        </select>
      </div>
      <div className="checks">
        <label>
          <input type="checkbox" name="interest" value="selfhost" /> Self-host
        </label>
        <label>
          <input type="checkbox" name="interest" value="cloud" /> Managed cloud
        </label>
        <label>
          <input type="checkbox" name="interest" value="design_partner" /> Design partner
        </label>
      </div>
      <button type="submit" className="btn btn-primary">
        Join early access
      </button>
      <div className="wl-fine">By joining, you agree to receive occasional product updates.</div>
    </form>
  );
}
