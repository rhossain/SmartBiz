/**
 * src/router/screens/Accept.tsx — accept an invitation, `/accept-invite` (U3 W2; BR3.4, BR9.3,
 * BR9.5; frontend-components "AcceptInviteScreen"; review D-02).
 *
 * Rewritten in place (it used to ask for the token in a text field). Props only: the
 * container (src/router/render-token-routes.tsx) took the token out of the address bar and
 * holds it; this screen asks for the new password twice and hands it to `onSubmit`. On
 * success the container signs the person in and opens the orders list (BR9.5).
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import { PasswordLinkScreen } from "./PasswordLinkScreen.js";

export interface AcceptProps {
  readonly hasToken: boolean;
  readonly onSubmit: (password: string) => Promise<ApiFailure | null>;
}

export const AcceptScreen = ({ hasToken, onSubmit }: AcceptProps): React.ReactElement => (
  <PasswordLinkScreen
    titleKey="auth.accept.title"
    submitKey="token.accept.submit"
    testId="accept"
    hasToken={hasToken}
    onSubmit={onSubmit}
  />
);
