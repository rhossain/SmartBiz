/**
 * tests/integration/catalog-screens.test.tsx — the ten catalog screens in happy-dom, over the
 * real catalog client, HTTP client and request pipeline on the SQL stub (U4 frontend-
 * components; BR2.1, BR2.2, BR3.1–BR3.3, BR4.3, BR4.4, BR5.2, BR5.5, BR5.6, BR6.2–BR6.5,
 * BR7.2–BR7.5, BR8.3, BR9.2–BR9.4, BR13.3; S32; NFR9.12, NFR9.13).
 *
 * Restated from the design:
 *   - lists show the count in Bangla digits, rows with phone (Bangla digits) and risk chip
 *     text; 1–3 digits in the search show the 4-digit hint; a search with no match offers
 *     "খোঁজ মুছুন"; "+ নতুন" only for writers;
 *   - the customer form normalises the phone on blur, refuses a bad one before sending,
 *     saves, and hands the duplicate-phone warning to the detail; an edit sends only the
 *     changed fields;
 *   - the detail: the dues section says "এখনো চালু হয়নি" with no digit and no money; notes
 *     newest first with "আগের নোট" chains; a second revision of one note says it was already
 *     revised; markup typed in a note is shown as text; the order history's empty state;
 *   - the product form previews the cross product with full codes and keeps "+ ভাগ যোগ
 *     করুন" disabled at two; a taken code is said under the code field;
 *   - the product detail saves changed stock rows one by one and lists the row that failed;
 *     the Accountant sees the cost with "বদলান" and no stock inputs or edit link; Sales
 *     Staff see no cost at all;
 *   - low stock: supplier call link, or "সরবরাহকারী দেওয়া নেই" with "বেছে নিন" to the edit
 *     screen (Owner, Manager) or the product (others); nothing low → the positive empty state;
 *   - suppliers: list with call links and product counts; add and edit for Owner and Manager.
 * Native radios, selects and buttons carry the keyboard (NFR9.13).
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { createCatalogApi } from "../../src/client/catalog-api.js";
import { createHttpClient } from "../../src/client/http.js";
import type { Role } from "../../src/data/enums.js";
import {
  renderCatalogScreen,
  type CatalogPermissions,
  type CatalogRouteState,
  type CatalogScreen,
  type DuplicateShown,
} from "../../src/catalog/screens/render-catalog-route.js";
import { noteChains } from "../../src/catalog/screens/CustomerDetail.js";
import { parseCount, parseTaka, takaText } from "../../src/catalog/screens/parts.js";
import { splitValues } from "../../src/catalog/screens/ProductForm.js";
import type { HistoryOrder } from "../../src/catalog/types.js";
import { browserFetch } from "../helpers/browser-fetch.js";
import { CATALOG_IDS, seedCatalog } from "../helpers/catalog-fixtures.js";
import { makeSqlStub, type SqlStubOptions, type StubFault } from "../helpers/sql-stub.js";
import { harness, seedBusiness } from "../helpers/server-harness.js";

const WAIT = { timeout: 3_000 };

/** Restated from the US5.1 table (never derived from src/auth). */
const CAN: Readonly<Record<Role, CatalogPermissions>> = {
  owner: { writeCustomers: true, manage: true, readCost: true, writeCost: true },
  manager: { writeCustomers: true, manage: true, readCost: true, writeCost: true },
  sales_staff: { writeCustomers: true, manage: false, readCost: false, writeCost: false },
  accountant: { writeCustomers: false, manage: false, readCost: true, writeCost: true },
};

interface Mounted {
  readonly view: ReturnType<typeof render>;
  readonly stub: ReturnType<typeof makeSqlStub>;
  readonly saved: Array<{ to: string; message: string; duplicateOf: DuplicateShown | null }>;
  readonly navigated: string[];
  readonly calls: ReadonlyArray<{ method: string; path: string }>;
}

