/**
 * tests/integration/orders-catalog-screens.test.tsx — the order screens linked to the catalog
 * (U5 US4.1, US4.2; BR4.1–BR4.3, BR5.1–BR5.3, BR6.1; NFR9.14; frontend-components) in
 * happy-dom.
 *
 * Restated rules:
 *   - CatalogPicker: typing searches after a pause; ArrowDown / ArrowUp move, Enter picks,
 *     Escape closes; a failed search and an empty answer each say so; Enter never submits;
 *   - ManualOrder: picking a customer links it and fills name, phone and address, which stay
 *     editable; "সরান" clears only the link; picking a product's variant fills the line's
 *     description with its label and its price with the selling price; a 404 naming
 *     `customerId` or `items.<n>.variantId` shows "পাওয়া যায়নি" under that picker;
 *   - PasteParse: loads the match index ONCE; shows each item's linked product and variant or
 *     the picker; says when the index was cut; a phone with one customer pre-selects it
 *     (undoably), several are a choice, none offers "নতুন ক্রেতা হিসেবে যোগ করুন";
 *   - the order detail shows the linked customer's name and each line's label;
 *   - Bangla digits on Bangla screens (NFR9.14).
 * The last describe drives the real App against the real request pipeline (SQL stub), so the
 * router's loaders are exercised end to end: a paste and a manual order each save with real
 * customer and variant ids.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { createCatalogApi } from "../../src/client/catalog-api.js";
import { createOrdersStore } from "../../src/client/orders-store.js";
import { createSessionStore } from "../../src/client/session-store.js";
import { err, ok } from "../../src/data/result.js";
import type { Uuid } from "../../src/data/uuid.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { createOrderDraftStore, type SaveOrder } from "../../src/orders/order-draft.js";
import { ManualOrder } from "../../src/orders/screens/ManualOrder.js";
import { OrderDetail } from "../../src/orders/screens/OrderDetail.js";
import type {
  CustomerChoice,
  MatchIndexLoad,
  OrdersCatalog,
  VariantChoice,
} from "../../src/orders/screens/OrderLinks.js";
import { PasteParse } from "../../src/orders/screens/PasteParse.js";
import type { CreateOrderInput, NamedOrder, Order } from "../../src/orders/types.js";
import { CatalogPicker } from "../../src/pres/CatalogPicker.js";
import { App, type AppDeps } from "../../src/router/App.js";
import { browserClient } from "../helpers/browser-fetch.js";
import { CATALOG_IDS, seedCatalog } from "../helpers/catalog-fixtures.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness } from "../helpers/server-harness.js";

const WAIT = { timeout: 3_000 };

const RINA: CustomerChoice = {
  id: "c-rina",
  name: "রিনা আক্তার",
  phone: "01712345678",
  address: "মিরপুর",
};
const RINA_TWIN: CustomerChoice = {
  id: "c-twin",
  name: "রিনার বোন",
  phone: "01712345678",
  address: null,
};
const KURTI_M: VariantChoice = {
  productId: "p-kurti",
  variantId: "v-m",
  label: "সুতির কুর্তি · M",
  sellingPricePaise: 120_000,
};
const KURTI_L: VariantChoice = { ...KURTI_M, variantId: "v-l", label: "সুতির কুর্তি · L" };

const INDEX: MatchIndexLoad = {
  products: [
    {
      productId: "p-kurti",
      name: "সুতির কুর্তি",
      sku: "KRT-1",
      axisNames: ["সাইজ"],
      variants: [
        { variantId: "v-l", axisValues: ["L"] },
        { variantId: "v-m", axisValues: ["M"] },
      ],
    },
    {
      productId: "p-saree",
      name: "সুতির শাড়ি",
      sku: "SAR-1",
      axisNames: [],
      variants: [{ variantId: "v-saree", axisValues: [] }],
    },
  ],
  truncated: false,
};

interface Calls {
  matchIndex: number;
  customers: string[];
  phones: string[];
}

/** Stub loaders answering from the fixtures above; `fail` makes every search fail. */
const loaders = (
  over: Partial<OrdersCatalog> = {},
  fail = false,
): { catalog: OrdersCatalog; calls: Calls } => {
  const calls: Calls = { matchIndex: 0, customers: [], phones: [] };
  const catalog: OrdersCatalog = {
    searchCustomers: async (q) => {
      calls.customers.push(q);
      return fail
        ? null
        : [RINA, RINA_TWIN].filter((c) => c.name.includes(q) || c.phone.includes(q));
    },
    searchProducts: async (q) =>
      fail
        ? null
        : q.includes("কুর্তি")
          ? [{ id: "p-kurti", name: "সুতির কুর্তি", sku: "KRT-1" }]
          : [],
    productVariants: async () => (fail ? null : [KURTI_M, KURTI_L]),
    matchIndex: async () => {
      calls.matchIndex += 1;
      return INDEX;
    },
    customersByPhone: async (phone) => {
      calls.phones.push(phone);
      return [RINA];
    },
    ...over,
  };
  return { catalog, calls };
};

