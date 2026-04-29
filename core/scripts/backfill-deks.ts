/**
 * Backfill DEKs for orgs that pre-date envelope encryption.
 *
 * Idempotent — safe to re-run. Each org without `dek_encrypted` gets one
 * generated and stored encrypted with the master KEK.
 *
 * Run BEFORE applying the `dek_required` migration.
 */
import { PrismaClient } from '@prisma/client';
import { encryptDek, generateDek } from '@/lib/crypto/envelope';

const prisma = new PrismaClient();

async function main() {
  // Use raw SQL because once `dek_encrypted` becomes NOT NULL (after the
  // matching migration applies), Prisma's typed filter no longer accepts
  // `null`. This script is intentionally robust against the column's
  // pre-migration state.
  const orgs = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name FROM organizations WHERE dek_encrypted IS NULL
  `;

  if (orgs.length === 0) {
    console.log('No orgs need backfilling. Database is clean.');
    return;
  }

  console.log(`Backfilling DEKs for ${orgs.length} org(s)...`);
  for (const org of orgs) {
    const dek = generateDek();
    const encrypted = encryptDek(dek);
    await prisma.organization.update({
      where: { id: org.id },
      data: { dekEncrypted: encrypted },
    });
    console.log(`  + ${org.name} (${org.id})`);
  }
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