const mount = async (
  screen: CatalogScreen,
  role: Role,
  opts: {
    readonly id?: string;
    readonly seed?: boolean;
    readonly stub?: SqlStubOptions;
    readonly orders?: ReadonlyArray<HistoryOrder>;
    readonly duplicateOf?: DuplicateShown | null;
    /** Adjust the seeded rows before the screen mounts. */
    readonly prepare?: (stub: ReturnType<typeof makeSqlStub>) => void;
  } = {},
): Promise<Mounted> => {
  const stub = makeSqlStub(opts.stub ?? {});
  const tokens = await seedBusiness(stub);
  if (opts.seed !== false) seedCatalog(stub);
  opts.prepare?.(stub);
  const net = browserFetch(harness(stub));
  net.jar.token = tokens[role];
  const saved: Mounted["saved"] = [];
  const navigated: string[] = [];
  const state: CatalogRouteState = {
    kind: "catalog",
    locale: "bn",
    api: createCatalogApi(createHttpClient({ fetch: net.fetchImpl })),
    customerOrders: async () => ({ ok: true, status: 200, value: opts.orders ?? [] }),
    id: opts.id ?? null,
    can: CAN[role],
    homeTo: "/orders",
    navigate: (to) => navigated.push(to),
    onSaved: (to, message, duplicateOf = null) => saved.push({ to, message, duplicateOf }),
    duplicateOf: opts.duplicateOf ?? null,
  };
  const view = render(renderCatalogScreen(screen, state) as React.ReactElement);
  return { view, stub, saved, navigated, calls: net.calls };
};

const type = (el: HTMLElement, value: string): void => {
  fireEvent.change(el, { target: { value } });
};

afterEach(() => cleanup());

describe("customer list (BR5.1–BR5.3, BR5.6)", () => {
  test("count, rows with Bangla-digit phone and risk text, '+ নতুন' for writers only", async () => {
    const { view } = await mount("customers", "sales_staff");
    await waitFor(() => expect(view.getAllByTestId("customer-row")).toHaveLength(1), WAIT);
    expect(view.getByTestId("customers-total").textContent).toBe("মোট: ১");
    expect(view.getByTestId("customer-phone").textContent).toBe("০১৭১২৩৪৫৬৭৮");
    expect(view.getByTestId("risk-chip").textContent).toBe("কম");
    expect(view.getByTestId("risk-chip").getAttribute("data-risk")).toBe("1");
    expect(view.getByTestId("customers-new")).toBeTruthy();
    cleanup();
    const accountant = await mount("customers", "accountant");
    await waitFor(
      () => expect(accountant.view.getAllByTestId("customer-row")).toHaveLength(1),
      WAIT,
    );
    expect(accountant.view.queryByTestId("customers-new")).toBeNull();
  });

  test("1–3 digits show the 4-digit hint; a search with no match offers to clear it", async () => {
    const { view } = await mount("customers", "owner");
    await waitFor(() => expect(view.getAllByTestId("customer-row")).toHaveLength(1), WAIT);
    type(view.getByTestId("customers-search-input"), "১২");
    await waitFor(
      () => expect(view.getByTestId("customers-search-hint").textContent).toContain("৪টি"),
      WAIT,
    );
    type(view.getByTestId("customers-search-input"), "নেই-এমন-নাম");
    await waitFor(() => expect(view.getByTestId("customers-no-match")).toBeTruthy(), WAIT);
    fireEvent.click(view.getByTestId("customers-clear"));
    await waitFor(() => expect(view.getAllByTestId("customer-row")).toHaveLength(1), WAIT);
  });

  test("no customers yet: the empty state with its action for writers", async () => {
    const { view } = await mount("customers", "owner", { seed: false });
    await waitFor(() => expect(view.getByTestId("customers-empty")).toBeTruthy(), WAIT);
    expect(view.getByTestId("customers-empty").textContent).toContain("এখনো কোনো ক্রেতা নেই");
    expect(view.getByTestId("customers-empty-add").getAttribute("href")).toBe("#/customers/new");
  });
});

