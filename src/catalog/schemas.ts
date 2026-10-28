/**
 * src/catalog/schemas.ts — the C7 request and response schemas, shared by the server's
 * catalog handlers and src/client/catalog-api.ts (contract ownership rule 2; U4 functional
 * spec §3a, §5 D1–D13; BR3.1, BR4.1, BR6.1, BR6.3, BR6.7, BR7.1, BR8.1, BR9.1; S32, SC9).
 *
 * Requests are `.strict()` at every level, so an unknown key — a smuggled `businessId`, or
 * `sku`, `axes` or `purchaseCostPaise` on a product edit (BR6.7) — is a 400 naming that key:
 *   - text is trimmed and length-checked here (names ≤ 120, address ≤ 300, note ≤ 2 000,
 *     category ≤ 60, axis names and values ≤ 30, `q` ≤ 100, S32); the phone's FORM and the
 *     axes' and variants' shape are domain rules (rules/phone.ts, rules/product-shape.ts),
 *     answered with `invalid_input` naming the field, so the browser can run them too;
 *   - ids in paths and bodies are plain strings (D13, BR11.2): a non-UUID id must answer 404
 *     like a missing one, never a 400 from `z.uuid()` that would tell the two apart;
 *   - money is whole paise 0–1 000 000 000, stock and minimum whole numbers 0–1 000 000;
 *   - edits are partial and need at least one field (BR3.1, BR6.7, BR7.1; D5, D10);
 *     `address: null`, `category: null` and `defaultSupplierId: null` clear the value;
 *   - list queries arrive as strings: `limit` is 1–50 (C1 paging), `cursor` is opaque.
 * Responses are not strict (C1 client rules: an added field is dropped, not refused). A
 * product body has `purchaseCostPaise` only for a cost reader (BR9.2, D4), so the key is
 * optional here and the server decides. Browser-safe: zod and the shared kernel only.
 */
import { z } from "zod";
import type { FieldIssue } from "../data/error-kinds.js";
import {
  MAX_AXES,
  MAX_AXIS_TEXT,
  MAX_AXIS_VALUES,
  MAX_STOCK,
  MAX_VARIANTS,
} from "./rules/product-shape.js";
import { MAX_QUERY_LENGTH } from "./rules/phone.js";

export const MAX_NAME = 120;
export const MAX_ADDRESS = 300;
export const MAX_NOTE = 2_000;
export const MAX_CATEGORY = 60;
export const MAX_PAISE = 1_000_000_000;
export const SKU_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;

const Name = z.string().trim().min(1).max(MAX_NAME);
const Phone = z.string().min(1).max(40);
const Paise = z.number().int().min(0).max(MAX_PAISE);
const Count = z.number().int().min(0).max(MAX_STOCK);
const IdText = z.string().min(1).max(100);
const Risk = z.number().int().min(0).max(3);
const Address = z.string().trim().max(MAX_ADDRESS).nullable();
const Category = z.string().trim().max(MAX_CATEGORY).nullable();
const NoteText = z.string().trim().min(1).max(MAX_NOTE);
const AxisText = z.string().trim().min(1).max(MAX_AXIS_TEXT);

const atLeastOne = (value: object): boolean => Object.keys(value).length > 0;
const NOTHING = { message: "send at least one field" };

/* ------------------------------------------------------------------ requests */

export const IdParamsSchema = z.object({ id: IdText }).strict();
export type IdParams = z.infer<typeof IdParamsSchema>;

export const ListQuerySchema = z
  .object({
    q: z.string().max(MAX_QUERY_LENGTH).optional(),
    cursor: z.string().min(1).max(200).optional(),
    limit: z
      .string()
      .regex(/^\d{1,2}$/, "limit must be a whole number")
      .transform(Number)
      .pipe(z.number().int().min(1).max(50))
      .optional(),
  })
  .strict();
export type ListQuery = z.infer<typeof ListQuerySchema>;

