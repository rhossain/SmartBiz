/**
 * src/pres/Lock.tsx — the role-lock landing screen (moved from src/router/screens/ by
 * domain-design follow-up R-02).
 *
 * Shown when a signed-in role lacks a route's capability (the router's /lock redirect, a
 * 403 from the server, or a mutating order screen reached by a read-only role). It lives in
 * PresentationComponent so feature screens can show it without importing the router
 * (BR7.4).
 */
import * as React from "react";
import { LockSheet } from "./LockSheet.js";

export const LockScreen = (): React.ReactElement => <LockSheet messageKey="lock.message" />;
