/**
 * tests/integration/business-route.test.ts — `GET /api/business` through the real pipeline on
 * the fail-closed stub (printable invoice and delivery slip).
 *
 * Rules restated: every signed-in role reads the business name of ITS session's business;
 * no session is 401; the answer holds exactly `{ name }`. The role walk and the no-secret walk
 * cover the route too, from the role table.
 */
import { describe, expect, test } from "bun:test";
import { BusinessResponseSchema } from "../../src/auth/schemas.js";
import { harness, json, request, seedBusiness } from "../helpers/server-harness.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

describe("GET /api/business", () => {
  test("every role reads the business name; nothing else is in the answer", async () => {
    const stub = makeSqlStub();
    const tokens = await seedBusiness(stub);
    const name = String(stub.state.businesses[0]?.["name"]);
    const h = harness(stub);
    for (const role of ["owner", "manager", "sales_staff", "accountant"] as const) {
      const r = await h.send(request("GET", "/api/business", { token: tokens[role] }));
      expect({ role, status: r.status }).toEqual({ role, status: 200 });
      const body = await json(r);
      expect(BusinessResponseSchema.parse(body)).toEqual({ name });
      expect(Object.keys(body as object)).toEqual(["name"]);
    }
  });

  test("no session is 401", async () => {
    const stub = makeSqlStub();
    await seedBusiness(stub);
    const r = await harness(stub).send(request("GET", "/api/business", {}));
    expect(r.status).toBe(401);
  });
});
