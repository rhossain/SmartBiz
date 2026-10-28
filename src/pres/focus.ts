/**
 * src/pres/focus.ts — move focus to what went wrong after a failed submit (NFR9.2; BR8.2).
 *
 * After a refused submit, keyboard and screen-reader users land on the problem instead of
 * hunting for it: the first input marked `aria-invalid="true"` (a field the server refused),
 * else the input next to the first field message, else the first `role="alert"` element (the
 * form-level message or the error banner, which are focusable with `tabIndex={-1}`).
 * `failure` changes identity on every failed submit, so each failure moves focus once.
 */
import * as React from "react";

export const focusFirstProblem = (root: HTMLElement | null): void => {
  if (root === null) return;
  const invalid = root.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (invalid) {
    invalid.focus();
    return;
  }
  const alert = root.querySelector<HTMLElement>('[role="alert"]');
  const input = alert?.closest("label")?.querySelector<HTMLElement>("input, textarea, select");
  (input ?? alert)?.focus();
};

export const useFocusOnFailure = (
  root: React.RefObject<HTMLElement | null>,
  failure: unknown,
): void => {
  React.useEffect(() => {
    if (failure !== null && failure !== undefined && failure !== false) {
      focusFirstProblem(root.current);
    }
  }, [root, failure]);
};
