/**
 * tests/integration/no-secret-responses.test.ts — the no-secret walk over every registered
 * route (W7; BR8.1, BR8.2; S14; NFR3.10, NFR3.11; AC5.3.1, AC5.3.2; review F-08; team.md
 * Testing Posture "no secret in any response body"; P-16).
 *
 * The REGISTERED route table drives it (src/server/routes.ts): a route with no entry in
 * tests/spec/fixtures.ts fails the walk, so a new route cannot skip it (F-08). For every route
 * it records the success answer and its error answers — 401 with no cookie (gated routes),
 * 403 for a role outside its row, 400 where the route takes input, 404 where it takes an id —
 * and scans every body and header for:
 *   - the KNOWN secret values, read from the seeded rows after the run: every stored
 *     password hash, every live session token (raw) and its SHA-256 `token_hash`, and any
 *     invitation or reset token hash (none until U3). The raw session token may appear only
 *     in `Set-Cookie`; hashes never appear anywhere;
 *   - the key names `passwordHash`, `password_hash`, `token_hash` (and an argon2 prefix);
 *   - a key named `link` from a route not on the closed allow-list (`[]` in U2, BR8.2).
 * It prints the routes, responses and checks it covered and its duration (O12, NFR8.12).
 */
import { describe, expect, test } from "bun:test";
import { insertSession } from "../../src/auth/session.js";
import { sha256 } from "../../src/auth/sha256.js";
import type { Uuid } from "../../src/data/uuid.js";
import { routeKey, routes } from "../../src/server/routes.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness, NOW, request } from "../helpers/server-harness.js";
import {
  API_FIXTURES,
  ORDER_REQUEST,
  parsedFixture,
  SIGN_UP_REQUEST,
  type ApiFixture,
} from "../spec/fixtures.js";
import {
  API_ROWS,
  apiKey,
  isAllowed,
  LINK_ALLOW_LIST,
  reportWalk,
  ROLES,
  type Role,
} from "../spec/role-table.js";

const SECRET_KEYS = new Set(["passwordHash", "password_hash", "token_hash"]);
const UNKNOWN_ID = "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f";

interface Recorded {
  readonly key: string;
  readonly probe: string;
  readonly status: number;
  readonly body: string;
  readonly headers: ReadonlyArray<readonly [string, string]>;
}

const cookieValue = (set: string | null): string | null =>
  set === null ? null : (/^__Host-sb_session=([^;]*)/.exec(set)?.[1] ?? null) || null;

/** Every key name anywhere in a JSON value. */
const keysOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([k, v]) => [k, ...keysOf(v)]);
};

const parse = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

