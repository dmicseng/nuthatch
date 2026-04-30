/**
 * Credentials repository.
 *
 * Plaintext credentials are accepted only as input to `store()` and returned
 * only from `retrieve()`. They MUST NOT be logged, serialized into errors, or
 * cached. Callers should hold the return value of `retrieve()` only as long
 * as needed to make the API call.
 */

import { Prisma, type CredentialKind } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { decryptField, encryptField, KEK_VERSION } from '@/lib/crypto/envelope';
import { logAudit } from './audit';
import { loadOrgDek } from './orgs';

type Db = Prisma.TransactionClient | typeof prisma;

export type StoreInput = {
  serviceId: string;
  orgId: string;
  kind: CredentialKind;
  /** Plaintext credentials — encrypted before write. */
  credentials: Record<string, unknown>;
};

/**
 * Encrypt and store credentials for a service. If a credential row already
 * exists for the service it is replaced (rotation flow); the audit row's
 * action reflects this.
 */
export async function store(input: StoreInput, actorUserId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const service = await tx.service.findFirst({
      where: { id: input.serviceId, orgId: input.orgId },
      select: { id: true, displayName: true },
    });
    if (!service) throw new Error('not_found');

    const dek = await loadOrgDek(input.orgId, tx);
    let _plainJson = JSON.stringify(input.credentials);
    const encryptedData = encryptField(_plainJson, dek);
    _plainJson = '';

    const existing = await tx.credential.findUnique({
      where: { serviceId: input.serviceId },
      select: { id: true },
    });

    if (existing) {
      await tx.credential.update({
        where: { serviceId: input.serviceId },
        data: {
          kind: input.kind,
          encryptedData,
          keyId: KEK_VERSION,
          rotatedAt: new Date(),
        },
      });
    } else {
      await tx.credential.create({
        data: {
          serviceId: input.serviceId,
          kind: input.kind,
          encryptedData,
          keyId: KEK_VERSION,
        },
      });
    }

    await tx.service.update({
      where: { id: input.serviceId },
      data: { lastSyncedAt: null, lastSyncError: null },
    });

    await logAudit(
      {
        orgId: input.orgId,
        userId: actorUserId,
        action: existing ? 'credential.rotated' : 'credential.created',
        resourceType: 'service',
        resourceId: input.serviceId,
        details: { kind: input.kind, keyId: KEK_VERSION },
      },
      tx,
    );
  });
}

/**
 * Decrypt and return the credentials JSON for a service. Throws `not_found`
 * if the service or credential is missing or in another org.
 *
 * Caller MUST treat the return value as sensitive — narrow the lifetime.
 */
export async function retrieve(
  serviceId: string,
  orgId: string,
  db: Db = prisma,
): Promise<Record<string, unknown>> {
  const credential = await db.credential.findFirst({
    where: { serviceId, service: { orgId } },
    select: { encryptedData: true },
  });
  if (!credential) throw new Error('not_found');
  const dek = await loadOrgDek(orgId, db);
  const plaintext = decryptField(Buffer.from(credential.encryptedData), dek);
  return JSON.parse(plaintext) as Record<string, unknown>;
}

/**
 * Hard-delete the credential for a service. We do not soft-delete credentials —
 * if the user wants the secret gone, gone is what they get.
 */
export async function deleteCred(
  serviceId: string,
  orgId: string,
  actorUserId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const service = await tx.service.findFirst({
      where: { id: serviceId, orgId },
      select: { id: true },
    });
    if (!service) throw new Error('not_found');

    const existing = await tx.credential.findUnique({
      where: { serviceId },
      select: { id: true },
    });
    if (!existing) return;

    await tx.credential.delete({ where: { serviceId } });
    await logAudit(
      {
        orgId,
        userId: actorUserId,
        action: 'credential.deleted',
        resourceType: 'service',
        resourceId: serviceId,
        details: {},
      },
      tx,
    );
  });
}

/**
 * Cheap presence check for status badges in lists. Does not decrypt.
 */
export async function exists(
  serviceId: string,
  orgId: string,
  db: Db = prisma,
): Promise<boolean> {
  const row = await db.credential.findFirst({
    where: { serviceId, service: { orgId } },
    select: { id: true },
  });
  return row != null;
}
