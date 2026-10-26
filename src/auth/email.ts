/**
 * src/auth/email.ts — free-tier email gateway wrapper.
 * Per the infrastructure design, the free-tier envelope is
 * preserved by a graceful-degradation path: when the gateway
 * returns `SmtpError`, the invitation flow shows a "copy this
 * URL" UI (Plan §7 + integration test).
 */
import { err, ok, type Result } from "../types/result.js";
import { warn } from "../observability/log.js";

export type SmtpError = { readonly kind: "smtp_failure"; readonly reason: string };

export interface EmailGateway {
  readonly send: (to: string, subject: string, body: string) => Promise<Result<true, SmtpError>>;
}

export const noopEmailGateway: EmailGateway = {
  send: async (_to: string, _subject: string, _body: string) => ok(true),
};

export const failingEmailGateway: EmailGateway = {
  send: async () => err({ kind: "smtp_failure", reason: "free-tier gateway unavailable" }),
};

export const sendInviteEmail = async (
  gw: EmailGateway,
  to: string,
  acceptUrl: string,
): Promise<Result<true, SmtpError>> => {
  const r = await gw.send(to, "You're invited to SmartBiz", `Open this link to accept: ${acceptUrl}`);
  if (!r.ok) {
    warn("email_gateway_failure", { to: to.replace(/@.*/, "@…"), reason: r.error.reason });
  }
  return r;
};
