import type { Organization } from '@prisma/client';
import { encryptDek, generateDek } from '@/lib/crypto/envelope';
import { testPrisma } from './db';

/**
 * Creates a test org with an eagerly-generated DEK so it can store credentials.
 * Mirrors what createOrgWithOwner does in production code; bypasses membership
 * creation since most tests don't need it.
 */
export async function createTestOrg(name: string): Promise<Organization> {
  return testPrisma.organization.create({
    data: { name, dekEncrypted: encryptDek(generateDek()) },
  });
}
