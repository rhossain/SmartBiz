/**
 * tests/integration/product-photo-screen.test.tsx — the photo block on the product page
 * (src/catalog/screens/ProductDetail.tsx), through the real pipeline on the fail-closed stub.
 *
 * Rules restated: Owner and Manager get "ছবি যোগ করুন" with a file input; Sales Staff and the
 * Accountant get no controls; a picked file is shrunk, then sent, and the image URL changes so
 * the new photo shows; a file the shrinker cannot use says so and sends nothing; a photo the
 * server refuses shows the refusal. happy-dom loads no images, so the photo's own visibility
 * (shown on load, hidden on a 404) is driven by firing the image's events.
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
} from "../../src/catalog/screens/render-catalog-route.js";
import type { ShrunkImage } from "../../src/pres/shrink-image.js";
import { browserFetch } from "../helpers/browser-fetch.js";
import { CATALOG_IDS, seedCatalog } from "../helpers/catalog-fixtures.js";
import { harness, seedBusiness } from "../helpers/server-harness.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

const WAIT = { timeout: 3_000 };
const SHRUNK_JPEG: ShrunkImage = { contentType: "image/jpeg", data: "/9j/4AAQSkZJRg==" };

const CAN: Readonly<Record<Role, CatalogPermissions>> = {
  owner: { writeCustomers: true, manage: true, readCost: true, writeCost: true },
  manager: { writeCustomers: true, manage: true, readCost: true, writeCost: true },
  sales_staff: { writeCustomers: true, manage: false, readCost: false, writeCost: false },
  accountant: { writeCustomers: false, manage: false, readCost: true, writeCost: true },
};

const mount = async (role: Role, shrink: (f: File) => Promise<ShrunkImage | null>) => {
  const stub = makeSqlStub();
  const tokens = await seedBusiness(stub);
  seedCatalog(stub);
  const net = browserFetch(harness(stub));
  net.jar.token = tokens[role];
  const state: CatalogRouteState = {
    kind: "catalog",
    locale: "bn",
    api: createCatalogApi(createHttpClient({ fetch: net.fetchImpl })),
    customerOrders: async () => ({ ok: true, status: 200, value: [] }),
    id: CATALOG_IDS.product,
    can: CAN[role],
    homeTo: "/orders",
    navigate: () => {},
    onSaved: () => {},
    duplicateOf: null,
    shrinkPhoto: shrink,
  };
  const view = render(renderCatalogScreen("product", state) as React.ReactElement);
  await waitFor(() => expect(view.getByTestId("product-photo-block")).toBeTruthy(), WAIT);
  return { view, stub, calls: net.calls };
};

const pick = async (input: HTMLElement): Promise<void> => {
  const file = new File(["raw"], "kurti.jpg", { type: "image/jpeg" });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
};

afterEach(() => cleanup());

describe("product photo block", () => {
  test("a Manager picks a photo: it is shrunk, sent, stored, and the image URL changes", async () => {
    const shrunk: string[] = [];
    const { view, stub, calls } = await mount("manager", async (f) => {
      shrunk.push(f.name);
      return SHRUNK_JPEG;
    });
    const img = view.getByTestId("product-photo") as HTMLImageElement;
    const before = img.getAttribute("src");
    expect(img.hidden).toBe(true);
    expect(view.getByTestId("product-photo-input")).toBeTruthy();
    await pick(view.getByTestId("product-photo-input"));
    await waitFor(() => expect(img.getAttribute("src")).not.toBe(before), WAIT);
    expect(shrunk).toEqual(["kurti.jpg"]);
    expect(calls.some((c) => c.method === "PATCH" && c.path.endsWith("/photo"))).toBe(true);
    const product = stub.state.products.find((p) => p["id"] === CATALOG_IDS.product);
    expect(product?.["photo_type"]).toBe("image/jpeg");
    // Once the image loads, "remove" appears; removing hides it again.
    fireEvent.load(img);
    expect(img.hidden).toBe(false);
    await act(async () => {
      fireEvent.click(view.getByTestId("product-photo-remove"));
    });
    await waitFor(() => expect(img.hidden).toBe(true), WAIT);
    expect(product?.["photo_file"]).toBeNull();
  });

  test("a file the shrinker cannot use says so and sends nothing", async () => {
    const { view, calls } = await mount("owner", async () => null);
    await pick(view.getByTestId("product-photo-input"));
    expect(view.getByTestId("product-photo-bad-file")).toBeTruthy();
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  test("a refused upload shows the refusal", async () => {
    const { view } = await mount("owner", async () => ({
      contentType: "image/jpeg",
      data: "iVBORw0KGgoAAAAA",
    }));
    await pick(view.getByTestId("product-photo-input"));
    await waitFor(() => expect(view.getByTestId("product-photo-failure")).toBeTruthy(), WAIT);
  });

  test("Sales Staff and the Accountant see the photo but no controls", async () => {
    for (const role of ["sales_staff", "accountant"] as const) {
      const { view } = await mount(role, async () => SHRUNK_JPEG);
      expect({ role, input: view.queryByTestId("product-photo-input") }).toEqual({
        role,
        input: null,
      });
      expect(view.getByTestId("product-photo")).toBeTruthy();
      cleanup();
    }
  });
});
