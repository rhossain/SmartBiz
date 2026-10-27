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
 *   5. sign out (204), and the old cookie then answers 401.
 * It prints one line and exits 0 only when every step passed.
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

const step = (ok: boolean, what: string): void => {
  if (!ok) fail(`smoke FAILED at: ${what}`);
};

const main = async (): Promise<void> => {
  const head = await gitHead();
  const sha = await fetch(`${BASE}/build-sha`).then(
    async (r) => (r.ok ? (await r.text()).trim() : ""),
    () => "",
  );
  step(sha === head, `/build-sha is "${sha}", HEAD is ${head}`);

  const health = await fetch(`${BASE}/api/health`).then(
    (r) => r.json() as Promise<unknown>,
    () => null,
  );
  step(
    JSON.stringify(health) === JSON.stringify({ status: "up", db: "up" }),
    "health is not up/up",
  );

  const email = process.env["SMOKE_EMAIL"] ?? (prompt("Owner email:") ?? "").trim();
  const password = await readSecret("Password (not shown): ");
  const write = { Origin: BASE, "Content-Type": "application/json" };
  const signIn = await fetch(`${BASE}/api/auth/sign-in`, {
    method: "POST",
    headers: write,
    body: JSON.stringify({ email, password }),
  });
  step(signIn.status === 200, `sign-in answered ${signIn.status}`);
  const cookie = (signIn.headers.get("Set-Cookie") ?? "").split(";")[0] ?? "";

  const list = await fetch(`${BASE}/api/orders`, { headers: { Cookie: cookie } });
  step(list.status === 200, `GET /api/orders answered ${list.status}`);

  const out = await fetch(`${BASE}/api/auth/sign-out`, {
    method: "POST",
    headers: { ...write, Cookie: cookie },
    body: "{}",
  });
  step(out.status === 204, `sign-out answered ${out.status}`);
  const after = await fetch(`${BASE}/api/session`, { headers: { Cookie: cookie } });
  step(after.status === 401, `the signed-out cookie still answered ${after.status}`);

  say(`smoke ok: ${head.slice(0, 12)} on ${BASE} (build-sha, health, sign-in, orders, sign-out)`);
};

if (import.meta.main) await main();