/** A save that records the input and answers a saved order. */
const recordingSave = (): { save: SaveOrder; saved: CreateOrderInput[] } => {
  const saved: CreateOrderInput[] = [];
  return {
    saved,
    save: async (input) => {
      saved.push(input);
      return ok({ id: "0f000000-0000-4000-8000-000000000001" } as Order);
    },
  };
};

const type = (el: HTMLElement, value: string): void => {
  fireEvent.change(el, { target: { value } });
};

beforeEach(() => setLocale("bn"));
afterEach(() => cleanup());

describe("CatalogPicker (NFR9.14)", () => {
  const mountPicker = (search: (q: string) => Promise<ReadonlyArray<string> | null>) => {
    const picked: string[] = [];
    const view = render(
      <form onSubmit={() => picked.push("SUBMITTED")}>
        <CatalogPicker<string>
          label="খুঁজুন"
          placeholder="নাম"
          search={search}
          itemKey={(s) => s}
          renderItem={(s) => s}
          onPick={(s) => picked.push(s)}
          emptyText="কিছু পাওয়া যায়নি"
          failedText="খোঁজা যায়নি"
          testId="pk"
        />
      </form>,
    );
    return { view, picked };
  };

  test("arrows move the active option, Enter picks it and never submits the form", async () => {
    const { view, picked } = mountPicker(async () => ["এক", "দুই", "তিন"]);
    const input = view.getByTestId("pk-input");
    type(input, "x");
    await waitFor(() => expect(view.getAllByTestId("pk-option")).toHaveLength(3), WAIT);
    expect(view.getByRole("listbox").hidden).toBe(false);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(view.getAllByTestId("pk-option").map((o) => o.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(picked).toEqual(["দুই"]);
    // Picking clears the box and closes the list.
    expect((input as HTMLInputElement).value).toBe("");
    expect(view.queryAllByTestId("pk-option")).toHaveLength(0);
  });

  test("a click picks; Escape closes; an empty answer and a failure each say so", async () => {
    let answer: ReadonlyArray<string> | null = ["এক"];
    const { view, picked } = mountPicker(async () => answer);
    const input = view.getByTestId("pk-input");
    type(input, "a");
    await waitFor(() => expect(view.getAllByTestId("pk-option")).toHaveLength(1), WAIT);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(view.queryAllByTestId("pk-option")).toHaveLength(0);
    type(input, "ab");
    await waitFor(() => expect(view.getAllByTestId("pk-option")).toHaveLength(1), WAIT);
    fireEvent.click(view.getByTestId("pk-option"));
    expect(picked).toEqual(["এক"]);
    answer = [];
    type(input, "zz");
    await waitFor(
      () => expect(view.getByTestId("pk-empty").textContent).toBe("কিছু পাওয়া যায়নি"),
      WAIT,
    );
    answer = null;
    type(input, "zzz");
    await waitFor(
      () => expect(view.getByTestId("pk-failed").textContent).toBe("খোঁজা যায়নি"),
      WAIT,
    );
    // Clearing the box closes everything without a search.
    type(input, "");
    expect(view.queryByTestId("pk-failed")).toBeNull();
  });

  test("an answer that arrives after a newer search is dropped", async () => {
    const pending: Array<(v: ReadonlyArray<string>) => void> = [];
    const { view } = mountPicker(
      (q) => new Promise((resolve) => pending.push((v) => resolve(v.map((s) => `${q}:${s}`)))),
    );
    const input = view.getByTestId("pk-input");
    type(input, "old");
    await waitFor(() => expect(pending).toHaveLength(1), WAIT);
    type(input, "new");
    await waitFor(() => expect(pending).toHaveLength(2), WAIT);
    await act(async () => pending[1]?.(["x"]));
    await act(async () => pending[0]?.(["y"]));
    expect(view.getAllByTestId("pk-option").map((o) => o.textContent)).toEqual(["new:x"]);
  });
});

describe("ManualOrder with the catalog (BR4.1, BR4.2, US4.1)", () => {
  test("a picked customer fills the editable contact; Unlink keeps the typed values", async () => {
    const { catalog, calls } = loaders();
    const { save, saved } = recordingSave();
    const view = render(
      <ManualOrder locale="bn" draft={createOrderDraftStore()} onSave={save} catalog={catalog} />,
    );
    type(view.getByTestId("manual-customer-picker-input"), "রিনা");
    await waitFor(
      () => expect(view.getAllByTestId("manual-customer-picker-option")).toHaveLength(2),
      WAIT,
    );
    // NFR9.14: the phone in the option is in Bangla digits.
    expect(view.getAllByTestId("manual-customer-picker-option")[0]?.textContent).toBe(
      "রিনা আক্তার · ০১৭১২৩৪৫৬৭৮",
    );
    expect(calls.customers).toEqual(["রিনা"]);
    fireEvent.click(view.getAllByTestId("manual-customer-picker-option")[0]!);
    expect(view.getByTestId("manual-customer-linked").textContent).toContain("রিনা আক্তার");
    const value = (id: string): string => (view.getByTestId(id) as HTMLInputElement).value;
    expect([
      value("manual-contact-name"),
      value("manual-contact-phone"),
      value("manual-contact-address"),
    ]).toEqual(["রিনা আক্তার", "01712345678", "মিরপুর"]);
    // Editable: the person may change the name on this order.
    type(view.getByTestId("manual-contact-name"), "রিনা আপা");
    type(view.getByTestId("manual-line-description-1"), "কুর্তি");
    type(view.getByTestId("manual-line-price-1"), "১২০০");
    await act(async () => {
      fireEvent.submit(view.getByTestId("manual-order-form"));
    });
    expect(saved[0]).toMatchObject({
      customerId: "c-rina",
      contact: { name: "রিনা আপা", phone: "01712345678", address: "মিরপুর" },
    });
    fireEvent.click(view.getByTestId("manual-customer-unlink"));
    expect(view.queryByTestId("manual-customer-linked")).toBeNull();
    expect(value("manual-contact-name")).toBe("রিনা আপা");
    expect(view.getByTestId("manual-customer-new").getAttribute("href")).toBe("#/customers/new");
  });

  test("a picked variant fills the line's label and selling price; Change and Unlink; one variant picks at once", async () => {
    const { catalog } = loaders();
    const { save, saved } = recordingSave();
    const view = render(
      <ManualOrder locale="bn" draft={createOrderDraftStore()} onSave={save} catalog={catalog} />,
    );
    type(view.getByTestId("manual-line-variant-1-picker-input"), "কুর্তি");
    await waitFor(
      () => expect(view.getAllByTestId("manual-line-variant-1-picker-option")).toHaveLength(1),
      WAIT,
    );
    fireEvent.click(view.getByTestId("manual-line-variant-1-picker-option"));
    await waitFor(
      () => expect(view.getAllByTestId("manual-line-variant-1-variant")).toHaveLength(2),
      WAIT,
    );
    fireEvent.click(view.getAllByTestId("manual-line-variant-1-variant")[1]!);
    expect(view.getByTestId("manual-line-variant-1-linked").textContent).toContain(
      "সুতির কুর্তি · L",
    );
    expect((view.getByTestId("manual-line-description-1") as HTMLInputElement).value).toBe(
      "সুতির কুর্তি · L",
    );
    expect((view.getByTestId("manual-line-price-1") as HTMLInputElement).value).toBe("1200");
    // The price stays editable; the person gives a discount on the price itself.
    type(view.getByTestId("manual-line-price-1"), "1100");
    await act(async () => {
      fireEvent.submit(view.getByTestId("manual-order-form"));
    });
    expect(saved[0]?.items[0]).toMatchObject({
      variantId: "v-l",
      description: "সুতির কুর্তি · L",
      unitPricePaise: 110_000,
    });
    // Change opens the picker again; Unlink clears only the link.
    fireEvent.click(view.getByTestId("manual-line-variant-1-change"));
    expect(view.getByTestId("manual-line-variant-1-picker-input")).toBeDefined();
    cleanup();
    const one = render(
      <ManualOrder
        locale="en"
        draft={createOrderDraftStore()}
        onSave={save}
        catalog={loaders({ productVariants: async () => [KURTI_M] }).catalog}
      />,
    );
    type(one.getByTestId("manual-line-variant-1-picker-input"), "কুর্তি");
    await waitFor(
      () => expect(one.getAllByTestId("manual-line-variant-1-picker-option")).toHaveLength(1),
      WAIT,
    );
    fireEvent.click(one.getByTestId("manual-line-variant-1-picker-option"));
    await waitFor(
      () =>
        expect(one.getByTestId("manual-line-variant-1-linked").textContent).toContain(
          "সুতির কুর্তি · M",
        ),
      WAIT,
    );
    fireEvent.click(one.getByTestId("manual-line-variant-1-unlink"));
    expect(one.queryByTestId("manual-line-variant-1-linked")).toBeNull();
    expect((one.getByTestId("manual-line-description-1") as HTMLInputElement).value).toBe(
      "সুতির কুর্তি · M",
    );
  });

  test("a 404 from save shows 'পাওয়া যায়নি' under the customer or the line it names; the draft stays", async () => {
    const { catalog } = loaders();
    let answer: { path: string } = { path: "customerId" };
    const save: SaveOrder = async () =>
      err({ kind: "not_found", fields: [{ path: answer.path, message: "not found" }] });
    const view = render(
      <ManualOrder locale="bn" draft={createOrderDraftStore()} onSave={save} catalog={catalog} />,
    );
    type(view.getByTestId("manual-customer-picker-input"), "রিনা");
    await waitFor(
      () => expect(view.getAllByTestId("manual-customer-picker-option")).toHaveLength(2),
      WAIT,
    );
    fireEvent.click(view.getAllByTestId("manual-customer-picker-option")[0]!);
    type(view.getByTestId("manual-line-description-1"), "কুর্তি");
    type(view.getByTestId("manual-line-price-1"), "1200");
    await act(async () => {
      fireEvent.submit(view.getByTestId("manual-order-form"));
    });
    expect(view.getByTestId("manual-customer-not-found").textContent).toBe("পাওয়া যায়নি");
    expect(view.queryByTestId("manual-line-variant-1-not-found")).toBeNull();
    expect(view.getByTestId("manual-customer-linked")).toBeDefined();
    answer = { path: "items.0.variantId" };
    type(view.getByTestId("manual-line-quantity-1"), "2");
    await act(async () => {
      fireEvent.submit(view.getByTestId("manual-order-form"));
    });
    expect(view.getByTestId("manual-line-variant-1-not-found").textContent).toBe("পাওয়া যায়নি");
    expect(view.queryByTestId("manual-customer-not-found")).toBeNull();
  });

  test("a typed phone must be a mobile number; Bangla digits and +880 are accepted", () => {
    const { catalog } = loaders();
    const draft = createOrderDraftStore();
    const view = render(
      <ManualOrder locale="bn" draft={draft} onSave={recordingSave().save} catalog={catalog} />,
    );
    type(view.getByTestId("manual-line-description-1"), "কুর্তি");
    type(view.getByTestId("manual-line-price-1"), "1200");
    type(view.getByTestId("manual-contact-phone"), "১২৩");
    expect(view.getByTestId("manual-contact-phone-error").textContent).toBe(
      "ফোন: ০১ দিয়ে শুরু ১১টি সংখ্যা",
    );
    expect((view.getByTestId("manual-save") as HTMLButtonElement).disabled).toBe(true);
    type(view.getByTestId("manual-contact-phone"), "+880 1712-345678");
    expect(view.queryByTestId("manual-contact-phone-error")).toBeNull();
    expect(draft.get().pending?.contact).toEqual({
      name: null,
      phone: "01712345678",
      address: null,
    });
  });

  test("a failed product search and a failed variant load say so", async () => {
    const failing = render(
      <ManualOrder
        locale="bn"
        draft={createOrderDraftStore()}
        onSave={recordingSave().save}
        catalog={loaders({}, true).catalog}
      />,
    );
    type(failing.getByTestId("manual-line-variant-1-picker-input"), "কুর্তি");
    await waitFor(
      () => expect(failing.getByTestId("manual-line-variant-1-picker-failed")).toBeDefined(),
      WAIT,
    );
    cleanup();
    const noVariants = render(
      <ManualOrder
        locale="bn"
        draft={createOrderDraftStore()}
        onSave={recordingSave().save}
        catalog={loaders({ productVariants: async () => null }).catalog}
      />,
    );
    type(noVariants.getByTestId("manual-line-variant-1-picker-input"), "কুর্তি");
    await waitFor(
      () =>
        expect(noVariants.getAllByTestId("manual-line-variant-1-picker-option")).toHaveLength(1),
      WAIT,
    );
    fireEvent.click(noVariants.getByTestId("manual-line-variant-1-picker-option"));
    await waitFor(
      () =>
        expect(noVariants.getByTestId("manual-line-variant-1-failed").textContent).toBe(
          "খোঁজা যায়নি, আবার চেষ্টা করুন",
        ),
      WAIT,
    );
  });
});

/** The paste screen has its match index (or knows it has none). */
const indexReady = async (view: ReturnType<typeof render>): Promise<void> =>
  waitFor(
    () => expect(view.getByTestId("paste-parse").getAttribute("data-catalog")).toBe("ready"),
    WAIT,
  );

describe("PasteParse with the catalog (BR5.1–BR5.3, BR6.1, US4.2)", () => {
  const paste = async (view: ReturnType<typeof render>, text: string): Promise<void> => {
    type(view.getByTestId("paste-box"), text);
    await act(async () => {
      fireEvent.click(view.getByTestId("paste-parse"));
    });
  };

  test("the index loads once; items link from their own words; the phone pre-selects its one customer", async () => {
    const { catalog, calls } = loaders();
    const { save, saved } = recordingSave();
    const view = render(
      <PasteParse locale="bn" draft={createOrderDraftStore()} onSave={save} catalog={catalog} />,
    );
    await indexReady(view);
    await paste(view, "সুতির কুর্তি M ২টা আর সুতির শাড়ি ১টা আর জুতা ১টা\nরিনা\n০১৭১২৩৪৫৬৭৮");
    await paste(view, "সুতির কুর্তি M ২টা আর সুতির শাড়ি ১টা আর জুতা ১টা\nরিনা\n০১৭১২৩৪৫৬৭৮");
    expect(calls.matchIndex).toBe(1);
    expect(view.getByTestId("paste-item-link-1-product").textContent).toContain("সুতির কুর্তি · M");
    expect(view.getByTestId("paste-item-link-2-product").textContent).toContain("সুতির শাড়ি");
    // An unlinked item offers the product picker and does not block the order.
    expect(view.getByTestId("paste-item-link-3-picker-input")).toBeDefined();
    expect(view.getAllByTestId("paste-item").map((i) => i.getAttribute("data-incomplete"))).toEqual(
      ["false", "false", "false"],
    );
    // NFR9.14: quantities in Bangla digits.
    expect(view.getAllByTestId("paste-item-quantity").map((q) => q.textContent)).toEqual([
      "২",
      "১",
      "১",
    ]);
    await waitFor(
      () => expect(view.getByTestId("paste-customer").textContent).toContain("রিনা আক্তার"),
      WAIT,
    );
    expect(calls.phones).toEqual(["01712345678", "01712345678"]);
    for (const [i, price] of ["1200", "900", "500"].entries()) {
      type(view.getByTestId(`paste-item-price-${i + 1}`), price);
    }
    await act(async () => {
      fireEvent.click(view.getByTestId("paste-save"));
    });
    expect(saved[0]?.customerId).toBe("c-rina");
    expect(saved[0]?.items.map((i) => [i.variantId, i.description])).toEqual([
      ["v-m", "সুতির কুর্তি M ২টা"],
      ["v-saree", "সুতির শাড়ি ১টা"],
      [null, "জুতা ১টা"],
    ]);
  });

  test("a linked product without its variant offers the variants; the suggestion can be undone", async () => {
    const { catalog } = loaders();
    const draft = createOrderDraftStore();
    const view = render(
      <PasteParse locale="bn" draft={draft} onSave={recordingSave().save} catalog={catalog} />,
    );
    await indexReady(view);
    expect(view.queryByTestId("paste-truncated")).toBeNull();
    await paste(view, "সুতির কুর্তি ১টা\n01712345678");
    await waitFor(
      () => expect(view.getAllByTestId("paste-item-link-1-variant")).toHaveLength(2),
      WAIT,
    );
    fireEvent.click(view.getAllByTestId("paste-item-link-1-variant")[0]!);
    expect(view.getByTestId("paste-item-link-1-product").textContent).toContain("সুতির কুর্তি · L");
    await waitFor(() => expect(view.getByTestId("paste-customer")).toBeDefined(), WAIT);
    fireEvent.click(view.getByTestId("paste-customer-unlink"));
    expect(view.queryByTestId("paste-customer")).toBeNull();
    // Undone, the suggestion is offered again rather than silently re-selected.
    fireEvent.click(view.getByTestId("paste-customer-choice"));
    expect(view.getByTestId("paste-customer").textContent).toContain("রিনা আক্তার");
    fireEvent.click(view.getByTestId("paste-item-link-1-unlink"));
    expect(view.getByTestId("paste-item-link-1-picker-input")).toBeDefined();
  });

  test("an ambiguous item is incomplete until the person picks; several customers are a choice; none offers a new customer", async () => {
    const twins = loaders({ customersByPhone: async () => [RINA, RINA_TWIN] });
    const view = render(
      <PasteParse
        locale="bn"
        draft={createOrderDraftStore()}
        onSave={recordingSave().save}
        catalog={twins.catalog}
      />,
    );
    await indexReady(view);
    await paste(view, "সুতির কুর্তি সুতির শাড়ি কম্বো ১টা\n01712345678");
    expect(view.getAllByTestId("paste-item")[0]?.getAttribute("data-incomplete")).toBe("true");
    type(view.getByTestId("paste-item-link-1-picker-input"), "কুর্তি");
    await waitFor(
      () => expect(view.getAllByTestId("paste-item-link-1-picker-option")).toHaveLength(1),
      WAIT,
    );
    fireEvent.click(view.getByTestId("paste-item-link-1-picker-option"));
    await waitFor(
      () => expect(view.getAllByTestId("paste-item-link-1-variant")).toHaveLength(2),
      WAIT,
    );
    fireEvent.click(view.getAllByTestId("paste-item-link-1-variant")[1]!);
    expect(view.getAllByTestId("paste-item")[0]?.getAttribute("data-incomplete")).toBe("false");
    await waitFor(() => expect(view.getAllByTestId("paste-customer-choice")).toHaveLength(2), WAIT);
    fireEvent.click(view.getAllByTestId("paste-customer-choice")[1]!);
    expect(view.getByTestId("paste-customer").textContent).toContain("রিনার বোন");
    cleanup();
    const nobody = loaders({ customersByPhone: async () => [] });
    const second = render(
      <PasteParse
        locale="bn"
        draft={createOrderDraftStore()}
        onSave={recordingSave().save}
        catalog={nobody.catalog}
      />,
    );
    await paste(second, "জুতা ১টা\n01812345678");
    await waitFor(
      () =>
        expect(second.getByTestId("paste-customer-new").textContent).toBe(
          "নতুন ক্রেতা হিসেবে যোগ করুন",
        ),
      WAIT,
    );
  });

  test("a truncated index says not everything was matched; a failed index load parses without links", async () => {
    const cut = loaders({ matchIndex: async () => ({ ...INDEX, truncated: true }) });
    const view = render(
      <PasteParse
        locale="bn"
        draft={createOrderDraftStore()}
        onSave={recordingSave().save}
        catalog={cut.catalog}
      />,
    );
    await waitFor(
      () =>
        expect(view.getByTestId("paste-truncated").textContent).toBe(
          "সব পণ্য মেলানো যায়নি — পণ্যের তালিকা খুব বড়",
        ),
      WAIT,
    );
    cleanup();
    const down = loaders({ matchIndex: async () => null, customersByPhone: async () => null });
    const second = render(
      <PasteParse
        locale="en"
        draft={createOrderDraftStore()}
        onSave={recordingSave().save}
        catalog={down.catalog}
      />,
    );
    await paste(second, "সুতির কুর্তি M ১টা\n01712345678");
    expect(second.queryByTestId("paste-item-link-1-product")).toBeNull();
    expect(second.getByTestId("paste-item-link-1-picker-input")).toBeDefined();
    expect(second.queryByTestId("paste-customer")).toBeNull();
  });
});

describe("OrderDetail shows the catalog's names (E5)", () => {
  test("customerName and each line's label replace the contact name and the description", () => {
    const order = {
      id: "0f000000-0000-4000-8000-000000000001" as Uuid,
      businessId: "a0000000-0000-4000-8000-00000000000a" as Uuid,
      orderNo: "ORD-1001",
      customerId: "c-rina",
      contact: { name: "রিনা আপা", phone: "01712345678", address: null },
      customerName: "রিনা আক্তার",
      status: "new",
      source: "manual",
      repeatOfOrderId: null,
      itemsRevision: 1,
      items: [
        {
          id: "0e000000-0000-4000-8000-000000000001" as Uuid,
          orderId: "0f000000-0000-4000-8000-000000000001" as Uuid,
          businessId: "a0000000-0000-4000-8000-00000000000a" as Uuid,
          lineNo: 1,
          variantId: "v-m",
          description: "কুর্তি",
          label: "সুতির কুর্তি · M",
          quantity: 1,
          unitPricePaise: 1_000,
          lineDiscountPaise: 0,
        },
      ],
      orderDiscountPaise: 0,
      deliveryChargePaise: 0,
      totalPaise: 1_000,
      createdBy: null,
      createdAt: "2026-10-27T08:00:00.000Z",
      updatedAt: "2026-10-27T08:00:00.000Z",
    } satisfies NamedOrder;
    const view = render(
      <OrderDetail
        order={order}
        locale="bn"
        canMutate={false}
        onTransition={() => undefined}
        onRepeat={() => undefined}
      />,
    );
    expect(view.getByTestId("order-detail-customer").textContent).toBe("রিনা আক্তার");
    expect(view.getByTestId("order-detail-item-label").textContent).toBe("সুতির কুর্তি · M");
  });
});

describe("the App's catalog loaders against the real pipeline (W1, W3, AC4.1.1)", () => {
  const go = async (path: string): Promise<void> => {
    await act(async () => {
      window.location.hash = path;
      window.dispatchEvent(new window.HashChangeEvent("hashchange") as unknown as Event);
    });
  };

  const signedInApp = async () => {
    const stub = makeSqlStub();
    const client = browserClient(harness(stub));
    expect(
      (
        await client.auth.signUp({
          businessName: "Acme",
          email: "owner@acme.test",
          password: "correct-horse-1",
        })
      ).ok,
    ).toBe(true);
    const businessId = String(stub.state.businesses[0]?.["id"]) as Uuid;
    seedCatalog(stub, businessId);
    const deps: AppDeps = {
      http: client.http,
      auth: client.auth,
      orders: client.orders,
      sessions: createSessionStore(),
      ordersStore: createOrdersStore(),
      draft: createOrderDraftStore(),
      catalog: createCatalogApi(client.http),
    };
    return { stub, client, deps };
  };

  test("a pasted message saves with the catalog's customer and variant ids", async () => {
    const { stub, client, deps } = await signedInApp();
    await go("/orders/new/paste-parse");
    const view = render(<App deps={deps} />);
    await waitFor(() => expect(view.getByTestId("paste-box")).toBeDefined(), WAIT);
    await indexReady(view);
    expect(client.net.calls.filter((c) => c.path === "/api/catalog/match-index")).toHaveLength(1);
    type(view.getByTestId("paste-box"), "সুতির কুর্তি L ১টা\nরিনা\n01712345678");
    await act(async () => {
      fireEvent.click(view.getByTestId("paste-parse"));
    });
    await waitFor(
      () => expect(view.getByTestId("paste-customer").textContent).toContain("রিনা আক্তার"),
      WAIT,
    );
    expect(view.getByTestId("paste-item-link-1-product").textContent).toContain("সুতির কুর্তি · L");
    type(view.getByTestId("paste-item-price-1"), "1200");
    await act(async () => {
      fireEvent.click(view.getByTestId("paste-save"));
    });
    await waitFor(() => expect(stub.state.orders).toHaveLength(1), WAIT);
    expect(stub.state.orders[0]?.["customer_id"]).toBe(CATALOG_IDS.customer);
    expect(stub.state.orderItems[0]?.["variant_id"]).toBe(CATALOG_IDS.variant2);
  });

  test("a manual order picks the customer and a variant through the App's loaders", async () => {
    const { stub, deps } = await signedInApp();
    await go("/orders/new");
    const view = render(<App deps={deps} />);
    await waitFor(() => expect(view.getByTestId("manual-order-form")).toBeDefined(), WAIT);
    type(view.getByTestId("manual-customer-picker-input"), "রিনা");
    await waitFor(
      () => expect(view.getAllByTestId("manual-customer-picker-option")).toHaveLength(1),
      WAIT,
    );
    fireEvent.click(view.getByTestId("manual-customer-picker-option"));
    type(view.getByTestId("manual-line-variant-1-picker-input"), "KURTI");
    await waitFor(
      () => expect(view.getAllByTestId("manual-line-variant-1-picker-option")).toHaveLength(1),
      WAIT,
    );
    fireEvent.click(view.getByTestId("manual-line-variant-1-picker-option"));
    await waitFor(
      () => expect(view.getAllByTestId("manual-line-variant-1-variant")).toHaveLength(2),
      WAIT,
    );
    const m = view
      .getAllByTestId("manual-line-variant-1-variant")
      .find((b) => b.getAttribute("data-key") === CATALOG_IDS.variant);
    fireEvent.click(m!);
    expect((view.getByTestId("manual-line-price-1") as HTMLInputElement).value).toBe("1200");
    await act(async () => {
      fireEvent.submit(view.getByTestId("manual-order-form"));
    });
    await waitFor(() => expect(stub.state.orders).toHaveLength(1), WAIT);
    expect(stub.state.orders[0]?.["customer_id"]).toBe(CATALOG_IDS.customer);
    expect(stub.state.orderItems[0]).toMatchObject({
      variant_id: CATALOG_IDS.variant,
      description: "সুতির কুর্তি · M",
      unit_price_paise: "120000",
    });
    // AC4.1.1: the list now shows the customer's name and the variant's label.
    await waitFor(() => expect(view.getAllByTestId("orders-row")).toHaveLength(1), WAIT);
    expect(view.getAllByTestId("orders-row")[0]?.textContent).toContain("রিনা আক্তার");
  });
});
