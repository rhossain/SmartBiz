/**
 * src/server/config.ts — start-up configuration, failing fast (W1; BR1.1, BR1.3; NFR2.3,
 * NFR7.4).
 *
 * The server reads two variables: `PORT` (default 3000; an integer 1–65535) and
 * `DATABASE_URL` (the `smartbiz_app` login's postgres URL). It refuses to start when
 * `MIGRATE_DATABASE_URL` is present in its own environment: the admin URL belongs to the
 * migration runner only, and a server that can see it can be pointed at it by mistake.
 * The bind host is not configuration at all — it is the constant 127.0.0.1 (BR1.1, S9).
 * Every refusal is one line naming the variable; the URL's password is never printed.
 */
import { err, ok, type Result } from "../data/result.js";

export const BIND_HOST = "127.0.0.1";
export const DEFAULT_PORT = 3000;

export interface ServerConfig {
  readonly port: number;
  readonly databaseUrl: string;
}

export const readConfig = (
  env: Readonly<Record<string, string | undefined>>,
): Result<ServerConfig, string> => {
  if (env["MIGRATE_DATABASE_URL"] !== undefined) {
    return err("MIGRATE_DATABASE_URL must not be set for the server (it is the admin URL)");
  }
  const rawPort = env["PORT"] ?? String(DEFAULT_PORT);
  const port = /^\d{1,5}$/.test(rawPort) ? Number(rawPort) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return err("PORT must be an integer from 1 to 65535");
  }
  const databaseUrl = env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl === "") return err("DATABASE_URL is not set");
  let protocol = "";
  try {
    protocol = new URL(databaseUrl).protocol;
  } catch {
    return err("DATABASE_URL is not a valid URL");
  }
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    return err("DATABASE_URL must be a postgres:// URL");
  }
  return ok({ port, databaseUrl });
};

/** The one origin and host the server accepts (S7). */
export const expectedOrigin = (port: number): string => `http://${BIND_HOST}:${port}`;
export const expectedHost = (port: number): string => `${BIND_HOST}:${port}`;