describe("no secret leaves the server (every registered route)", () => {
  test(
    "success and error answers of every route hold no hash, token or unlisted link",
    async () => {
      const started = performance.now();
      const stub = makeSqlStub();
      const h = harness(stub);
      const recorded: Recorded[] = [];
      const rawTokens = new Set<string>();
      const send = async (
        key: string,
        probe: string,
        method: string,
        path: string,
        opts: Parameters<typeof request>[2] = {},
      ): Promise<Recorded> => {
        const r = await h.send(request(method, path, opts));
        const raw = cookieValue(r.headers.get("Set-Cookie"));
        if (raw !== null) rawTokens.add(raw);
        const rec: Recorded = {
          key,
          probe,
          status: r.status,
          body: await r.text(),
          headers: [...r.headers.entries()],
        };
        recorded.push(rec);
        return rec;
      };

      // Setup through the API itself: first-run sign-up (the success answer of that route).
      const up = await send("POST /api/auth/sign-up", "success", "POST", "/api/auth/sign-up", {
        body: SIGN_UP_REQUEST,
      });
      expect(up.status).toBe(201);
      const business = stub.state.businesses[0]?.["id"] as Uuid;
      const ownerToken = [...rawTokens][0] ?? "";
      const tokens: Record<Role, string> = {
        owner: ownerToken,
        manager: "",
        sales_staff: "",
        accountant: "",
      };
      for (const role of ROLES.filter((r) => r !== "owner")) {
        const id = `b${ROLES.indexOf(role)}000000-0000-4000-8000-0000000000b1` as Uuid;
        stub.state.users.push({
          id,
          business_id: business,
          email: `${role}@acme.test`,
          password_hash: `$argon2id$v=19$m=19456,t=2,p=1$${role}-stored-hash-value`,
          role,
          active: true,
          locale: "bn",
        });
        const s = await insertSession(stub.sql, { userId: id, businessId: business, at: NOW });
        tokens[role] = s.token;
        rawTokens.add(s.token);
      }
      const make = async (): Promise<string> => {
        const r = await h.send(
          request("POST", "/api/orders", { token: ownerToken, body: ORDER_REQUEST }),
        );
        return ((await r.json()) as { id: string }).id;
      };
      const orderId = await make();
      // A packed order, so linking a consignment can succeed (consignment.ts).
      const packedId = await make();
      for (const to of ["confirmed", "packed"]) {
        await h.send(
          request("POST", `/api/orders/${packedId}/status`, { token: ownerToken, body: { to } }),
        );
      }

      const missingFixture: string[] = [];
      for (const route of routes) {
        const key = routeKey(route);
        const fixture: ApiFixture | undefined = API_FIXTURES[key];
        if (fixture === undefined) {
          missingFixture.push(key);
          continue;
        }
        parsedFixture(key); // the recorded body still parses with the route's shared schema
        const row = API_ROWS.find((r) => apiKey(r) === key);
        if (row === undefined) throw new Error(`no role-table row for ${key}`);
        const id = key === "POST /api/orders/:id/consignment" ? packedId : orderId;
        const path = route.path.replace(":id", id);
        const inside = ROLES.find((r) => isAllowed(row.allowed, r)) ?? "owner";
        const outside = ROLES.find((r) => !isAllowed(row.allowed, r));
        const body = fixture.request;
        // Success: sign-up already succeeded above; sign-out uses its own fresh session.
        if (key === "POST /api/auth/sign-out") {
          const s = await insertSession(stub.sql, {
            userId: stub.state.users[0]?.["id"] as Uuid,
            businessId: business,
            at: NOW,
          });
          rawTokens.add(s.token);
          await send(key, "success", route.method, path, { token: s.token, body });
        } else if (key !== "POST /api/auth/sign-up") {
          const token = row.allowed === "public" ? null : tokens[inside];
          await send(key, "success", route.method, path, { token, body });
        }
        if (row.allowed !== "public") {
          await send(key, "401", route.method, path, { token: null, body });
          if (outside !== undefined) {
            await send(key, "403", route.method, path, { token: tokens[outside], body });
          }
        } else if (key === "POST /api/auth/sign-in") {
          await send(key, "401 wrong password", route.method, path, {
            body: { email: SIGN_UP_REQUEST.email, password: "wrong-wrong-1" },
          });
        } else if (key === "POST /api/auth/sign-up") {
          await send(key, "409 again", route.method, path, { body });
        }
        const token = row.allowed === "public" ? null : tokens[inside];
        if (fixture.badRequest !== undefined) {
          await send(key, "400", route.method, path, { token, body: fixture.badRequest });
        }
        if (fixture.badQuery !== undefined) {
          await send(key, "400", route.method, `${path}?${fixture.badQuery}`, { token });
        }
        if (route.path.includes(":id")) {
          await send(key, "404", route.method, route.path.replace(":id", UNKNOWN_ID), {
            token,
            body,
          });
        }
      }

      // The known secret values, read from the seeded rows (F-08).
      const hashes = [
        ...stub.state.users.map((u) => String(u["password_hash"])),
        ...stub.state.sessions.map((s) => String(s["token_hash"])),
        ...stub.state.invitations.map((i) => String(i["accept_token_hash"])),
        ...stub.state.passwordResets.map((p) => String(p["token_hash"])),
        ...(await Promise.all([...rawTokens].map((t) => sha256(t)))),
      ].filter((v) => v.length >= 16);
      const raw = [...rawTokens].filter((t) => t.length >= 16);
      expect(hashes.length).toBeGreaterThanOrEqual(4 + ROLES.length);

      let checks = 0;
      const covered = new Set(recorded.map((r) => r.key));
      const succeeded = new Set(
        recorded.filter((r) => r.status >= 200 && r.status < 300).map((r) => r.key),
      );
      checks += 3;
      expect({ missingFixture }).toEqual({ missingFixture: [] });
      expect([...covered].sort()).toEqual(routes.map(routeKey).sort());
      expect([...succeeded].sort()).toEqual(routes.map(routeKey).sort());
      for (const rec of recorded) {
        const where = { key: rec.key, probe: rec.probe };
        const headerText = rec.headers
          .filter(([name]) => name.toLowerCase() !== "set-cookie")
          .map(([n, v]) => `${n}: ${v}`)
          .join("\n");
        const setCookie = rec.headers
          .filter(([name]) => name.toLowerCase() === "set-cookie")
          .map(([, v]) => v)
          .join("\n");
        for (const secret of [...hashes, ...raw]) {
          checks += 2;
          expect({ ...where, inBody: rec.body.includes(secret) }).toEqual({
            ...where,
            inBody: false,
          });
          expect({ ...where, inHeaders: headerText.includes(secret) }).toEqual({
            ...where,
            inHeaders: false,
          });
        }
        for (const hash of hashes) {
          checks += 1;
          expect({ ...where, hashInCookie: setCookie.includes(hash) }).toEqual({
            ...where,
            hashInCookie: false,
          });
        }
        const keys = keysOf(parse(rec.body));
        checks += 3;
        expect({ ...where, secretKeys: keys.filter((k) => SECRET_KEYS.has(k)) }).toEqual({
          ...where,
          secretKeys: [],
        });
        expect({ ...where, argon2: /\$argon2/.test(rec.body) }).toEqual({
          ...where,
          argon2: false,
        });
        const linkAllowed = LINK_ALLOW_LIST.includes(rec.key);
        expect({ ...where, link: keys.includes("link") && !linkAllowed }).toEqual({
          ...where,
          link: false,
        });
      }
      // O12: rows × roles; the responses scanned are in the check count.
      reportWalk("no-secret", routes.length, ROLES.length, checks, performance.now() - started);
      process.stdout.write(`walk no-secret: ${recorded.length} responses scanned\n`);
    },
    { timeout: 60_000 },
  );

  test("every recorded fixture parses with its route's shared response schema (D-04)", () => {
    for (const key of Object.keys(API_FIXTURES)) {
      expect({ key, parsed: (() => parsedFixture(key).status)() }).toEqual({
        key,
        parsed: API_FIXTURES[key]?.status ?? -1,
      });
    }
  });
});
