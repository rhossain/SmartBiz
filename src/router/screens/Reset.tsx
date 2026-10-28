/**
 * src/router/screens/Reset.tsx — set a new password from a reset link, `/reset` (U3 W5;
 * BR3.4, BR9.3, BR9.5; frontend-components "ResetScreen"; review D-02).
 *
 * Rewritten in place (it used to ask for the token in a text field). Props only: the
 * container holds the token; this screen asks for the new password twice. On success the
 * container opens sign-in with "পাসওয়ার্ড বদলানো হয়েছে; নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন"; every
 * session of the person has ended (BR4.3, BR9.5).
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import { PasswordLinkScreen } from "./PasswordLinkScreen.js";

export interface ResetProps {
  readonly hasToken: boolean;
  readonly onSubmit: (password: string) => Promise<ApiFailure | null>;
}

export const ResetScreen = ({ hasToken, onSubmit }: ResetProps): React.ReactElement => (
  <PasswordLinkScreen
    titleKey="auth.reset.title"
    submitKey="token.reset.submit"
    testId="reset"
    hasToken={hasToken}
    onSubmit={onSubmit}
  />
);
