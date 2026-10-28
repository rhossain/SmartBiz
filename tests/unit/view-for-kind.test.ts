/**
 * tests/unit/view-for-kind.test.ts — one behaviour per error kind, and the behaviour switch
 * and the copy switch cover the same key set (BR5.2; S15; review F-03, D-07).
 *
 * Restated from BR5.2 and F-03 (the expected table is written out here, not imported):
 * 401 → sign-in handoff; 403 → lock; 404 → not-found; the four 409 kinds → conflict with
 * reload; the three field kinds → under their fields; every other kind → the catalogue
 * banner. Both `viewForKind` and `errorMessage` must answer for every kind of the union
 * (the C1 kinds plus `unreachable`) and refuse anything else, so they cannot drift apart.
 */
import { describe, expect, test } from "bun:test";
import { ERROR_KINDS } from "../../src/data/error-kinds.js";
import { errorMessage, type ShownErrorKind } from "../../src/i18n/error-copy.js";
import {
  isRetryableKind,
  SHOWN_ERROR_KINDS,
  viewForKind,
  type KindView,
} from "../../src/pres/view-for-kind.js";

const EXPECTED: Readonly<Record<ShownErrorKind, KindView>> = {
  invalid_input: "field",
  invalid_email: "field",
  password_too_short: "field",
  invalid_credentials: "banner",
  unauthenticated: "sign-in",
  forbidden: "lock",
  not_found: "not-found",
  conflict: "conflict",
  already_linked: "conflict",
  not_editable: "conflict",
  invalid_transition: "conflict",
  business_exists: "banner",
  email_taken: "banner",
  gone: "banner",
  payload_too_large: "banner",
  rate_limited: "banner",
  internal: "banner",
  db_unavailable: "banner",
  unreachable: "banner",
};

describe("viewForKind", () => {
  test("every kind maps to exactly the behaviour BR5.2 names", () => {
    for (const kind of SHOWN_ERROR_KINDS) {
      expect({ kind, view: viewForKind(kind) }).toEqual({ kind, view: EXPECTED[kind] });
    }
  });

  test("the kind list is the 18 C1 kinds plus unreachable, each once", () => {
    expect(SHOWN_ERROR_KINDS).toHaveLength(19);
    expect(new Set(SHOWN_ERROR_KINDS).size).toBe(19);
    const expected: string[] = [...ERROR_KINDS, "unreachable"];
    expect([...SHOWN_ERROR_KINDS].sort()).toEqual(expected.sort() as ShownErrorKind[]);
    expect(Object.keys(EXPECTED).sort()).toEqual([...SHOWN_ERROR_KINDS].sort());
  });

  test("the behaviour switch and the copy switch cover the same key set (D-07)", () => {
    for (const kind of SHOWN_ERROR_KINDS) {
      expect(() => viewForKind(kind)).not.toThrow();
      expect(errorMessage(kind, "bn").length).toBeGreaterThan(0);
      expect(errorMessage(kind, "en").length).toBeGreaterThan(0);
    }
    const stranger = "teapot" as unknown as ShownErrorKind;
    expect(() => viewForKind(stranger)).toThrow(/Unhandled error kind: teapot/);
    expect(() => errorMessage(stranger, "bn")).toThrow(/Unhandled error kind: teapot/);
  });

  test("only unreachable and db_unavailable are retryable by kind alone (BR5.3)", () => {
    const retryable: ShownErrorKind[] = ["db_unavailable", "unreachable"];
    expect(SHOWN_ERROR_KINDS.filter(isRetryableKind).sort()).toEqual(retryable);
  });

  test("the copy behind the behaviours is the catalogue's Bangla (NFR9.5)", () => {
    expect(errorMessage("unreachable", "bn")).toBe("সার্ভারের সাথে যোগাযোগ হচ্ছে না");
    expect(errorMessage("forbidden", "bn")).toBe("এই অংশ আপনার দায়িত্বের বাইরে");
  });
});