/**
 * The same list filter as the domain functions take it, after the HTTP query has been parsed
 * (`limit` is a number here). The list functions validate with this one, so a direct caller
 * (a test, a script, U5) is checked the same way.
 */
export const ListFilterSchema = z
  .object({
    q: z.string().max(MAX_QUERY_LENGTH).optional(),
    cursor: z.string().min(1).max(200).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();
export type ListFilter = z.infer<typeof ListFilterSchema>;

export const CustomerCreateSchema = z
  .object({
    name: Name,
    phone: Phone,
    address: Address.optional(),
    riskLevel: Risk.optional(),
    note: NoteText.optional(),
  })
  .strict();
export type CustomerCreate = z.infer<typeof CustomerCreateSchema>;

export const CustomerUpdateSchema = z
  .object({
    name: Name.optional(),
    phone: Phone.optional(),
    address: Address.optional(),
    riskLevel: Risk.optional(),
  })
  .strict()
  .refine(atLeastOne, NOTHING);
export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>;

export const NoteCreateSchema = z
  .object({ text: NoteText, revisesNoteId: IdText.nullable().optional() })
  .strict();
export type NoteCreate = z.infer<typeof NoteCreateSchema>;

export const SupplierCreateSchema = z.object({ name: Name, phone: Phone }).strict();
export type SupplierCreate = z.infer<typeof SupplierCreateSchema>;

export const SupplierUpdateSchema = z
  .object({ name: Name.optional(), phone: Phone.optional() })
  .strict()
  .refine(atLeastOne, NOTHING);
export type SupplierUpdate = z.infer<typeof SupplierUpdateSchema>;

export const AxisSchema = z
  .object({
    name: AxisText,
    values: z
      .array(AxisText.refine((v) => !v.includes("-"), "a value may not contain '-'"))
      .min(1)
      .max(MAX_AXIS_VALUES),
  })
  .strict();

export const VariantCreateSchema = z
  .object({
    axisValues: z.array(AxisText).max(MAX_AXES),
    stock: Count,
    minimumStock: Count,
  })
  .strict();

export const ProductCreateSchema = z
  .object({
    name: Name,
    sku: z.string().regex(SKU_PATTERN, "1-40 letters, digits, '-', '_' or '.'"),
    category: Category.optional(),
    sellingPricePaise: Paise,
    purchaseCostPaise: Paise.nullable().optional(),
    defaultSupplierId: IdText.nullable().optional(),
    axes: z.array(AxisSchema).max(MAX_AXES),
    variants: z.array(VariantCreateSchema).min(1).max(MAX_VARIANTS),
  })
  .strict();
export type ProductCreate = z.infer<typeof ProductCreateSchema>;

/** BR6.7: SKU, axes, variants and cost are not editable here; sending one is an unknown key. */
export const ProductUpdateSchema = z
  .object({
    name: Name.optional(),
    category: Category.optional(),
    sellingPricePaise: Paise.optional(),
    defaultSupplierId: IdText.nullable().optional(),
  })
  .strict()
  .refine(atLeastOne, NOTHING);
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;

/** BR9.1: exactly the cost. */
export const CostSetSchema = z.object({ purchaseCostPaise: Paise }).strict();
export type CostSet = z.infer<typeof CostSetSchema>;

/** BR7.1: absolute values; at least one of the two. */
export const StockSetSchema = z
  .object({ stock: Count.optional(), minimumStock: Count.optional() })
  .strict()
  .refine(atLeastOne, NOTHING);
export type StockSet = z.infer<typeof StockSetSchema>;

/** zod issues as C1 field paths (the domain's own copy of the pipeline's mapping). */
export const fieldIssues = (e: z.ZodError): FieldIssue[] =>
  e.issues.flatMap((issue) =>
    issue.code === "unrecognized_keys"
      ? issue.keys.map((key) => ({
          path: [...issue.path.map(String), key].join("."),
          message: "unknown field",
        }))
      : [{ path: issue.path.map(String).join("."), message: issue.message }],
  );

/* ------------------------------------------------------------------ responses */

const RiskOut = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  address: z.string().nullable(),
  riskLevel: RiskOut,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CustomerRowSchema = CustomerSchema.omit({ updatedAt: true });

export const CustomerListResponseSchema = z.object({
  customers: z.array(CustomerRowSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int(),
});
export type CustomerListResponse = z.infer<typeof CustomerListResponseSchema>;

export const NoteSchema = z.object({
  id: z.string(),
  text: z.string(),
  revisesNoteId: z.string().nullable(),
  createdAt: z.string(),
  authorName: z.string().nullable(),
});
export type NoteResponse = z.infer<typeof NoteSchema>;

export const CustomerDetailResponseSchema = CustomerSchema.extend({
  notes: z.array(NoteSchema),
  notesTruncated: z.boolean(),
});
export type CustomerDetailResponse = z.infer<typeof CustomerDetailResponseSchema>;

export const CustomerWriteResponseSchema = z.object({
  customer: CustomerSchema,
  duplicatePhoneOf: z.object({ id: z.string(), name: z.string() }).nullable(),
});
export type CustomerWriteResponse = z.infer<typeof CustomerWriteResponseSchema>;

export const NoteWriteResponseSchema = z.object({ note: NoteSchema });
export type NoteWriteResponse = z.infer<typeof NoteWriteResponseSchema>;

export const SupplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  productCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SupplierResponse = z.infer<typeof SupplierSchema>;

export const SupplierListResponseSchema = z.object({
  suppliers: z.array(SupplierSchema),
  truncated: z.boolean(),
});
export type SupplierListResponse = z.infer<typeof SupplierListResponseSchema>;

export const SupplierWriteResponseSchema = z.object({ supplier: SupplierSchema });
export type SupplierWriteResponse = z.infer<typeof SupplierWriteResponseSchema>;

const SupplierRefSchema = z.object({ id: z.string(), name: z.string(), phone: z.string() });

export const VariantSchema = z.object({
  id: z.string(),
  axisValues: z.array(z.string()),
  skuSuffix: z.string(),
  fullSku: z.string(),
  stock: z.number().int(),
  minimumStock: z.number().int(),
  low: z.boolean(),
});
export type VariantResponse = z.infer<typeof VariantSchema>;

export const VariantWriteResponseSchema = z.object({ variant: VariantSchema });
export type VariantWriteResponse = z.infer<typeof VariantWriteResponseSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  category: z.string().nullable(),
  sellingPricePaise: z.number().int(),
  purchaseCostPaise: z.number().int().nullable().optional(),
  axes: z.array(z.object({ name: z.string(), values: z.array(z.string()) })),
  variants: z.array(VariantSchema),
  defaultSupplier: SupplierRefSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProductResponse = z.infer<typeof ProductSchema>;

export const ProductWriteResponseSchema = z.object({ product: ProductSchema });
export type ProductWriteResponse = z.infer<typeof ProductWriteResponseSchema>;

export const ProductSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  category: z.string().nullable(),
  sellingPricePaise: z.number().int(),
  purchaseCostPaise: z.number().int().nullable().optional(),
  variantCount: z.number().int(),
  totalStock: z.number().int(),
  lowCount: z.number().int(),
  defaultSupplier: z.object({ id: z.string(), name: z.string() }).nullable(),
});
export type ProductSummaryResponse = z.infer<typeof ProductSummarySchema>;

export const ProductListResponseSchema = z.object({
  products: z.array(ProductSummarySchema),
  nextCursor: z.string().nullable(),
  total: z.number().int(),
});
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;

export const LowStockResponseSchema = z.object({
  variants: z.array(
    z.object({
      variantId: z.string(),
      productId: z.string(),
      productName: z.string(),
      axisValues: z.array(z.string()),
      fullSku: z.string(),
      stock: z.number().int(),
      minimumStock: z.number().int(),
      supplier: SupplierRefSchema.nullable(),
    }),
  ),
  truncated: z.boolean(),
});
export type LowStockResponse = z.infer<typeof LowStockResponseSchema>;