describe("customer form (W1, W2; BR2.1, BR3.1, BR3.3)", () => {
  test("the phone is normalised on blur; a bad phone is refused before anything is sent", async () => {
    const { view, calls } = await mount("customer-new", "sales_staff");
    const phone = view.getByTestId("field-customer-phone") as HTMLInputElement;
    type(phone, "+880 1812-345678");
    fireEvent.blur(phone);
    expect(phone.value).toBe("০১৮১২৩৪৫৬৭৮");
    type(phone, "012");
    type(view.getByTestId("field-customer-name"), "নতুন");
    fireEvent.click(view.getByTestId("customer-save"));
    await waitFor(() => expect(view.getByTestId("field-error-customer-phone")).toBeTruthy(), WAIT);
    expect(view.getByTestId("field-error-customer-phone").textContent).toContain("০১ দিয়ে শুরু");
    expect(calls.filter((c) => c.method === "POST")).toEqual([]);
  });

  test("saving opens the customer with the toast and the duplicate warning (BR3.3)", async () => {
    const { view, saved, stub } = await mount("customer-new", "sales_staff");
    type(view.getByTestId("field-customer-name"), "বোন");
    type(view.getByTestId("field-customer-phone"), "01712345678");
    fireEvent.click(view.getByTestId("customer-risk-2"));
    type(view.getByTestId("field-customer-note"), "প্রথম নোট");
    fireEvent.submit(view.getByTestId("customer-form"));
    await waitFor(() => expect(saved).toHaveLength(1), WAIT);
    const created = stub.state.customers.find((c) => c["name"] === "বোন");
    expect(created?.["risk_level"]).toBe(2);
    expect(saved[0]).toEqual({
      to: `/customers/${String(created?.["id"])}`,
      message: "ক্রেতা যোগ হয়েছে",
      duplicateOf: { id: CATALOG_IDS.customer, name: "রিনা আক্তার" },
    });
    expect(stub.state.customerNotes.some((n) => n["text"] === "প্রথম নোট")).toBe(true);
  });

  test("the risk choice is native radios in one group (arrow keys, NFR9.13)", async () => {
    const { view } = await mount("customer-new", "owner");
    const radios = [0, 1, 2, 3].map(
      (l) => view.getByTestId(`customer-risk-${l}`) as HTMLInputElement,
    );
    expect(radios.map((r) => [r.type, r.name])).toEqual(radios.map(() => ["radio", "risk-level"]));
    expect(radios[0]?.checked).toBe(true);
  });

  test("an edit sends only the changed field; nothing changed sends nothing (D10)", async () => {
    const { view, saved, calls, navigated } = await mount("customer-edit", "owner", {
      id: CATALOG_IDS.customer,
    });
    await waitFor(() => expect(view.getByTestId("customer-form")).toBeTruthy(), WAIT);
    fireEvent.submit(view.getByTestId("customer-form"));
    await waitFor(() => expect(navigated).toEqual([`/customers/${CATALOG_IDS.customer}`]), WAIT);
    expect(calls.filter((c) => c.method === "PATCH")).toEqual([]);
    type(view.getByTestId("field-customer-address"), "মিরপুর");
    fireEvent.submit(view.getByTestId("customer-form"));
    await waitFor(() => expect(saved).toHaveLength(1), WAIT);
    expect(saved[0]?.message).toBe("সংরক্ষণ হয়েছে");
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(1);
  });

  test("a role without the customer-write set gets the lock screen, never the form", async () => {
    const { view } = await mount("customer-new", "accountant");
    expect(view.getByTestId("lock-sheet")).toBeTruthy();
    expect(view.queryByTestId("customer-form")).toBeNull();
  });
});

