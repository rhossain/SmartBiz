/**
 * tests/helpers/catalog-stub.ts — the in-memory SQL stub's handlers for U4's catalog
 * statements (src/catalog/*.ts), called by tests/helpers/sql-stub.ts.
 *
 * Each handler mirrors ONE query shape exactly (one parameter per `${}`) and emulates what
 * Postgres would do with it: BIGINT money as strings, TIMESTAMPTZ as Date, JSONB parsed,
 * `text[]` as arrays; `ILIKE … ESCAPE '\'` with `%` and `_` wildcards and `\` escapes; the
 * keyset cursor; `LIMIT`; and the constraints a write can trip — the case-insensitive SKU
 * index and the note-revision unique constraint (23505 with their constraint names), and the
 * composite (business_id, id) references (23503). app_role's missing privileges are mirrored
 * too: UPDATE on customer_notes and DELETE on any catalog table answer 42501.
 * Anything unrecognised falls through to the stub's fail-closed throw (team.md Testing
 * Posture). Row locks (`FOR UPDATE`) cannot be seen in memory; they are tested in
 * tests/realdb/catalog-paths.realdb.test.ts.
 */

type Row = Record<string, unknown>;

export interface CatalogState {
  suppliers: Row[];
  customers: Row[];
  customerNotes: Row[];
  products: Row[];
  variants: Row[];
  users: Row[];
}

const dbError = (message: string, code: string, constraint?: string): Error =>
  Object.assign(new Error(message), {
    code,
    ...(constraint !== undefined ? { constraint_name: constraint } : {}),
  });

