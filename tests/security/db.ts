/**
 * Helpers for SQL security tests. Each `as(actor, fn)` call runs inside a transaction that is
 * always rolled back, with the same role and JWT claims PostgREST would set for that caller.
 * Requires the local stack seeded by supabase/seed.sql (`npm run db:reset`).
 */
import { Client } from "pg";

export const IDS = {
  users: {
    admin: "10000000-0000-4000-a000-000000000001",
    supplierA: "10000000-0000-4000-a000-000000000002",
    supplierB: "10000000-0000-4000-a000-000000000003",
    customerA: "10000000-0000-4000-a000-000000000004",
    customerB: "10000000-0000-4000-a000-000000000005",
    pending: "10000000-0000-4000-a000-000000000006",
  },
  suppliers: { A: "00000000-0000-4000-a000-000000000001", B: "00000000-0000-4000-a000-000000000002" },
  customers: {
    A: "20000000-0000-4000-a000-000000000001",
    B: "20000000-0000-4000-a000-000000000002",
    pending: "20000000-0000-4000-a000-000000000003",
  },
  categories: { rice: "ca7e0000-0000-4000-a000-000000000001" },
  variants: { rice5: "50000000-0000-4000-a000-000000000001", mango: "50000000-0000-4000-a000-000000000003" },
} as const;

export type Actor = "anon" | keyof typeof IDS.users;

export type Query = <R extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => Promise<R[]>;

export function databaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
}

export async function connect(): Promise<Client> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  return client;
}

/** Run `fn` as `actor` in a transaction that is rolled back afterwards. */
export async function as<T>(client: Client, actor: Actor, fn: (q: Query) => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    if (actor === "anon") {
      await client.query("set local role anon");
      await client.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    } else {
      const claims = JSON.stringify({ sub: IDS.users[actor], role: "authenticated", aud: "authenticated" });
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    }
    const q: Query = async (sql, params) => (await client.query(sql, params)).rows;
    return await fn(q);
  } finally {
    await client.query("rollback");
  }
}

/** Run as the table owner (bypasses RLS), rolled back. For arranging test state. */
export async function asOwner<T>(client: Client, fn: (q: Query) => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    const q: Query = async (sql, params) => (await client.query(sql, params)).rows;
    return await fn(q);
  } finally {
    await client.query("rollback");
  }
}

/** Resolves to the Postgres error code, or "ok" if the statement succeeded. */
export async function outcome(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "ok";
  } catch (e) {
    return (e as { code?: string }).code ?? String(e);
  }
}

/** 42501 = insufficient_privilege (no grant, RLS WITH CHECK failure or guard trigger). */
export const DENIED = "42501";