describe("customer detail (BR3.3, BR4.3, BR4.4, BR5.4, BR5.5, S32)", () => {
  test("profile, call link, dues not available, notes and the empty order history", async () => {
    const { view } = await mount("customer", "sales_staff", { id: CATALOG_IDS.customer });
    await waitFor(
      () => expect(view.getByTestId("screen-title").textContent).toBe("রিনা আক্তার"),
      WAIT,
    );
    expect(view.getByTestId("customer-phone-call").getAttribute("href")).toBe("tel:01712345678");
    const dues = view.getByTestId("customer-dues");
    expect(dues.textContent).toContain("এখনো চালু হয়নি");
    expect(dues.textContent ?? "").not.toMatch(/[৳0-9০-৯]/);
    expect(dues.querySelector("[data-money]")).toBeNull();
    expect(view.getAllByTestId("customer-note-text").map((n) => n.textContent)).toEqual([
      "ভালো ক্রেতা",
    ]);
    await waitFor(() => expect(view.getByTestId("customer-orders-empty")).toBeTruthy(), WAIT);
    expect(view.getByTestId("screen-back").getAttribute("href")).toBe("#/customers");
  });

  test("the warning names the customer with the same phone, with a link", async () => {
    const { view } = await mount("customer", "owner", {
      id: CATALOG_IDS.customer,
      duplicateOf: { id: "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f", name: "আগের জন" },
    });
    expect(view.getByTestId("customer-duplicate").textContent).toContain("আগের জন");
    expect(view.getByTestId("customer-duplicate-link").getAttribute("href")).toBe(
      "#/customers/0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f",
    );
  });

  test("a revision shows over its earlier note; revising it again says it was revised", async () => {
    const { view } = await mount("customer", "owner", { id: CATALOG_IDS.customer });
    await waitFor(() => expect(view.getAllByTestId("customer-note")).toHaveLength(1), WAIT);
    fireEvent.click(view.getByTestId("customer-note-revise"));
    type(view.getByTestId("customer-note-revision-text"), "সংশোধিত নোট");
    fireEvent.submit(view.getByTestId("customer-note-revision"));
    await waitFor(
      () => expect(view.getAllByTestId("customer-note-text")[0]?.textContent).toBe("সংশোধিত নোট"),
      WAIT,
    );
    expect(view.getByTestId("customer-note-earlier").textContent).toContain("আগের নোট");
    expect(view.getByTestId("customer-note-earlier").textContent).toContain("ভালো ক্রেতা");
    cleanup();
    // A second page still showing the original note tries to revise it as well.
    const stale = await mount("customer", "owner", { id: CATALOG_IDS.customer });
    await waitFor(() => expect(stale.view.getAllByTestId("customer-note")).toHaveLength(1), WAIT);
    stale.stub.state.customerNotes.push({
      id: "0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e01",
      business_id: stale.stub.state.businesses[0]?.["id"],
      customer_id: CATALOG_IDS.customer,
      text: "অন্য ট্যাবে সংশোধন",
      revises_note_id: CATALOG_IDS.note,
      created_by: null,
      created_at: new Date("2026-10-27T09:00:00.000Z"),
    });
    fireEvent.click(stale.view.getByTestId("customer-note-revise"));
    type(stale.view.getByTestId("customer-note-revision-text"), "আবার");
    fireEvent.submit(stale.view.getByTestId("customer-note-revision"));
    await waitFor(
      () =>
        expect(stale.view.getByTestId("customer-note-revision-error").textContent).toContain(
          "আগেই সংশোধন",
        ),
      WAIT,
    );
  });

  test("markup typed in a note is shown as text, never run (S32)", async () => {
    const { view } = await mount("customer", "owner", { id: CATALOG_IDS.customer });
    await waitFor(() => expect(view.getByTestId("customer-note-new")).toBeTruthy(), WAIT);
    const markup = "<img src=x onerror=alert(1)>";
    type(view.getByTestId("customer-note-new-text"), markup);
    fireEvent.submit(view.getByTestId("customer-note-new"));
    await waitFor(
      () => expect(view.getAllByTestId("customer-note-text")[0]?.textContent).toBe(markup),
      WAIT,
    );
    expect(view.container.querySelector("img")).toBeNull();
  });

  test("order history rows carry status and bucket pills (BR5.4)", async () => {
    const { view } = await mount("customer", "accountant", {
      id: CATALOG_IDS.customer,
      orders: [
        {
          id: "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f01",
          orderNo: "ORD-1001",
          status: "settled",
          bucket: "realized",
        },
        {
          id: "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f02",
          orderNo: "ORD-1002",
          status: "new",
          bucket: "pipeline",
        },
      ],
    });
    await waitFor(() => expect(view.getAllByTestId("customer-order")).toHaveLength(2), WAIT);
    const rows = view.getAllByTestId("customer-order");
    expect(rows.map((r) => r.getAttribute("data-bucket"))).toEqual(["realized", "pipeline"]);
    expect(rows[1]?.textContent).toContain("চলমান");
    expect(view.queryByTestId("customer-note-new")).toBeNull();
    expect(view.queryByTestId("customer-edit")).toBeNull();
  });

  test("noteChains: latest versions newest first, each with its earlier chain", () => {
    const n = (id: string, revises: string | null) => ({
      id,
      text: id,
      revisesNoteId: revises,
      createdAt: "2026-10-27T08:00:00.000Z",
      authorName: null,
    });
    const chains = noteChains([n("c", "b"), n("x", null), n("b", "a"), n("a", null)]);
    expect(chains.map((c) => [c.latest.id, c.earlier.map((e) => e.id)])).toEqual([
      ["c", ["b", "a"]],
      ["x", []],
    ]);
  });
});

