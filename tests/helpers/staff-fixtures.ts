/**
 * tests/helpers/staff-fixtures.ts — what the U3 tests share (unit-test instructions
 * "Mocking and stubbing"; review P-01, P-02).
 *
 *   - `spyGate()` wraps a real hash gate and counts `run` calls, so a test can assert that an
 *     unknown token was refused without any hashing (NFR6.20) and that recover never touches
 *     the gate (NFR3.18);
 *   - `fullGate()` is a gate with 0 permits and 0 queue: every `run` answers `rate_limited`;
 *   - `deferred()` is a promise the test resolves by hand — the pause points of `deps.hooks`;
 *   - `staffWorld()` seeds the SQL stub with one business, one active user per role (plus an
 *     inactive sales staff member) and a live session per role, through the real session
 *     store (tests/helpers/server-harness.ts).
 * Tokens are always made by the code under test; no fixed token or password literal here
 * matches the secret scan.
 */
import { createHashGate, type HashGate } from "../../src/auth/hash-gate.js";
import type { Role } from "../../src/data/enums.js";
import type { Uuid } from "../../src/data/uuid.js";
import { makeSqlStub, type SqlStubOptions } from "./sql-stub.js";
import { BUSINESS, seedBusiness, userIdFor } from "./server-harness.js";

export interface GateSpy {
  readonly gate: HashGate;
  readonly calls: () => number;
}

export const spyGate = (inner: HashGate = createHashGate()): GateSpy => {
  let calls = 0;
  return {
    gate: {
      run: (work) => {
        calls += 1;
        return inner.run(work);
      },
      inFlight: inner.inFlight,
      waiting: inner.waiting,
    },
    calls: () => calls,
  };
};

/** A gate that refuses every call (0 permits, 0 queue): B1's 429. */
export const fullGate = (): HashGate => createHashGate(0, 0);

export interface Deferred {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
}

export const deferred = (): Deferred => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

/** A password that passes the 10-character rule; never a real credential. */
export const NEW_PASSWORD = "brand-new-pass-1";

export const INACTIVE_ID = "a5000000-0000-4000-8000-0000000000a1" as Uuid;
export const OTHER_BUSINESS_USER = "a6000000-0000-4000-8000-0000000000a1" as Uuid;

export interface StaffWorld {
  readonly stub: ReturnType<typeof makeSqlStub>;
  readonly tokens: Readonly<Record<Role, string>>;
  readonly businessId: Uuid;
  readonly id: (role: Role) => Uuid;
}

export const staffWorld = async (opts: SqlStubOptions = {}): Promise<StaffWorld> => {
  const stub = makeSqlStub(opts);
  const tokens = await seedBusiness(stub);
  stub.state.users.push({
    id: INACTIVE_ID,
    business_id: BUSINESS,
    email: "gone@acme.test",
    password_hash: "x",
    role: "sales_staff",
    active: false,
    locale: "bn",
  });
  return { stub, tokens, businessId: BUSINESS, id: userIdFor };
};

/** The token from a one-time link (`…#/<kind>?t=<token>`). */
export const tokenOf = (link: string): string =>
  new URL(link.replace("#/", "")).searchParams.get("t") ?? "";
