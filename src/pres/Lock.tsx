/**
 * src/pres/Lock.tsx — the role-lock landing screen (moved from src/router/screens/ by
 * domain-design follow-up R-02; U2 BR4.1, BR4.2).
 *
 * Shown when a signed-in role lacks a route's capability (the router's /lock redirect, a
 * 403 from the server inside the screen that asked, or a mutating order screen reached by a
 * read-only role). It lives in PresentationComponent so feature screens can show it without
 * importing the router (BR7.4). U2: it names the missing feature and links home when the
 * caller knows them (App passes the route's feature and the role's first screen).
 */
import * as React from "react";
import { LockSheet } from "./LockSheet.js";

export interface LockScreenProps {
  readonly feature?: string | null;
  readonly homeTo?: string | null;
}

export const LockScreen = ({
  feature = null,
  homeTo = null,
}: LockScreenProps = {}): React.ReactElement => (
  <LockSheet messageKey="lock.message" feature={feature} homeTo={homeTo} />
);
