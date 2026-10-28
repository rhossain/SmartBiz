/**
 * tests/integration/staff-routes.test.ts — the six U3 routes at the HTTP boundary, through
 * the real request pipeline on the SQL stub (C6 with B1–B5; U3 W1–W7; BR1.1–BR1.3, BR2.3,
 * BR3.2, BR4.2, BR5.1, BR7.2; S21, S24; NFR1.9, NFR3.17–NFR3.19, NFR4.3, NFR5.9, NFR8.17;
 * review D-01, D-04).
 *
 * Restated from C6 and the NFR design:
 *   - every refused token answers the byte-identical `{"error":"gone"}` with 410: unknown,
 *     used and expired for accept; unknown, used, expired and an inactive user for reset;
 *   - every delegation refusal is 403; an existing member is 409 on invite and an inactive
 *     target 409 on a reset link; an unknown or non-UUID user is 404; a bad invite email is
 *     400 `invalid_email` and a short password 400 `password_too_short`, each naming its
 *     field; a smuggled `role` on accept is 400 naming `role`;
 *   - a full hash gate answers 429 for a valid token (the token stays usable) and still 410
 *     for an unknown one;
 *   - recover answers 202 with an empty body for any email, issues zero SQL and makes zero
 *     hash-gate calls (spies), and writes nothing (D-01);
 *   - accept answers 201 with the public user and a session cookie; reset answers 204 and the
 *     old cookie of that user then gets 401;
 *   - both link responses carry `Cache-Control: no-store`, and the app page carries
 *     `Referrer-Policy: no-referrer` (NFR4.3);
 *   - no captured log line holds a token, link, password or email (NFR3.19, O16), and a
 *     refusal is only a request line, never an audit row (NFR8.17).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHashGate } from "../../src/auth/hash-gate.js";
import { harness, json, NOW, request, type Harness } from "../helpers/server-harness.js";
import {
  fullGate,
  INACTIVE_ID,
  NEW_PASSWORD,
  spyGate,
  staffWorld,
  tokenOf,
  type StaffWorld,
} from "../helpers/staff-fixtures.js";

const UNKNOWN_USER = "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f";
const GONE = '{"error":"gone"}';
const DAY = 24 * 60 * 60 * 1000;

const setup = async (overrides: Parameters<typeof harness>[1] = {}) => {
  const w = await staffWorld();
  const h = harness(w.stub, overrides);
  return { w, h };
};

const post = (h: Harness, path: string, body: unknown, token: string | null = null) =>
  h.send(request("POST", path, { body, token }));

const inviteAs = async (h: Harness, w: StaffWorld, email = "new@acme.test") => {
  const r = await post(h, "/api/staff/invitations", { email, role: "sales_staff" }, w.tokens.owner);
  expect(r.status).toBe(201);
  return { response: r, body: (await json(r)) as { link: string } };
};

const resetLinkFor = async (h: Harness, w: StaffWorld, userId: string) => {
  const r = await post(h, `/api/staff/${userId}/reset-links`, {}, w.tokens.owner);
  expect(r.status).toBe(201);
  return { response: r, body: (await json(r)) as { link: string; expiresAt: string } };
};

const cleanup: string[] = [];
afterEach(() => {
  for (const dir of cleanup.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("staff routes (C6)", () => {
  test("GET /api/staff: the list for the Owner and the Manager; 403 for the other roles", async () => {
    const { w, h } = await setup();
    const owner = await h.send(request("GET", "/api/staff", { token: w.tokens.owner }));
    expect(owner.status).toBe(200);
    const body = (await json(owner)) as { members: unknown[]; invitableRoles: string[] };
    expect(body.members).toHaveLength(5);
    expect(body.invitableRoles).toEqual(["manager", "sales_staff", "accountant"]);
    const manager = await h.send(request("GET", "/api/staff", { token: w.tokens.manager }));
    expect(((await json(manager)) as { invitableRoles: string[] }).invitableRoles).toEqual([
      "sales_staff",
      "accountant",
    ]);
    for (const role of ["sales_staff", "accountant"] as const) {
      const r = await h.send(request("GET", "/api/staff", { token: w.tokens[role] }));
      expect({ role, status: r.status }).toEqual({ role, status: 403 });
    }
  });

  test("every delegation refusal is 403 (BR1.2, BR1.3)", async () => {
    const { w, h } = await setup();
    const cases: Array<[string, string, unknown, string]> = [
      [
        "manager invites a manager",
        "/api/staff/invitations",
        { email: "m@acme.test", role: "manager" },
        w.tokens.manager,
      ],
      ["manager resets the owner", `/api/staff/${w.id("owner")}/reset-links`, {}, w.tokens.manager],
      ["manager resets itself", `/api/staff/${w.id("manager")}/reset-links`, {}, w.tokens.manager],
      ["owner resets itself", `/api/staff/${w.id("owner")}/reset-links`, {}, w.tokens.owner],
      [
        "sales staff invites",
        "/api/staff/invitations",
        { email: "x@acme.test", role: "accountant" },
        w.tokens.sales_staff,
      ],
      [
        "accountant resets",
        `/api/staff/${w.id("sales_staff")}/reset-links`,
        {},
        w.tokens.accountant,
      ],
    ];
    for (const [name, path, body, token] of cases) {
      const r = await post(h, path, body, token);
      expect({ name, status: r.status, body: await r.text() }).toEqual({
        name,
        status: 403,
        body: '{"error":"forbidden"}',
      });
    }
    expect(w.stub.state.invitations).toHaveLength(0);
    expect(w.stub.state.passwordResets).toHaveLength(0);
  });

  test("409 for an existing member and an inactive target; 404 unknown; 400 named fields", async () => {
    const { w, h } = await setup();
    const member = await post(
      h,
      "/api/staff/invitations",
      { email: "MANAGER@acme.test", role: "accountant" },
      w.tokens.owner,
    );
    expect([member.status, await member.text()]).toEqual([409, '{"error":"conflict"}']);
    const inactive = await post(h, `/api/staff/${INACTIVE_ID}/reset-links`, {}, w.tokens.owner);
    expect([inactive.status, await inactive.text()]).toEqual([409, '{"error":"conflict"}']);
    for (const target of [UNKNOWN_USER, "not-a-uuid"]) {
      const r = await post(h, `/api/staff/${target}/reset-links`, {}, w.tokens.owner);
      expect({ target, status: r.status }).toEqual({ target, status: 404 });
    }
    const badEmail = await post(
      h,
      "/api/staff/invitations",
      { email: "nope", role: "accountant" },
      w.tokens.owner,
    );
    expect([badEmail.status, await json(badEmail)]).toEqual([
      400,
      { error: "invalid_email", fields: [{ path: "email", message: "invalid_email" }] },
    ]);
    const owner = await post(
      h,
      "/api/staff/invitations",
      { email: "o2@acme.test", role: "owner" },
      w.tokens.owner,
    );
    expect(owner.status).toBe(400);
    const { body } = await inviteAs(h, w);
    const short = await post(h, "/api/invitations/accept", {
      token: tokenOf(body.link),
      password: "short",
    });
    expect([short.status, await json(short)]).toEqual([
      400,
      {
        error: "password_too_short",
        fields: [{ path: "password", message: "password_too_short" }],
      },
    ]);
    const smuggled = await post(h, "/api/invitations/accept", {
      token: tokenOf(body.link),
      password: NEW_PASSWORD,
      role: "manager",
    });
    expect(smuggled.status).toBe(400);
    type Fields = { fields: Array<{ path: string; message: string }> };
    expect(((await json(smuggled)) as Fields).fields).toEqual([
      { path: "role", message: "unknown field" },
    ]);
  });

  test("accept: 410 bodies are byte-identical for unknown, used and expired (BR3.2, NFR3.17)", async () => {
    const { w, h } = await setup();
    const { body } = await inviteAs(h, w);
    const token = tokenOf(body.link);
    const unknown = await post(h, "/api/invitations/accept", {
      token: "Z".repeat(43),
      password: NEW_PASSWORD,
    });
    const malformed = await post(h, "/api/invitations/accept", {
      token: "abc",
      password: NEW_PASSWORD,
    });
    const ok = await post(h, "/api/invitations/accept", { token, password: NEW_PASSWORD });
    expect(ok.status).toBe(201);
    const used = await post(h, "/api/invitations/accept", { token, password: NEW_PASSWORD });
    const { body: second } = await inviteAs(h, w, "later@acme.test");
    const late = harness(w.stub, { clock: () => new Date(NOW.getTime() + 7 * DAY) });
    const expired = await post(late, "/api/invitations/accept", {
      token: tokenOf(second.link),
      password: NEW_PASSWORD,
    });
    const answers = await Promise.all(
      [unknown, malformed, used, expired].map(async (r) => [r.status, await r.text()]),
    );
    expect(answers).toEqual([
      [410, GONE],
      [410, GONE],
      [410, GONE],
      [410, GONE],
    ]);
  });

  test("accept: 201 public user and a session cookie that signs in as the new member (B4)", async () => {
    const { w, h } = await setup();
    const { body } = await inviteAs(h, w);
    const r = await post(h, "/api/invitations/accept", {
      token: tokenOf(body.link),
      password: NEW_PASSWORD,
    });
    expect(r.status).toBe(201);
    const user = (await json(r)) as Record<string, unknown>;
    expect(Object.keys(user).sort()).toEqual(["email", "id", "locale", "role"]);
    expect([user["email"], user["role"]]).toEqual(["new@acme.test", "sales_staff"]);
    const cookie = /__Host-sb_session=([^;]+)/.exec(r.headers.get("Set-Cookie") ?? "")?.[1] ?? "";
    const session = await h.send(request("GET", "/api/session", { token: cookie }));
    expect(session.status).toBe(200);
    expect(((await json(session)) as { user: { role: string } }).user.role).toBe("sales_staff");
  });

  test("reset: 204; the old cookie gets 401; 410 bodies identical incl. an inactive user (BR4.2)", async () => {
    const { w, h } = await setup();
    const target = w.id("accountant");
    const { body } = await resetLinkFor(h, w, target);
    const token = tokenOf(body.link);
    // The accountant's live session, made on the harness clock.
    const before = await h.send(request("GET", "/api/session", { token: w.tokens.accountant }));
    expect(before.status).toBe(200);
    const ok = await post(h, "/api/auth/reset", { token, password: NEW_PASSWORD });
    expect([ok.status, await ok.text()]).toEqual([204, ""]);
    const after = await h.send(request("GET", "/api/session", { token: w.tokens.accountant }));
    expect(after.status).toBe(401);

    const used = await post(h, "/api/auth/reset", { token, password: NEW_PASSWORD });
    const unknown = await post(h, "/api/auth/reset", {
      token: "Y".repeat(43),
      password: NEW_PASSWORD,
    });
    const { body: fresh } = await resetLinkFor(h, w, w.id("sales_staff"));
    const late = harness(w.stub, { clock: () => new Date(NOW.getTime() + 30 * 60 * 1000) });
    const expired = await post(late, "/api/auth/reset", {
      token: tokenOf(fresh.link),
      password: NEW_PASSWORD,
    });
    const { body: forManager } = await resetLinkFor(h, w, w.id("manager"));
    const manager = w.stub.state.users.find((u) => u["id"] === w.id("manager"));
    if (manager) manager["active"] = false;
    const inactive = await post(h, "/api/auth/reset", {
      token: tokenOf(forManager.link),
      password: NEW_PASSWORD,
    });
    const answers = await Promise.all(
      [used, unknown, expired, inactive].map(async (r) => [r.status, await r.text()]),
    );
    expect(answers).toEqual([
      [410, GONE],
      [410, GONE],
      [410, GONE],
      [410, GONE],
    ]);
  });

  test("a full hash gate: valid token 429 and still usable; unknown token 410 (B1, NFR6.20)", async () => {
    const { w, h } = await setup();
    const { body } = await inviteAs(h, w);
    const full = harness(w.stub, { hashGate: fullGate() });
    const limited = await post(full, "/api/invitations/accept", {
      token: tokenOf(body.link),
      password: NEW_PASSWORD,
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("5");
    const unknown = await post(full, "/api/invitations/accept", {
      token: "X".repeat(43),
      password: NEW_PASSWORD,
    });
    expect([unknown.status, await unknown.text()]).toEqual([410, GONE]);
    const ok = await post(h, "/api/invitations/accept", {
      token: tokenOf(body.link),
      password: NEW_PASSWORD,
    });
    expect(ok.status).toBe(201);
  });

  test("recover: 202, empty body, zero SQL, zero gate calls, nothing written, any email (D-01)", async () => {
    const w = await staffWorld();
    const gate = spyGate(createHashGate());
    const h = harness(w.stub, { hashGate: gate.gate });
    const state = JSON.stringify(w.stub.state);
    const calls = w.stub.calls.length;
    const answers: Array<[number, string]> = [];
    for (const email of [
      "owner@acme.test",
      "OWNER@acme.test",
      "nobody@nowhere.test",
      "not an email",
    ]) {
      const r = await post(h, "/api/auth/recover", { email });
      answers.push([r.status, await r.text()]);
    }
    expect(answers).toEqual([
      [202, ""],
      [202, ""],
      [202, ""],
      [202, ""],
    ]);
    expect(w.stub.calls.length).toBe(calls);
    expect(gate.calls()).toBe(0);
    expect(JSON.stringify(w.stub.state)).toBe(state);
  });

  test("the public routes still need the exact Origin and JSON (NFR5.9)", async () => {
    const { h } = await setup();
    for (const path of ["/api/invitations/accept", "/api/auth/recover", "/api/auth/reset"]) {
      const noOrigin = await h.send(
        request("POST", path, { body: { email: "a@b.c" }, origin: null }),
      );
      const text = await h.send(
        request("POST", path, { body: { email: "a@b.c" }, contentType: "text/plain" }),
      );
      expect({ path, statuses: [noOrigin.status, text.status] }).toEqual({
        path,
        statuses: [403, 403],
      });
    }
  });

  test("headers: no-store on both link responses; no-referrer on the app page (NFR4.3)", async () => {
    const dist = mkdtempSync(join(tmpdir(), "smartbiz-u3-dist-"));
    cleanup.push(dist);
    writeFileSync(join(dist, "index.html"), "<!doctype html><title>SmartBiz</title>");
    const { w, h } = await setup({ distDir: dist });
    const invite = await inviteAs(h, w);
    const link = await resetLinkFor(h, w, w.id("sales_staff"));
    for (const r of [invite.response, link.response]) {
      expect(r.headers.get("Cache-Control")).toBe("no-store");
    }
    const page = await h.send(request("GET", "/"));
    expect(page.status).toBe(200);
    expect(page.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  test("logs: no token, link, password or email in any line; refusals write no audit row", async () => {
    const { w, h } = await setup();
    const { body: inv } = await inviteAs(h, w, "secret.person@acme.test");
    const { body: rl } = await resetLinkFor(h, w, w.id("sales_staff"));
    const auditBefore = w.stub.state.auditLog.length;
    await post(h, "/api/invitations/accept", { token: "Q".repeat(43), password: NEW_PASSWORD });
    await post(h, "/api/auth/reset", { token: "Q".repeat(43), password: NEW_PASSWORD });
    await post(
      h,
      "/api/staff/invitations",
      { email: "m@acme.test", role: "manager" },
      w.tokens.manager,
    );
    expect(w.stub.state.auditLog.length).toBe(auditBefore);
    await post(h, "/api/invitations/accept", { token: tokenOf(inv.link), password: NEW_PASSWORD });
    await post(h, "/api/auth/reset", { token: tokenOf(rl.link), password: `${NEW_PASSWORD}-x` });
    await post(h, "/api/auth/recover", { email: "secret.person@acme.test" });
    const lines = h.logs.map((l) => JSON.stringify(l));
    // Eight requests, eight request lines; handlers log nothing themselves.
    expect(lines.length).toBe(8);
    for (const secret of [
      tokenOf(inv.link),
      tokenOf(rl.link),
      inv.link,
      rl.link,
      NEW_PASSWORD,
      "secret.person",
      "@",
    ]) {
      expect({ secret, leaked: lines.some((l) => l.includes(secret)) }).toEqual({
        secret,
        leaked: false,
      });
    }
    const statuses = h.logs.filter((l) => l.message === "request").map((l) => l["status"]);
    expect(statuses).toEqual([201, 201, 410, 410, 403, 201, 204, 202]);
  });
});