describe("product list and form (BR6.2–BR6.5, BR6.8, BR9.2, BR9.4)", () => {
  test("rows show counts, low pill, price; cost only for cost readers", async () => {
    const owner = await mount("products", "owner");
    await waitFor(() => expect(owner.view.getAllByTestId("product-row")).toHaveLength(1), WAIT);
    expect(owner.view.getByTestId("product-variant-count").textContent).toBe("২");
    expect(owner.view.getByTestId("product-total-stock").textContent).toBe("১০");
    expect(owner.view.getByTestId("product-price").textContent).toBe("৳১২০০.০০");
    expect(owner.view.getByTestId("product-cost").textContent).toBe("৳৮০০.০০");
    expect(owner.view.getByTestId("pill").textContent).toBe("কম মজুদ: ১");
    cleanup();
    const sales = await mount("products", "sales_staff");
    await waitFor(() => expect(sales.view.getAllByTestId("product-row")).toHaveLength(1), WAIT);
    expect(sales.view.queryByTestId("product-cost")).toBeNull();
    expect(sales.view.queryByTestId("products-new")).toBeNull();
  });

  test("the form previews the cross product with full codes; a third axis cannot be added", async () => {
    const { view } = await mount("product-new", "manager");
    await waitFor(() => expect(view.getByTestId("product-form")).toBeTruthy(), WAIT);
    type(view.getByTestId("field-product-sku"), "TEE");
    fireEvent.click(view.getByTestId("product-add-axis"));
    type(view.getByTestId("field-axis-0-name"), "সাইজ");
    type(view.getByTestId("field-axis-0-values"), "M, L");
    fireEvent.click(view.getByTestId("product-add-axis"));
    type(view.getByTestId("field-axis-1-name"), "রং");
    type(view.getByTestId("field-axis-1-values"), "লাল,নীল");
    const rows = view.getAllByTestId("product-preview-row");
    expect(rows.map((r) => r.querySelector(".mono")?.textContent)).toEqual([
      "TEE-M-লাল",
      "TEE-M-নীল",
      "TEE-L-লাল",
      "TEE-L-নীল",
    ]);
    expect((view.getByTestId("product-add-axis") as HTMLButtonElement).disabled).toBe(true);
    type(view.getByTestId("field-axis-1-values"), "X-L");
    expect(view.getByTestId("product-shape-error")).toBeTruthy();
  });

  test("saving creates the product; a taken code is said under the code field", async () => {
    const first = await mount("product-new", "owner");
    await waitFor(() => expect(first.view.getByTestId("product-form")).toBeTruthy(), WAIT);
    type(first.view.getByTestId("field-product-name"), "টি-শার্ট");
    type(first.view.getByTestId("field-product-sku"), "TEE-1");
    type(first.view.getByTestId("field-product-price"), "৪৫০");
    type(first.view.getByTestId("product-preview-stock-0"), "৭");
    fireEvent.submit(first.view.getByTestId("product-form"));
    await waitFor(() => expect(first.saved).toHaveLength(1), WAIT);
    const created = first.stub.state.products.find((p) => p["sku"] === "TEE-1");
    expect(created?.["selling_price_paise"]).toBe("45000");
    expect(
      first.stub.state.variants.find((v) => v["product_id"] === created?.["id"])?.["stock"],
    ).toBe(7);
    cleanup();
    const second = await mount("product-new", "owner");
    await waitFor(() => expect(second.view.getByTestId("product-form")).toBeTruthy(), WAIT);
    type(second.view.getByTestId("field-product-name"), "আবার");
    type(second.view.getByTestId("field-product-sku"), "kurti-seed");
    type(second.view.getByTestId("field-product-price"), "100");
    fireEvent.submit(second.view.getByTestId("product-form"));
    await waitFor(
      () =>
        expect(second.view.getByTestId("field-error-product-sku").textContent).toBe(
          "এই কোড আগেই ব্যবহার হয়েছে",
        ),
      WAIT,
    );
    expect((second.view.getByTestId("field-product-name") as HTMLInputElement).value).toBe("আবার");
  });

  test("the edit form sends only the changed fields (BR6.7)", async () => {
    const { view, saved, calls } = await mount("product-edit", "manager", {
      id: CATALOG_IDS.product,
    });
    await waitFor(() => expect(view.getByTestId("product-edit-form")).toBeTruthy(), WAIT);
    expect(view.getByTestId("product-edit-sku").textContent).toContain("KURTI-SEED");
    type(view.getByTestId("field-product-price"), "১২৫০");
    fireEvent.submit(view.getByTestId("product-edit-form"));
    await waitFor(() => expect(saved).toHaveLength(1), WAIT);
    expect(calls.filter((c) => c.method === "PATCH").map((c) => c.path)).toEqual([
      `/api/products/${CATALOG_IDS.product}`,
    ]);
  });
});

