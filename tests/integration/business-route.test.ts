/**
 * tests/integration/business-route.test.ts — the Business and Settings endpoints through the
 * real pipeline on the fail-closed stub (mockups §17.2, §17.3; AC1.5.1, AC1.5.2, AC1.5.4).
 *
 * Rules restated:
 *   - GET /api/business: every signed-in role reads name, phone, address and default language;
 *     no session is 401;
 *   - PATCH /api/business: the Owner only (others 403, nothing written); a phone is stored as
 *     01XXXXXXXXX whatever way it was typed (Bangla digits, +880, dashes); a bad phone, an
 *     unknown key or an empty body is 400 and writes nothing; one change-log row
 *     `business.profile.update` names the changed fields and holds no phone or address;
 *     a patch that changes nothing writes no row;
 *   - PATCH /api/me/locale: every role changes ITS OWN language only, with one `settings.update`
 *     row; an unknown language is 400.
 * The role walk and the no-secret walk cover the routes too, from the role table.
 */
import { describe, expect, test } from "bun:test";
import { BusinessResponseSchema } from "../../src/auth/schemas.js";
import { harness, json, request, seedBusiness } from "../helpers/server-harness.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

const world = async () => {
  const stub = makeSqlStub();
  const tokens = await seedBusiness(stub);
  return { stub, tokens, h: harness(stub) };
};

const actions = (stub: ReturnType<typeof makeSqlStub>): string[] =>
  stub.state.auditLog.map((a) => String(a["action"]));

describe("GET /api/business", () => {
  test("every role reads the details; no session is 401", async () => {
    const { stub, tokens, h } = await world();
    const name = String(stub.state.businesses[0]?.["name"]);
    for (const role of ["owner", "manager", "sales_staff", "accountant"] as const) {
      const r = await h.send(request("GET", "/api/business", { token: tokens[role] }));
      expect({ role, status: r.status }).toEqual({ role, status: 200 });
      expect(BusinessResponseSchema.parse(await json(r))).toEqual({
        name,
        phone: null,
        address: null,
        locale: "bn",
      });
    }
    expect((await h.send(request("GET", "/api/business", {}))).status).toBe(401);
  });
});

describe("PATCH /api/business", () => {
  test("the Owner saves phone and address; the phone is normalised; the log names fields only", async () => {
    const { stub, tokens, h } = await world();
    const r = await h.send(
      request("PATCH", "/api/business", {
        token: tokens.owner,
        body: { phone: "+880 ১৭১১-০০০০০০", address: "মিরপুর ১০, ঢাকা" },
      }),
    );
    expect(r.status).toBe(200);
    const body = BusinessResponseSchema.parse(await json(r));
    expect([body.phone, body.address]).toEqual(["01711000000", "মিরপুর ১০, ঢাকা"]);
    const row = stub.state.auditLog.find((a) => a["action"] === "business.profile.update")!;
    expect(JSON.parse(String(row["payload"]))).toEqual({ changed: ["phone", "address"] });
    expect(String(row["payload"])).not.toContain("01711000000");
    // The same values again change nothing and log nothing.
    const again = await h.send(
      request("PATCH", "/api/business", { token: tokens.owner, body: { phone: "01711000000" } }),
    );
    expect(again.status).toBe(200);
    expect(actions(stub).filter((a) => a === "business.profile.update")).toHaveLength(1);
  });

  test("other roles are refused with 403 and nothing changes", async () => {
    const { stub, tokens, h } = await world();
    for (const role of ["manager", "sales_staff", "accountant"] as const) {
      const r = await h.send(
        request("PATCH", "/api/business", { token: tokens[role], body: { name: "অন্য" } }),
      );
      expect({ role, status: r.status }).toEqual({ role, status: 403 });
    }
    expect(stub.state.businesses[0]?.["name"]).not.toBe("অন্য");
    expect(actions(stub)).not.toContain("business.profile.update");
  });

  test("a bad phone, an unknown key and an empty body are 400 and write nothing", async () => {
    const { stub, tokens, h } = await world();
    for (const body of [{ phone: "12345" }, { colour: "red" }, {}, { name: "" }]) {
      const r = await h.send(request("PATCH", "/api/business", { token: tokens.owner, body }));
      expect({ body, status: r.status }).toEqual({ body, status: 400 });
    }
    expect(actions(stub)).not.toContain("business.profile.update");
  });

  test("clearing the phone with null stores no phone", async () => {
    const { tokens, h } = await world();
    await h.send(
      request("PATCH", "/api/business", { token: tokens.owner, body: { phone: "01711000000" } }),
    );
    const r = await h.send(
      request("PATCH", "/api/business", { token: tokens.owner, body: { phone: null } }),
    );
    expect(BusinessResponseSchema.parse(await json(r)).phone).toBeNull();
  });
});

describe("PATCH /api/me/locale", () => {
  test("each role changes only its own language, with one settings.update row", async () => {
    const { stub, tokens, h } = await world();
    const r = await h.send(
      request("PATCH", "/api/me/locale", { token: tokens.sales_staff, body: { locale: "en" } }),
    );
    expect(r.status).toBe(200);
    expect(await json(r)).toEqual({ locale: "en" });
    const changed = stub.state.users.filter((u) => u["locale"] === "en");
    expect(changed).toHaveLength(1);
    expect(changed[0]?.["role"]).toBe("sales_staff");
    expect(actions(stub).filter((a) => a === "settings.update")).toHaveLength(1);
  });

  test("an unknown language is 400", async () => {
    const { tokens, h } = await world();
    const r = await h.send(
      request("PATCH", "/api/me/locale", { token: tokens.owner, body: { locale: "fr" } }),
    );
    expect(r.status).toBe(400);
  });
});
