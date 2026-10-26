/**
 * tests/unit/pci-deny-list-orders.test.ts — NFR5.4 / NFR5.3: no PCI scope in U3.
 *
 * SmartBiz takes no card payments (no payment gateway in MVP), so no
 * card, CVV, PAN or bank-account identifier may appear anywhere under
 * src/orders/. This is the B2 extension of the deny-list grep
 * (cicd-pipeline.md stage 13), run as a test so it fails locally and in
 * CI alike. The ESLint override in .eslintrc.cjs blocks the same names
 * as identifiers at edit time.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "bun:test";

const ROOT = join(import.meta.dir, "..", "..");
const ORDERS = join(ROOT, "src", "orders");
const DENY = /\b(card|cvv|pan|cardNumber|bankAccount|accountNumber)\b/;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

describe("NFR5.4 — PCI deny-list over src/orders/", () => {
  test("the deny-list pattern catches what it is meant to catch", () => {
    for (const bad of ["const cardNumber = x", "cvv: string", "{ pan }", "bankAccount", "accountNumber", "card"]) {
      expect(DENY.test(bad)).toBe(true);
    }
    for (const fine of ["span", "panel", "discard", "cardinal", "Pathao"]) expect(DENY.test(fine)).toBe(false);
  });

  test("no file under src/orders/ contains a denied identifier", () => {
    const files = walk(ORDERS).filter((f) => /\.(ts|tsx)$/.test(f));
    expect(files.length).toBeGreaterThan(20);
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (DENY.test(line)) hits.push(`${relative(ROOT, f)}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });
});