describe("product detail (W8, W9; BR7.2, BR8.3, BR9.3)", () => {
  test("stock saves changed rows one by one; the row that failed is listed and keeps its value", async () => {
    const { view, stub } = await mount("product", "manager", {
      id: CATALOG_IDS.product,
      stub: { faults: [{ match: /UPDATE variants SET stock/, code: "XX000", times: 1 }] },
    });
    await waitFor(() => expect(view.getAllByTestId("product-variant")).toHaveLength(2), WAIT);
    const first = view.getByTestId(`variant-stock-${CATALOG_IDS.variant}`) as HTMLInputElement;
    type(first, "৫");
    type(view.getByTestId(`variant-minimum-${CATALOG_IDS.variant2}`), "2");
    fireEvent.click(view.getByTestId("product-stock-save"));
    await waitFor(
      () => expect(view.getByTestId("product-stock-failed").textContent).toContain("KURTI-SEED-M"),
      WAIT,
    );
    expect(first.value).toBe("৫");
    expect(
      stub.state.variants.find((v) => v["id"] === CATALOG_IDS.variant2)?.["minimum_stock"],
    ).toBe(2);
    expect(stub.state.variants.find((v) => v["id"] === CATALOG_IDS.variant)?.["stock"]).toBe(1);
  });

  test("low variants carry the mark; the supplier has a call link", async () => {
    const { view } = await mount("product", "sales_staff", { id: CATALOG_IDS.product });
    await waitFor(() => expect(view.getAllByTestId("product-variant")).toHaveLength(2), WAIT);
    expect(view.getAllByTestId("product-variant").map((r) => r.getAttribute("data-low"))).toEqual([
      "true",
      "false",
    ]);
    expect(view.getByTestId("product-supplier-phone-call").getAttribute("href")).toBe(
      "tel:01711000000",
    );
    expect(view.queryByTestId("product-cost")).toBeNull();
    expect(view.queryByTestId("product-stock-save")).toBeNull();
    expect(view.getAllByTestId("variant-stock").map((c) => c.textContent)).toEqual(["১", "৯"]);
  });

  test("the Accountant has exactly one editable thing: the cost (BR9.3)", async () => {
    const { view, stub } = await mount("product", "accountant", { id: CATALOG_IDS.product });
    await waitFor(
      () => expect(view.getByTestId("product-cost").textContent).toContain("৳৮০০.০০"),
      WAIT,
    );
    expect(view.queryByTestId("product-edit")).toBeNull();
    expect(view.queryByTestId("product-stock-save")).toBeNull();
    expect(view.container.querySelectorAll("input").length).toBe(0);
    fireEvent.click(view.getByTestId("product-cost-change"));
    type(view.getByTestId("field-product-cost-new"), "৭৫০");
    fireEvent.submit(view.getByTestId("product-cost-form"));
    await waitFor(
      () => expect(view.getByTestId("product-cost").textContent).toContain("৳৭৫০.০০"),
      WAIT,
    );
    expect(stub.state.products[0]?.["purchase_cost_paise"]).toBe("75000");
  });

  test("an unrecorded cost says so, never ৳০ (BR9.4)", async () => {
    const { view } = await mount("product", "owner", {
      id: CATALOG_IDS.product,
      prepare: (stub) => {
        stub.state.products[0]!["purchase_cost_paise"] = null;
      },
    });
    await waitFor(
      () => expect(view.getByTestId("product-cost").textContent).toContain("দেওয়া হয়নি"),
      WAIT,
    );
    expect(view.getByTestId("product-cost").textContent ?? "").not.toMatch(/৳/);
  });

  test("a missing product shows the not-found state with the way home", async () => {
    const { view } = await mount("product", "owner", {
      id: "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f",
    });
    await waitFor(() => expect(view.getByTestId("api-state-not-found")).toBeTruthy(), WAIT);
    expect(view.getByTestId("api-state-home").getAttribute("href")).toBe("#/orders");
  });
});

