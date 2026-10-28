/**
 * scripts/smoke.ts — `bun run smoke`: the post-merge check against the running server
 * (cicd-pipeline.md "Post-merge smoke"; team.md Deployment: "the deployment is not done
 * until it passes").
 *
 * Against `http://127.0.0.1:${PORT:-3000}`:
 *   1. `GET /build-sha` equals `git rev-parse HEAD` (a stale or dirty bundle fails);
 *   2. `GET /api/health` is `{status: "up", db: "up"}`;
 *   3. sign in with the Owner's email (`SMOKE_EMAIL` or the prompt) and the password typed
 *      at the prompt — never taken from an argument, never written anywhere;
 *   4. `GET /api/orders` answers 200;
 *   4b. U3 (I-04): `GET /api/staff` answers 200 for the Owner;
 *   5. sign out (204), and the old cookie then answers 401.
 * It prints one line and exits 0 only when every step passed. The steps are `runSmoke`, so
 * tests/unit/smoke.test.ts can run them against the in-process pipeline.
 */
import { fail, gitHead, say } from "./lib/run.js";

const PORT = Number(process.env["PORT"] ?? "3000");
const BASE = `http://127.0.0.1:${PORT}`;

/** Read one line from the terminal without echoing it (or from a pipe, as is). */
const readSecret = async (label: string): Promise<string> => {
  process.stdout.write(label);
  const stdin = process.stdin;
  const tty = stdin.isTTY === true;
  if (tty) stdin.setRawMode(true);
  return new Promise((resolve) => {
    let value = "";
    const onData = (chunk: Buffer): void => {
      for (const ch of chunk.toString("utf8")) {
        if (ch === "\r" || ch === "\n") {
          stdin.off("data", onData);
          if (tty) stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") process.exit(130);
        value = ch === "\u007f" ? value.slice(0, -1) : value + ch;
      }
    };
    stdin.on("data", onData);
    stdin.resume();
  });
};

/** What one smoke run needs; the command line fills it from git, the prompt and `fetch`. */
export interface SmokeInput {
  readonly base: string;
  readonly head: string;
  readonly email: string;
  readonly password: string;
  readonly fetch: typeof fetch;
}

export type SmokeResult =
  { readonly ok: true; readonly line: string } | { readonly ok: false; readonly at: string };

class SmokeStop extends Error {}

/**
 * The smoke steps in order, stopping at the first that fails. U3 (I-04): after the orders
 * list, `GET /api/staff` as the Owner must answer 200 — the staff screen's data is served.
 */
export const runSmoke = async (input: SmokeInput): Promise<SmokeResult> => {
  const { base, head } = input;
  const step = (ok: boolean, what: string): void => {
    if (!ok) throw new SmokeStop(what);
  };
  try {
    const sha = await input.fetch(`${base}/build-sha`).then(
      async (r) => (r.ok ? (await r.text()).trim() : ""),
      () => "",
    );
    step(sha === head, `/build-sha is "${sha}", HEAD is ${head}`);

    const health = await input.fetch(`${base}/api/health`).then(
      (r) => r.json() as Promise<unknown>,
      () => null,
    );
    step(
      JSON.stringify(health) === JSON.stringify({ status: "up", db: "up" }),
      "health is not up/up",
    );

    const write = { Origin: base, "Content-Type": "application/json" };
    const signIn = await input.fetch(`${base}/api/auth/sign-in`, {
      method: "POST",
      headers: write,
      body: JSON.stringify({ email: input.email, password: input.password }),
    });
    step(signIn.status === 200, `sign-in answered ${signIn.status}`);
    const cookie = (signIn.headers.get("Set-Cookie") ?? "").split(";")[0] ?? "";

    const list = await input.fetch(`${base}/api/orders`, { headers: { Cookie: cookie } });
    step(list.status === 200, `GET /api/orders answered ${list.status}`);

    const staff = await input.fetch(`${base}/api/staff`, { headers: { Cookie: cookie } });
    step(staff.status === 200, `GET /api/staff answered ${staff.status}`);

    const out = await input.fetch(`${base}/api/auth/sign-out`, {
      method: "POST",
      headers: { ...write, Cookie: cookie },
      body: "{}",
    });
    step(out.status === 204, `sign-out answered ${out.status}`);
    const after = await input.fetch(`${base}/api/session`, { headers: { Cookie: cookie } });
    step(after.status === 401, `the signed-out cookie still answered ${after.status}`);
  } catch (e: unknown) {
    if (e instanceof SmokeStop) return { ok: false, at: e.message };
    throw e;
  }
  return {
    ok: true,
    line: `smoke ok: ${head.slice(0, 12)} on ${base} (build-sha, health, sign-in, orders, staff, sign-out)`,
  };
};

const main = async (): Promise<void> => {
  const head = await gitHead();
  const email = process.env["SMOKE_EMAIL"] ?? (prompt("Owner email:") ?? "").trim();
  const password = await readSecret("Password (not shown): ");
  const r = await runSmoke({ base: BASE, head, email, password, fetch: globalThis.fetch });
  if (!r.ok) fail(`smoke FAILED at: ${r.at}`);
  else say(r.line);
};

if (import.meta.main) await main();
