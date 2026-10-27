/**
 * src/pres/use-submit-guard.ts — the save guard every writing form uses (W3; BR6.1–BR6.3;
 * R8; NFR7.11; review D-08, F-05).
 *
 * `useSubmitGuard()` returns `{ state, submit, reset }`:
 *   - `submit(run)` does nothing while a save is in flight, so a double click or Enter
 *     pressed twice sends one request (BR6.1). The latch is a `useRef<boolean>` set
 *     SYNCHRONOUSLY, before the first `await`: React state is batched and would let a second
 *     call in the same tick through, so state only mirrors the latch for rendering (D-08);
 *   - `run` answers `true` for a saved write and `false` for a refused one; the guard moves
 *     idle → saving → saved | failed. A thrown error (a defect, not an outcome) also ends in
 *     `failed`, releases the latch and is rethrown, never swallowed;
 *   - nothing is ever resent by the guard (C1 client rules): after `failed` only a new
 *     submit by the person sends again;
 *   - `reset()` returns `saved` or `failed` to `idle` when the person edits a field (W3
 *     step 5). The guard never touches the form's values, so a failure keeps what was typed
 *     (BR6.3).
 * The form's submit control reads `state === "saving"` for `disabled` and `aria-busy`.
 */
import * as React from "react";

export type SubmitState = "idle" | "saving" | "saved" | "failed";

export interface SubmitGuard {
  readonly state: SubmitState;
  readonly submit: (run: () => Promise<boolean>) => Promise<void>;
  readonly reset: () => void;
}

export const useSubmitGuard = (): SubmitGuard => {
  const latch = React.useRef(false);
  const [state, setState] = React.useState<SubmitState>("idle");

  const submit = React.useCallback(async (run: () => Promise<boolean>): Promise<void> => {
    if (latch.current) return; // BR6.1: a submit while saving is ignored.
    latch.current = true;
    setState("saving");
    try {
      setState((await run()) ? "saved" : "failed");
    } catch (e: unknown) {
      setState("failed");
      throw e;
    } finally {
      latch.current = false;
    }
  }, []);

  const reset = React.useCallback((): void => {
    if (!latch.current) setState("idle");
  }, []);

  return { state, submit, reset };
};