describe("low stock and suppliers (BR7.3–BR7.5, BR8.3, BR8.4)", () => {
  test("a supplier's call link; without one, 'বেছে নিন' to the edit screen or the product", async () => {
    const { view } = await mount("low-stock", "manager");
    await waitFor(() => expect(view.getAllByTestId("low-stock-row")).toHaveLength(1), WAIT);
    expect(view.getByTestId("low-stock-level").textContent).toBe("১ / ৩");
    expect(view.getByTestId("low-stock-supplier-phone-call").getAttribute("href")).toBe(
      "tel:01711000000",
    );
    cleanup();
    for (const [role, href] of [
      ["manager", `#/products/${CATALOG_IDS.product}/edit`],
      ["sales_staff", `#/products/${CATALOG_IDS.product}`],
    ] as const) {
      const m = await mount("low-stock", role, {
        prepare: (stub) => {
          stub.state.products[0]!["default_supplier_id"] = null;
        },
      });
      await waitFor(() => expect(m.view.getByTestId("low-stock-no-supplier")).toBeTruthy(), WAIT);
      expect(m.view.getByTestId("low-stock-no-supplier").textContent).toContain(
        "সরবরাহকারী দেওয়া নেই",
      );
      expect({ role, href: m.view.getByTestId("low-stock-choose").getAttribute("href") }).toEqual({
        role,
        href,
      });
      cleanup();
    }
  });

  test("nothing low: the positive empty state with no action (BR7.5)", async () => {
    const { view } = await mount("low-stock", "owner", { seed: false });
    await waitFor(
      () => expect(view.getByTestId("low-stock-empty").textContent).toBe("সব ধরনের মজুদ ঠিক আছে"),
      WAIT,
    );
    expect(view.container.querySelector("a, button")).toBeNull();
  });

  test("suppliers: call link and product count; Owner and Manager add and edit", async () => {
    const { view, stub } = await mount("suppliers", "owner");
    await waitFor(() => expect(view.getAllByTestId("supplier-row")).toHaveLength(1), WAIT);
    expect(view.getByTestId("supplier-product-count").textContent).toBe("১");
    expect(view.getByTestId("supplier-phone-call").getAttribute("href")).toBe("tel:01711000000");
    fireEvent.click(view.getByTestId("suppliers-add"));
    type(view.getByTestId("field-supplier-name"), "করিম");
    type(view.getByTestId("field-supplier-phone"), "০১৮১১-০০০০০০");
    fireEvent.submit(view.getByTestId("supplier-form"));
    await waitFor(() => expect(view.getAllByTestId("supplier-row")).toHaveLength(2), WAIT);
    expect(stub.state.suppliers.some((s) => s["phone"] === "01811000000")).toBe(true);
    fireEvent.click(view.getByTestId(`supplier-edit-${CATALOG_IDS.supplier}`));
    type(view.getByTestId("field-supplier-name"), "রহিম এন্টারপ্রাইজ");
    fireEvent.submit(view.getByTestId("supplier-form"));
    await waitFor(
      () => expect(view.getByTestId("suppliers-saved").textContent).toBe("সংরক্ষণ হয়েছে"),
      WAIT,
    );
    expect(view.getAllByTestId("supplier-row")[0]?.textContent).toContain("রহিম এন্টারপ্রাইজ");
  });

  test("no suppliers: the add form is open for Owner and Manager; others only read", async () => {
    const manager = await mount("suppliers", "manager", { seed: false });
    await waitFor(() => expect(manager.view.getByTestId("suppliers-empty")).toBeTruthy(), WAIT);
    expect(manager.view.getByTestId("supplier-form")).toBeTruthy();
    cleanup();
    const sales = await mount("suppliers", "sales_staff");
    await waitFor(() => expect(sales.view.getAllByTestId("supplier-row")).toHaveLength(1), WAIT);
    expect(sales.view.queryByTestId("suppliers-add")).toBeNull();
    expect(sales.view.queryByTestId(`supplier-edit-${CATALOG_IDS.supplier}`)).toBeNull();
  });
});