const time = (v: unknown): number => (v instanceof Date ? v.getTime() : Date.parse(String(v)));
const byteCompare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** `LIKE` / `ILIKE` with `%`, `_` and backslash escapes, as Postgres reads the pattern. */
export const likeMatches = (value: string, pattern: string, insensitive: boolean): boolean => {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i] ?? "";
    if (c === "\\" && i + 1 < pattern.length) {
      re += (pattern[i + 1] ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i += 1;
    } else if (c === "%") re += "[\\s\\S]*";
    else if (c === "_") re += "[\\s\\S]";
    else re += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`, insensitive ? "iu" : "u").test(value);
};

/** Newest first on (created_at, id), after the cursor when there is one. */
const keyset = (rows: Row[], cursorAt: unknown, cursorId: unknown): Row[] =>
  rows
    .filter((r) => {
      if (cursorAt === null) return true;
      const c = Date.parse(String(cursorAt));
      const t = time(r["created_at"]);
      return t < c || (t === c && byteCompare(String(r["id"]), String(cursorId)) < 0);
    })
    .sort(
      (a, b) =>
        time(b["created_at"]) - time(a["created_at"]) ||
        byteCompare(String(b["id"]), String(a["id"])),
    );

const customerMatches = (c: Row, namePattern: unknown, phonePattern: unknown): boolean =>
  namePattern === null ||
  likeMatches(String(c["name"]), String(namePattern), true) ||
  (phonePattern !== null && likeMatches(String(c["phone"]), String(phonePattern), false));

const productMatches = (p: Row, pattern: unknown): boolean =>
  pattern === null ||
  likeMatches(String(p["name"]), String(pattern), true) ||
  likeMatches(String(p["sku"]), String(pattern), true);

const isLowRow = (v: Row): boolean => Number(v["stock"]) < Number(v["minimum_stock"]);

const sameValues = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const supplierRow = (state: CatalogState, businessId: unknown, id: unknown): Row | undefined =>
  id === null
    ? undefined
    : state.suppliers.find((s) => s["business_id"] === businessId && s["id"] === id);

const productRow = (state: CatalogState, businessId: unknown, id: unknown): Row | undefined =>
  state.products.find((p) => p["business_id"] === businessId && p["id"] === id);

const handleCustomers = (text: string, params: ReadonlyArray<unknown>, state: CatalogState) => {
  if (/INSERT INTO customers \(/i.test(text)) {
    const [id, businessId, name, phone, address, risk, createdBy, createdAt, updatedAt] = params;
    state.customers.push({
      id,
      business_id: businessId,
      name,
      phone,
      address,
      risk_level: Number(risk),
      created_by: createdBy,
      created_at: new Date(String(createdAt)),
      updated_at: new Date(String(updatedAt)),
    });
    return [];
  }
  if (
    /SELECT id, name FROM customers\s+WHERE business_id = \? AND phone = \? AND id <> \?\s+ORDER BY created_at, id\s+LIMIT 1/i.test(
      text,
    )
  ) {
    const [businessId, phone, id] = params;
    return state.customers
      .filter((c) => c["business_id"] === businessId && c["phone"] === phone && c["id"] !== id)
      .sort(
        (a, b) =>
          time(a["created_at"]) - time(b["created_at"]) ||
          byteCompare(String(a["id"]), String(b["id"])),
      )
      .slice(0, 1)
      .map((c) => ({ id: c["id"], name: c["name"] }));
  }
  if (
    /^\s*SELECT [\s\S]*?\bFROM customers WHERE id = \? AND business_id = \?(\s+FOR UPDATE)?\s*$/i.test(
      text,
    )
  ) {
    const [id, businessId] = params;
    return state.customers
      .filter((c) => c["id"] === id && c["business_id"] === businessId)
      .map((c) => ({ ...c }));
  }
  if (/UPDATE customers\s+SET name = \?, phone = \?, address = \?,\s+risk_level = \?/i.test(text)) {
    const [name, phone, address, risk, updatedAt, id, businessId] = params;
    for (const c of state.customers) {
      if (c["id"] !== id || c["business_id"] !== businessId) continue;
      Object.assign(c, {
        name,
        phone,
        address,
        risk_level: Number(risk),
        updated_at: new Date(String(updatedAt)),
      });
    }
    return [];
  }
  if (
    /FROM customers\s+WHERE business_id = \?\s+AND \(\?::text IS NULL OR name ILIKE \? ESCAPE '\\'\s+OR \(\?::text IS NOT NULL AND phone LIKE \?\)\)\s+AND \(\?::timestamptz IS NULL OR \(created_at, id\) < \(\?::timestamptz, \?::uuid\)\)\s+ORDER BY created_at DESC, id DESC\s+LIMIT \?/i.test(
      text,
    )
  ) {
    const [businessId, namePattern, , phonePattern, , cursorAt, , cursorId, limit] = params;
    const mine = state.customers.filter(
      (c) => c["business_id"] === businessId && customerMatches(c, namePattern, phonePattern),
    );
    return keyset(mine, cursorAt, cursorId)
      .slice(0, Number(limit))
      .map((c) => ({ ...c }));
  }
  if (
    /SELECT count\(\*\)::int AS total\s+FROM customers\s+WHERE business_id = \?\s+AND \(\?::text IS NULL OR name ILIKE \? ESCAPE '\\'\s+OR \(\?::text IS NOT NULL AND phone LIKE \?\)\)\s*$/i.test(
      text,
    )
  ) {
    const [businessId, namePattern, , phonePattern] = params;
    const total = state.customers.filter(
      (c) => c["business_id"] === businessId && customerMatches(c, namePattern, phonePattern),
    ).length;
    return [{ total }];
  }
  if (
    /SELECT id, name FROM customers\s+WHERE business_id = \? AND id = ANY\(\?::uuid\[\]\)/i.test(
      text,
    )
  ) {
    const [businessId, ids] = params as [string, string[]];
    return state.customers
      .filter((c) => c["business_id"] === businessId && ids.includes(String(c["id"])))
      .map((c) => ({ id: c["id"], name: c["name"] }));
  }
  return undefined;
};

const handleNotes = (text: string, params: ReadonlyArray<unknown>, state: CatalogState) => {
  if (/INSERT INTO customer_notes \(/i.test(text)) {
    const [id, businessId, customerId, noteText, revises, createdBy, createdAt] = params;
    const customer = state.customers.find(
      (c) => c["business_id"] === businessId && c["id"] === customerId,
    );
    if (!customer) throw dbError("foreign key violation", "23503", "customer_notes_customer_fkey");
    if (revises !== null) {
      const prior = state.customerNotes.find(
        (n) =>
          n["business_id"] === businessId && n["customer_id"] === customerId && n["id"] === revises,
      );
      if (!prior) throw dbError("foreign key violation", "23503", "customer_notes_revises_fkey");
      if (state.customerNotes.some((n) => n["revises_note_id"] === revises)) {
        throw dbError("duplicate key value", "23505", "customer_notes_revises_note_id_key");
      }
    }
    state.customerNotes.push({
      id,
      business_id: businessId,
      customer_id: customerId,
      text: noteText,
      revises_note_id: revises,
      created_by: createdBy,
      created_at: new Date(String(createdAt)),
    });
    return [];
  }
  if (
    /FROM customer_notes n\s+WHERE n\.id = \? AND n\.business_id = \? AND n\.customer_id = \?/i.test(
      text,
    )
  ) {
    const [id, businessId, customerId] = params;
    return state.customerNotes
      .filter(
        (n) => n["id"] === id && n["business_id"] === businessId && n["customer_id"] === customerId,
      )
      .map((n) => ({
        id: n["id"],
        revised: state.customerNotes.some((r) => r["revises_note_id"] === n["id"]),
      }));
  }
  if (
    /FROM customer_notes n\s+LEFT JOIN users u ON u\.id = n\.created_by\s+WHERE n\.business_id = \? AND n\.customer_id = \?\s+ORDER BY n\.created_at DESC, n\.id DESC\s+LIMIT \?/i.test(
      text,
    )
  ) {
    const [businessId, customerId, limit] = params;
    return keyset(
      state.customerNotes.filter(
        (n) => n["business_id"] === businessId && n["customer_id"] === customerId,
      ),
      null,
      null,
    )
      .slice(0, Number(limit))
      .map((n) => ({
        ...n,
        author_email: state.users.find((u) => u["id"] === n["created_by"])?.["email"] ?? null,
      }));
  }
  if (/^\s*SELECT email FROM users WHERE id = \? AND business_id = \?\s*$/i.test(text)) {
    const [id, businessId] = params;
    return state.users
      .filter((u) => u["id"] === id && u["business_id"] === businessId)
      .map((u) => ({ email: u["email"] }));
  }
  return undefined;
};

const handleSuppliers = (text: string, params: ReadonlyArray<unknown>, state: CatalogState) => {
  if (/INSERT INTO suppliers \(/i.test(text)) {
    const [id, businessId, name, phone, createdBy, createdAt, updatedAt] = params;
    state.suppliers.push({
      id,
      business_id: businessId,
      name,
      phone,
      created_by: createdBy,
      created_at: new Date(String(createdAt)),
      updated_at: new Date(String(updatedAt)),
    });
    return [];
  }
  if (
    /^\s*SELECT [\s\S]*?\bFROM suppliers WHERE id = \? AND business_id = \?(\s+FOR UPDATE)?\s*$/i.test(
      text,
    )
  ) {
    const [id, businessId] = params;
    return state.suppliers
      .filter((s) => s["id"] === id && s["business_id"] === businessId)
      .map((s) => ({ ...s }));
  }
  if (
    /^\s*SELECT count\(\*\)::int AS n FROM products WHERE business_id = \? AND default_supplier_id = \?\s*$/i.test(
      text,
    )
  ) {
    const [businessId, id] = params;
    const n = state.products.filter(
      (p) => p["business_id"] === businessId && p["default_supplier_id"] === id,
    ).length;
    return [{ n }];
  }
  if (/UPDATE suppliers SET name = \?, phone = \?, updated_at = \?/i.test(text)) {
    const [name, phone, updatedAt, id, businessId] = params;
    for (const s of state.suppliers) {
      if (s["id"] === id && s["business_id"] === businessId) {
        Object.assign(s, { name, phone, updated_at: new Date(String(updatedAt)) });
      }
    }
    return [];
  }
  if (
    /FROM suppliers s\s+WHERE s\.business_id = \?\s+ORDER BY lower\(s\.name\), s\.id\s+LIMIT \?/i.test(
      text,
    )
  ) {
    const [businessId, limit] = params;
    return state.suppliers
      .filter((s) => s["business_id"] === businessId)
      .sort(
        (a, b) =>
          byteCompare(String(a["name"]).toLowerCase(), String(b["name"]).toLowerCase()) ||
          byteCompare(String(a["id"]), String(b["id"])),
      )
      .slice(0, Number(limit))
      .map((s) => ({
        ...s,
        product_count: state.products.filter(
          (p) => p["business_id"] === s["business_id"] && p["default_supplier_id"] === s["id"],
        ).length,
      }));
  }
  return undefined;
};

const productRead = (state: CatalogState, p: Row): Row => {
  const s = supplierRow(state, p["business_id"], p["default_supplier_id"]);
  return {
    ...p,
    supplier_id: s?.["id"] ?? null,
    supplier_name: s?.["name"] ?? null,
    supplier_phone: s?.["phone"] ?? null,
  };
};

const handleProducts = (text: string, params: ReadonlyArray<unknown>, state: CatalogState) => {
  if (/INSERT INTO products \(/i.test(text)) {
    const [
      id,
      businessId,
      name,
      sku,
      category,
      price,
      cost,
      supplierId,
      axes,
      createdBy,
      createdAt,
      updatedAt,
    ] = params;
    const sameSku = state.products.some(
      (p) =>
        p["business_id"] === businessId &&
        String(p["sku"]).toLowerCase() === String(sku).toLowerCase(),
    );
    if (sameSku) throw dbError("duplicate key value", "23505", "products_business_sku_lower_key");
    if (supplierId !== null && supplierRow(state, businessId, supplierId) === undefined) {
      throw dbError("foreign key violation", "23503", "products_default_supplier_fkey");
    }
    state.products.push({
      id,
      business_id: businessId,
      name,
      sku,
      category,
      selling_price_paise: String(price),
      purchase_cost_paise: cost === null ? null : String(cost),
      default_supplier_id: supplierId,
      axes: JSON.parse(String(axes)),
      created_by: createdBy,
      created_at: new Date(String(createdAt)),
      updated_at: new Date(String(updatedAt)),
    });
    return [];
  }
  if (/INSERT INTO variants \(/i.test(text)) {
    const [businessId, productId, createdAt, , ids, v1, v2, suffixes, stocks, minimums] =
      params as [
        string,
        string,
        string,
        string,
        string[],
        string[],
        string[],
        string[],
        number[],
        number[],
      ];
    if (productRow(state, businessId, productId) === undefined) {
      throw dbError("foreign key violation", "23503", "variants_product_fkey");
    }
    ids.forEach((id, i) => {
      const values = [v1[i] ?? "", v2[i] ?? ""].filter((v) => v !== "");
      if (
        state.variants.some(
          (v) => v["product_id"] === productId && sameValues(v["axis_values"], values),
        )
      ) {
        throw dbError("duplicate key value", "23505", "variants_product_axis_values_key");
      }
      state.variants.push({
        id,
        business_id: businessId,
        product_id: productId,
        axis_values: values,
        sku_suffix: suffixes[i] ?? "",
        stock: Number(stocks[i]),
        minimum_stock: Number(minimums[i]),
        created_at: new Date(String(createdAt)),
        updated_at: new Date(String(createdAt)),
      });
    });
    return [];
  }
  if (
    /FROM products p\s+LEFT JOIN suppliers s ON s\.business_id = p\.business_id AND s\.id = p\.default_supplier_id\s+WHERE p\.id = \? AND p\.business_id = \?\s*$/i.test(
      text,
    )
  ) {
    const [id, businessId] = params;
    const p = productRow(state, businessId, id);
    return p === undefined ? [] : [productRead(state, p)];
  }
  if (
    /^\s*SELECT id, name, category, selling_price_paise, purchase_cost_paise, default_supplier_id\s+FROM products WHERE id = \? AND business_id = \?\s+FOR UPDATE\s*$/i.test(
      text,
    )
  ) {
    const [id, businessId] = params;
    const p = productRow(state, businessId, id);
    return p === undefined ? [] : [{ ...p }];
  }
  if (/UPDATE products\s+SET name = \?, category = \?,\s+selling_price_paise = \?/i.test(text)) {
    const [name, category, price, supplierId, updatedAt, id, businessId] = params;
    if (supplierId !== null && supplierRow(state, businessId, supplierId) === undefined) {
      throw dbError("foreign key violation", "23503", "products_default_supplier_fkey");
    }
    const p = productRow(state, businessId, id);
    if (p) {
      Object.assign(p, {
        name,
        category,
        selling_price_paise: String(price),
        default_supplier_id: supplierId,
        updated_at: new Date(String(updatedAt)),
      });
    }
    return [];
  }
  // U5 (BR8.1): the cost update moves updated_at with the cost.
  if (
    /^\s*UPDATE products SET purchase_cost_paise = \?, updated_at = \?\s+WHERE id = \? AND business_id = \?\s*$/i.test(
      text,
    )
  ) {
    const [cost, updatedAt, id, businessId] = params;
    const p = productRow(state, businessId, id);
    if (p) {
      p["purchase_cost_paise"] = String(cost);
      p["updated_at"] = new Date(String(updatedAt));
    }
    return [];
  }
  const listShape =
    /FROM products p\s+LEFT JOIN suppliers s ON s\.business_id = p\.business_id AND s\.id = p\.default_supplier_id\s+WHERE p\.business_id = \?\s+AND \(\?::text IS NULL OR p\.name ILIKE \? ESCAPE '\\' OR p\.sku ILIKE \? ESCAPE '\\'\)\s+AND \(\?::timestamptz IS NULL OR \(p\.created_at, p\.id\) < \(\?::timestamptz, \?::uuid\)\)\s+ORDER BY p\.created_at DESC, p\.id DESC\s+LIMIT \?/i;
  if (listShape.test(text)) {
    const [businessId, pattern, , , cursorAt, , cursorId, limit] = params;
    const mine = state.products.filter(
      (p) => p["business_id"] === businessId && productMatches(p, pattern),
    );
    return keyset(mine, cursorAt, cursorId)
      .slice(0, Number(limit))
      .map((p) => productRead(state, p));
  }
  if (
    /SELECT count\(\*\)::int AS total\s+FROM products p\s+WHERE p\.business_id = \?\s+AND \(\?::text IS NULL OR p\.name ILIKE \? ESCAPE '\\' OR p\.sku ILIKE \? ESCAPE '\\'\)\s*$/i.test(
      text,
    )
  ) {
    const [businessId, pattern] = params;
    const total = state.products.filter(
      (p) => p["business_id"] === businessId && productMatches(p, pattern),
    ).length;
    return [{ total }];
  }
  return undefined;
};

const variantWithProduct = (state: CatalogState, v: Row): Row => {
  const p = productRow(state, v["business_id"], v["product_id"]);
  return {
    ...v,
    sku: p?.["sku"],
    product_name: p?.["name"],
    selling_price_paise: p?.["selling_price_paise"],
  };
};

const handleVariants = (text: string, params: ReadonlyArray<unknown>, state: CatalogState) => {
  if (
    /^\s*SELECT id, axis_values, sku_suffix, stock, minimum_stock\s+FROM variants WHERE business_id = \? AND product_id = \?\s*$/i.test(
      text,
    )
  ) {
    const [businessId, productId] = params;
    return state.variants
      .filter((v) => v["business_id"] === businessId && v["product_id"] === productId)
      .map((v) => ({ ...v, axis_values: [...(v["axis_values"] as string[])] }));
  }
  if (
    /FROM variants v\s+JOIN products p ON p\.business_id = v\.business_id AND p\.id = v\.product_id\s+WHERE v\.id = \? AND v\.business_id = \?/i.test(
      text,
    )
  ) {
    const [id, businessId] = params;
    return state.variants
      .filter((v) => v["id"] === id && v["business_id"] === businessId)
      .map((v) => variantWithProduct(state, v));
  }
  if (
    /FROM variants v\s+JOIN products p ON p\.business_id = v\.business_id AND p\.id = v\.product_id\s+WHERE v\.business_id = \? AND v\.id = ANY\(\?::uuid\[\]\)/i.test(
      text,
    )
  ) {
    const [businessId, ids] = params as [string, string[]];
    return state.variants
      .filter((v) => v["business_id"] === businessId && ids.includes(String(v["id"])))
      .map((v) => variantWithProduct(state, v));
  }
  if (/UPDATE variants SET stock = \?, minimum_stock = \?, updated_at = \?/i.test(text)) {
    const [stock, minimum, updatedAt, id, businessId] = params;
    for (const v of state.variants) {
      if (v["id"] === id && v["business_id"] === businessId) {
        Object.assign(v, {
          stock: Number(stock),
          minimum_stock: Number(minimum),
          updated_at: new Date(String(updatedAt)),
        });
      }
    }
    return [];
  }
  if (
    /FROM variants\s+WHERE business_id = \? AND product_id = ANY\(\?::uuid\[\]\)\s+GROUP BY product_id/i.test(
      text,
    )
  ) {
    const [businessId, ids] = params as [string, string[]];
    return ids.flatMap((productId) => {
      const mine = state.variants.filter(
        (v) => v["business_id"] === businessId && v["product_id"] === productId,
      );
      if (mine.length === 0) return [];
      return [
        {
          product_id: productId,
          variant_count: mine.length,
          total_stock: mine.reduce((sum, v) => sum + Number(v["stock"]), 0),
          low_count: mine.filter(isLowRow).length,
        },
      ];
    });
  }
  if (
    /WHERE v\.business_id = \? AND v\.stock < v\.minimum_stock\s+ORDER BY lower\(p\.name\), p\.id, v\.axis_values\s+LIMIT \?/i.test(
      text,
    )
  ) {
    const [businessId, limit] = params;
    return state.variants
      .filter((v) => v["business_id"] === businessId && isLowRow(v))
      .map((v) => {
        const p = productRow(state, v["business_id"], v["product_id"]) ?? {};
        const s = supplierRow(state, v["business_id"], p["default_supplier_id"] ?? null);
        return {
          variant_id: v["id"],
          product_id: v["product_id"],
          product_name: p["name"],
          sku: p["sku"],
          axis_values: v["axis_values"],
          sku_suffix: v["sku_suffix"],
          stock: v["stock"],
          minimum_stock: v["minimum_stock"],
          supplier_id: s?.["id"] ?? null,
          supplier_name: s?.["name"] ?? null,
          supplier_phone: s?.["phone"] ?? null,
        };
      })
      .sort(
        (a, b) =>
          byteCompare(String(a.product_name).toLowerCase(), String(b.product_name).toLowerCase()) ||
          byteCompare(String(a.product_id), String(b.product_id)) ||
          byteCompare(JSON.stringify(a.axis_values), JSON.stringify(b.axis_values)),
      )
      .slice(0, Number(limit));
  }
  return undefined;
};

/**
 * U5 (P26, P28a): the match index — one business's products ordered by name then id, each with
 * its variants ordered by axis values, whole products up to the cap on a running variant
 * count, the first product always; every row carries the business's total variant count.
 * The business filter is read from the SQL TEXT (`p.business_id = ?` and
 * `v.business_id = ?`), so a change that drops either one shows in the unit tests too.
 */
const handleMatchIndex = (
  text: string,
  params: ReadonlyArray<unknown>,
  state: CatalogState,
): Row[] | undefined => {
  if (!/^\s*WITH counted AS \([\s\S]*FROM running r\s+JOIN variants v/i.test(text))
    return undefined;
  const scoped = /WHERE p\.business_id = \?/.test(text);
  const variantsScoped = /JOIN variants v ON v\.business_id = \? AND v\.product_id = r\.id/.test(
    text,
  );
  if (params.length !== (scoped ? 1 : 0) + (variantsScoped ? 1 : 0) + 1) {
    throw new Error("sql-stub: the match-index statement's parameters changed shape");
  }
  const businessId = scoped ? params[0] : null;
  const cap = Number(params[params.length - 1]);
  const variantsOf = (p: Row): Row[] =>
    state.variants
      .filter(
        (v) =>
          v["product_id"] === p["id"] &&
          v["business_id"] === p["business_id"] &&
          (!variantsScoped || v["business_id"] === businessId),
      )
      .sort((a, b) =>
        byteCompare(JSON.stringify(a["axis_values"]), JSON.stringify(b["axis_values"])),
      );
  const products = state.products
    .filter((p) => businessId === null || p["business_id"] === businessId)
    .filter((p) => variantsOf(p).length > 0)
    .sort(
      (a, b) =>
        byteCompare(String(a["name"]), String(b["name"])) ||
        byteCompare(String(a["id"]), String(b["id"])),
    );
  const total = products.reduce((sum, p) => sum + variantsOf(p).length, 0);
  let upto = 0;
  return products.flatMap((p, i) => {
    upto += variantsOf(p).length;
    if (upto > cap && i > 0) return [];
    return variantsOf(p).map((v) => ({
      product_id: p["id"],
      name: p["name"],
      sku: p["sku"],
      axes: p["axes"],
      total: String(total),
      variant_id: v["id"],
      axis_values: [...(v["axis_values"] as string[])],
    }));
  });
};

/** The catalog statements; `undefined` when the text is not one of them. */
export const handleCatalog = (
  text: string,
  params: ReadonlyArray<unknown>,
  state: CatalogState,
): Row[] | undefined => {
  // app_role's grants (0018–0022): notes are insert-only, and no catalog row is deleted.
  if (/UPDATE\s+customer_notes\b/i.test(text)) {
    throw dbError("permission denied for table customer_notes", "42501");
  }
  if (
    /(DELETE\s+FROM|TRUNCATE)\s+(customers|customer_notes|products|variants|suppliers)\b/i.test(
      text,
    )
  ) {
    throw dbError("permission denied for a catalog table", "42501");
  }
  return (
    handleMatchIndex(text, params, state) ??
    handleCustomers(text, params, state) ??
    handleNotes(text, params, state) ??
    handleSuppliers(text, params, state) ??
    handleProducts(text, params, state) ??
    handleVariants(text, params, state)
  );
};
