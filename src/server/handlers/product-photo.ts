/**
 * src/server/handlers/product-photo.ts — product photos.
 *
 *   GET   /api/products/:id/photo?v=…  → 200 the image bytes     every role (business.view)
 *   PATCH /api/products/:id/photo      → 200 { photoUpdatedAt }   Owner, Manager (catalog managers)
 *
 * The PATCH body is JSON (`{ photo: { contentType, data } | null }`), so the Origin and JSON
 * checks for writes apply unchanged; it is the one route whose body may reach 1 MiB
 * (`maxBodyBytes`). `v` only changes the URL when the photo changes; it is ignored here. The
 * business id and role come from the session. A product with no photo is 404.
 */
import { CATALOG_MANAGE, CATALOG_READ } from "../../catalog/catalog-capability.js";
import {
  getProductPhoto,
  memoryPhotoStore,
  PhotoPatchSchema,
  PhotoQuerySchema,
  setProductPhoto,
  type PhotoError,
  type PhotoPatch,
} from "../../catalog/product-photo.js";
import { IdParamsSchema } from "../../catalog/schemas.js";
import { MAX_UPLOAD_BYTES } from "../limits.js";
import { defineRoute, type HandlerResult, type ServerDeps } from "../types.js";

type None = Record<string, never>;

// The API-only harness and tests run without a disk store; they share one in-memory store.
const fallback = memoryPhotoStore();
const storeOf = (deps: ServerDeps) => deps.photos ?? fallback;

const failure = (e: PhotoError): HandlerResult =>
  e.kind === "invalid_input"
    ? { kind: "error", error: "invalid_input", fields: e.fields }
    : { kind: "error", error: e.kind };

export const productPhotoRoute = defineRoute<
  { readonly id: string },
  { readonly v?: string | undefined },
  undefined
>({
  method: "GET",
  path: "/api/products/:id/photo",
  access: CATALOG_READ,
  schemas: { params: IdParamsSchema, query: PhotoQuerySchema },
  handler: async (ctx, deps) => {
    const s = ctx.session;
    if (s === null) return { kind: "error", error: "unauthenticated" };
    const r = await getProductPhoto(
      deps.sql,
      { businessId: s.businessId, actorUserId: s.userId, role: s.role },
      ctx.params.id,
      storeOf(deps),
    );
    return r.ok
      ? { kind: "bytes", status: 200, body: r.value.bytes, contentType: r.value.type }
      : failure(r.error);
  },
});

export const productPhotoSetRoute = defineRoute<{ readonly id: string }, None, PhotoPatch>({
  method: "PATCH",
  path: "/api/products/:id/photo",
  access: CATALOG_MANAGE,
  schemas: { params: IdParamsSchema, body: PhotoPatchSchema },
  maxBodyBytes: MAX_UPLOAD_BYTES,
  handler: async (ctx, deps) => {
    const s = ctx.session;
    if (s === null) return { kind: "error", error: "unauthenticated" };
    const r = await setProductPhoto(
      deps.sql,
      {
        businessId: s.businessId,
        actorUserId: s.userId,
        role: s.role,
        correlationId: ctx.correlationId,
      },
      ctx.params.id,
      ctx.body,
      storeOf(deps),
    );
    return r.ok ? { kind: "ok", status: 200, body: r.value } : failure(r.error);
  },
});