describe("paging, retry and the search box (SC7, BR5.2, BR5.3 of U2)", () => {
  const many =
    (table: "customers" | "products", n: number) => (stub: ReturnType<typeof makeSqlStub>) => {
      const business = stub.state.businesses[0]?.["id"];
      for (let i = 0; i < n; i++) {
        const at = new Date(Date.UTC(2026, 9, 1, 0, 0, i));
        const id = `0b0b0b0b-0b0b-4b0b-8b0b-${String(i).padStart(12, "0")}`;
        if (table === "customers") {
          stub.state.customers.push({
            id,
            business_id: business,
            name: `ক্রেতা ${i}`,
            phone: `0171${String(i).padStart(7, "0")}`,
            address: null,
            risk_level: 0,
            created_by: null,
            created_at: at,
            updated_at: at,
          });
        } else {
          stub.state.products.push({
            id,
            business_id: business,
            name: `পণ্য ${i}`,
            sku: `P-${i}`,
            category: null,
            selling_price_paise: "1000",
            purchase_cost_paise: null,
            default_supplier_id: null,
            axes: [],
            created_by: null,
            created_at: at,
            updated_at: at,
          });
        }
      }
    };

  test("customers: 50 rows, then 'আরও দেখুন' appends the rest and disappears", async () => {
    const { view } = await mount("customers", "owner", {
      seed: false,
      prepare: many("customers", 51),
    });
    await waitFor(() => expect(view.getAllByTestId("customer-row")).toHaveLength(50), WAIT);
    expect(view.getByTestId("customers-total").textContent).toBe("মোট: ৫১");
    fireEvent.click(view.getByTestId("customers-more"));
    await waitFor(() => expect(view.getAllByTestId("customer-row")).toHaveLength(51), WAIT);
    expect(view.queryByTestId("customers-more")).toBeNull();
  });

  test("products: 'আরও দেখুন' appends; cost shows 'দেওয়া হয়নি' when unrecorded", async () => {
    const { view } = await mount("products", "manager", {
      seed: false,
      prepare: many("products", 51),
    });
    await waitFor(() => expect(view.getAllByTestId("product-row")).toHaveLength(50), WAIT);
    expect(view.getAllByTestId("product-cost")[0]?.textContent).toBe("দেওয়া হয়নি");
    fireEvent.click(view.getByTestId("products-more"));
    await waitFor(() => expect(view.getAllByTestId("product-row")).toHaveLength(51), WAIT);
    expect(view.queryByTestId("products-more")).toBeNull();
  });

  test("a failed list read shows the banner with retry; retry loads the rows", async () => {
    const { view } = await mount("customers", "owner", {
      stub: { faults: [{ match: /ORDER BY created_at DESC, id DESC/, code: "08006", times: 1 }] },
    });
    await waitFor(
      () =>
        expect(view.getByTestId("error-banner").getAttribute("data-kind")).toBe("db_unavailable"),
      WAIT,
    );
    fireEvent.click(view.getByTestId("error-banner-retry"));
    await waitFor(() => expect(view.getAllByTestId("customer-row")).toHaveLength(1), WAIT);
    cleanup();
    const products = await mount("products", "owner", {
      stub: { faults: [{ match: /ORDER BY p\.created_at DESC/, code: "08006", times: 1 }] },
    });
    await waitFor(() => expect(products.view.getByTestId("error-banner")).toBeTruthy(), WAIT);
    fireEvent.click(products.view.getByTestId("error-banner-retry"));
    await waitFor(() => expect(products.view.getAllByTestId("product-row")).toHaveLength(1), WAIT);
  });

  test("a failed 'more' keeps the loaded rows and says why; pressing it again loads them", async () => {
    // The stub reads its fault list on every statement, so a fault added after the first
    // page fails exactly the cursor page.
    const faults: StubFault[] = [];
    const { view } = await mount("customers", "owner", {
      seed: false,
      prepare: many("customers", 51),
      stub: { faults },
    });
    await waitFor(() => expect(view.getAllByTestId("customer-row")).toHaveLength(50), WAIT);
    faults.push({ match: /ORDER BY created_at DESC, id DESC/, code: "08006", times: 1 });
    fireEvent.click(view.getByTestId("customers-more"));
    await waitFor(
      () =>
        expect(view.getByTestId("customers-more-error").getAttribute("data-kind")).toBe(
          "db_unavailable",
        ),
      WAIT,
    );
    expect(view.getAllByTestId("customer-row")).toHaveLength(50);
    fireEvent.click(view.getByTestId("customers-more"));
    await waitFor(() => expect(view.getAllByTestId("customer-row")).toHaveLength(51), WAIT);
  });

  test("the search box searches at once on Enter, and ✕ clears it", async () => {
    const { view, calls } = await mount("products", "owner");
    await waitFor(() => expect(view.getAllByTestId("product-row")).toHaveLength(1), WAIT);
    const input = view.getByTestId("products-search-input");
    type(input, "নেই");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(view.getByTestId("products-no-match")).toBeTruthy(), WAIT);
    expect(calls.some((c) => c.path.includes("q=%E0%A6%A8"))).toBe(true);
    fireEvent.click(view.getByTestId("products-search-clear"));
    await waitFor(() => expect(view.getAllByTestId("product-row")).toHaveLength(1), WAIT);
    expect((view.getByTestId("products-search-input") as HTMLInputElement).value).toBe("");
  });
});

describe("input helpers (BR5.6, BR7.1)", () => {
  test("taka, counts and value lists accept Bangla digits and commas", () => {
    expect(parseTaka("১২০০")).toBe(120_000);
    expect(parseTaka("12.5")).toBe(1_250);
    expect(parseTaka("1,250.75")).toBe(125_075);
    expect([parseTaka("-1"), parseTaka("1.234"), parseTaka("abc")]).toEqual([null, null, null]);
    expect(takaText(120_000)).toBe("1200");
    expect(takaText(125_075)).toBe("1250.75");
    expect(takaText(null)).toBe("");
    expect([
      parseCount("৭"),
      parseCount("1000000"),
      parseCount("1000001"),
      parseCount("-1"),
    ]).toEqual([7, 1_000_000, null, null]);
    expect(splitValues(" M, L ,, XL ")).toEqual(["M", "L", "XL"]);
  });
});

describe("routing guards on the screens", () => {
  test("foreign state renders nothing; product new/edit lock without the manage capability", async () => {
    expect(renderCatalogScreen("customers", { kind: "orders" })).toBeNull();
    const { view } = await mount("product-new", "sales_staff");
    expect(view.getByTestId("lock-sheet")).toBeTruthy();
    cleanup();
    const edit = await mount("product-edit", "accountant", { id: CATALOG_IDS.product });
    expect(edit.view.getByTestId("lock-sheet")).toBeTruthy();
    await act(async () => undefined);
  });
});
