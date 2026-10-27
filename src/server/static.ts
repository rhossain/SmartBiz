/**
 * src/server/static.ts — serving the built app from `dist/` (S6, P6; NFR5.4, NFR6.5; T13).
 *
 * Path-traversal defence, in order:
 *   1. only GET and HEAD; other methods get 405;
 *   2. on the raw, still-encoded path, refuse `%2f`, `%5c` and `%00` in any case (404);
 *   3. decode once (a malformed escape is 404); refuse `..`, `\`, NUL, any segment that
 *      starts with `.` (dotfiles such as `.env`), and source maps (`*.map`);
 *   4. resolve against the real path of `dist/` and `realpath` the target, so a symlink
 *      cannot lead outside: the result must start with `dist/` plus a separator;
 *   5. an existing file is sent with its content type; a path with no extension gets
 *      `index.html` (the single-page app's own routes); anything else is 404.
 * Hashed files under `assets/` are cached for a year (`immutable`); `index.html` never is,
 * so a new build is picked up at once. The security headers are added by the pipeline.
 */
import { existsSync, realpathSync, statSync } from "node:fs";
import { join, sep } from "node:path";

export type StaticHandler = (request: Request, rawPath: string) => Promise<Response>;

const notFound = (): Response => new Response("Not found", { status: 404 });

const ENCODED_BAD = /%2f|%5c|%00/i;

/** The decoded, safe relative path, or null when the request must be refused. */
export const safeRelativePath = (rawPath: string): string | null => {
  if (ENCODED_BAD.test(rawPath)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes("..") || decoded.includes("\\") || decoded.includes("\0")) return null;
  const segments = decoded.split("/").filter((s) => s.length > 0);
  if (segments.some((s) => s.startsWith("."))) return null;
  if (decoded.endsWith(".map")) return null;
  return segments.join("/");
};

const hasExtension = (relative: string): boolean => {
  const last = relative.split("/").pop() ?? "";
  return last.includes(".");
};

const sendFile = (path: string, method: string, cacheControl: string): Response => {
  const file = Bun.file(path);
  return new Response(method === "HEAD" ? null : file, {
    status: 200,
    headers: { "Content-Type": file.type, "Cache-Control": cacheControl },
  });
};

export const createStaticHandler = (distDir: string): StaticHandler => {
  const root = realpathSync(distDir);
  const inside = (path: string): boolean => path.startsWith(root + sep);

  return async (request, rawPath) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const relative = safeRelativePath(rawPath);
    if (relative === null) return notFound();
    const indexHtml = join(root, "index.html");
    const target = join(root, relative);
    if (relative !== "" && existsSync(target)) {
      const real = realpathSync(target);
      if (!inside(real) || !statSync(real).isFile()) return notFound();
      const immutable = relative.startsWith("assets/");
      return sendFile(
        real,
        request.method,
        immutable ? "public, max-age=31536000, immutable" : "no-store",
      );
    }
    if (relative === "" || !hasExtension(relative)) {
      return existsSync(indexHtml) ? sendFile(indexHtml, request.method, "no-store") : notFound();
    }
    return notFound();
  };
};
