import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Interactive transaction client passed to `runPivotalTransaction` callbacks.
 */
export type PivotalTransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

const SAVEPOINT_NAME_RE = /^[a-z][a-z0-9_]{0,62}$/;

/** PostgreSQL savepoint identifiers (unquoted): safe subset only. */
export function assertPgSavepointName(name: string): string {
  const n = name.trim().toLowerCase();
  if (!SAVEPOINT_NAME_RE.test(n)) {
    throw new Error(
      "Invalid savepoint name: use a lowercase letter, then letters, digits, or underscore (max 63 chars).",
    );
  }
  return n;
}

const defaultTxOptions = {
  maxWait: 5_000,
  timeout: 20_000,
} as const;

export type PivotalTransactionOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

/**
 * Runs work in a single interactive transaction (full rollback on any thrown error).
 * Use for multi-step writes and read-then-write flows that must stay consistent.
 */
export async function runPivotalTransaction<T>(
  fn: (tx: PivotalTransactionClient) => Promise<T>,
  options?: PivotalTransactionOptions,
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait ?? defaultTxOptions.maxWait,
    timeout: options?.timeout ?? defaultTxOptions.timeout,
    isolationLevel: options?.isolationLevel,
  });
}

/**
 * PostgreSQL SAVEPOINT: rolls back work inside the callback on failure, then rethrows
 * (the outer `runPivotalTransaction` still aborts unless you catch the error yourself).
 */
export async function withSavepoint<T>(
  tx: PivotalTransactionClient,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const sp = assertPgSavepointName(name);
  await tx.$executeRawUnsafe(`SAVEPOINT ${sp}`);
  try {
    const result = await fn();
    await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${sp}`);
    return result;
  } catch (error) {
    await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${sp}`);
    throw error;
  }
}

export type TrySavepointResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

/**
 * Like `withSavepoint`, but on failure rolls back to the savepoint and returns `{ ok: false }`
 * without rethrowing — the rest of the outer transaction can continue and commit.
 * Use for optional side effects (e.g. audit log) that must not fail the main operation.
 */
export async function tryWithSavepoint<T>(
  tx: PivotalTransactionClient,
  name: string,
  fn: () => Promise<T>,
): Promise<TrySavepointResult<T>> {
  const sp = assertPgSavepointName(name);
  await tx.$executeRawUnsafe(`SAVEPOINT ${sp}`);
  try {
    const value = await fn();
    await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${sp}`);
    return { ok: true, value };
  } catch (error) {
    await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${sp}`);
    return { ok: false, error };
  }
}
