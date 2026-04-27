import { describe, expect, it } from 'vitest';
import { BCRYPT_ROUNDS, hashPassword, verifyPassword } from '@/lib/auth/password';

describe('password', () => {
  it('hashes and verifies a password (round-trip)', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('produces different hashes for the same password (salted)', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
    await expect(verifyPassword('same-password', a)).resolves.toBe(true);
    await expect(verifyPassword('same-password', b)).resolves.toBe(true);
  });

  it('uses bcrypt cost factor of 12', async () => {
    expect(BCRYPT_ROUNDS).toBe(12);
    const hash = await hashPassword('x');
    // bcrypt format: $2[abxy]$<cost>$<22 char salt><31 char hash>
    expect(hash).toMatch(/^\$2[abxy]\$12\$/);
  });
});
