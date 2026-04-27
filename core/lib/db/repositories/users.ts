import type { Prisma, User } from '@prisma/client';
import { prisma } from '@/lib/db/client';

type Db = Prisma.TransactionClient | typeof prisma;

export function findByEmail(email: string, db: Db = prisma): Promise<User | null> {
  return db.user.findUnique({ where: { email } });
}

export function findById(id: string, db: Db = prisma): Promise<User | null> {
  return db.user.findUnique({ where: { id } });
}

export function createUser(
  input: { email: string; passwordHash: string; name?: string | null },
  db: Db = prisma,
): Promise<User> {
  return db.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name ?? null,
    },
  });
}

export function updatePassword(
  id: string,
  passwordHash: string,
  db: Db = prisma,
): Promise<User> {
  return db.user.update({
    where: { id },
    data: { passwordHash },
  });
}
