/**
 * tests/unit/submit-guard.test.tsx — the save guard (W3; BR6.1–BR6.3; R8; NFR7.11; D-08).
 *
 * Restated:
 *  - two submits in the same tick send ONE request (the latch is set before any await);
 *  - the state goes idle → saving → saved on success, idle → saving → failed on a refusal;
 *  - while saving the submit control is disabled and aria-busy; Enter or a second click is
 *    ignored;
 *  - a failure keeps every typed value, and an edit returns the guard to idle;
 *  - after a failure a NEW submit sends again (nothing is resent by itself);
 *  - a thrown error ends in failed, releases the latch and reaches the caller.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, renderHook } from "@testing-library/react";
import { useSubmitGuard } from "../../src/pres/use-submit-guard.js";

afterEach(() => cleanup());

/** A deferred answer the test resolves by hand. */
const deferred = () => {
  let resolve: (v: boolean) => void = () => undefined;
  const promise = new Promise<boolean>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const Form = ({ save }: { readonly save: (name: string) => Promise<boolean> }) => {
  const guard = useSubmitGuard();
  const [name, setName] = React.useState("");
  return (
    <form
      data-testid="form"
      onSubmit={(e) => {
        e.preventDefault();
        void guard.submit(() => save(name));
      }}
    >
      <input
        data-testid="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          guard.reset();
        }}
      />
      <button
        type="submit"
        data-testid="save"
        disabled={guard.state === "saving"}
        aria-busy={guard.state === "saving"}
      >
        save
      </button>
      <output data-testid="state">{guard.state}</output>
    </form>
  );
};

describe("useSubmitGuard", () => {
  test("two submit() calls in one tick send one request (D-08)", async () => {
    const { result } = renderHook(() => useSubmitGuard());
    let requests = 0;
    const pending = deferred();
    const run = async (): Promise<boolean> => {
      requests += 1;
      return pending.promise;
    };
    await act(async () => {
      const a = result.current.submit(run);
      const b = result.current.submit(run);
      pending.resolve(true);
      await Promise.all([a, b]);
    });
    expect(requests).toBe(1);
    expect(result.current.state).toBe("saved");
  });

  test("idle → saving → saved, and idle → saving → failed", async () => {
    const { result } = renderHook(() => useSubmitGuard());
    expect(result.current.state).toBe("idle");
    const pending = deferred();
    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current.submit(() => pending.promise);
    });
    expect(result.current.state).toBe("saving");
    await act(async () => {
      pending.resolve(false);
      await done;
    });
    expect(result.current.state).toBe("failed");
    act(() => result.current.reset());
    expect(result.current.state).toBe("idle");
    await act(async () => {
      await result.current.submit(async () => true);
    });
    expect(result.current.state).toBe("saved");
  });

  test("in a form: a double submit sends once, the control is busy, a failure keeps the field", async () => {
    const sent: string[] = [];
    const pending = deferred();
    const view = render(
      <Form
        save={(name) => {
          sent.push(name);
          return pending.promise;
        }}
      />,
    );
    fireEvent.change(view.getByTestId("name"), { target: { value: "রিনা" } });
    await act(async () => {
      fireEvent.submit(view.getByTestId("form"));
      fireEvent.submit(view.getByTestId("form"));
    });
    expect(sent).toEqual(["রিনা"]);
    const button = view.getByTestId("save") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    await act(async () => {
      pending.resolve(false);
    });
    expect(view.getByTestId("state").textContent).toBe("failed");
    expect((view.getByTestId("name") as HTMLInputElement).value).toBe("রিনা");
    expect(button.disabled).toBe(false);
    // An edit returns to idle; a new submit sends again — nothing was resent by itself.
    fireEvent.change(view.getByTestId("name"), { target: { value: "রিনা বেগম" } });
    expect(view.getByTestId("state").textContent).toBe("idle");
    expect(sent).toHaveLength(1);
  });

  test("a thrown error ends in failed, releases the latch and is not swallowed", async () => {
    const { result } = renderHook(() => useSubmitGuard());
    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.submit(async () => {
          throw new Error("boom");
        });
      } catch (e: unknown) {
        caught = e;
      }
    });
    expect(caught).toBeInstanceOf(Error);
    expect(result.current.state).toBe("failed");
    let again = 0;
    await act(async () => {
      await result.current.submit(async () => {
        again += 1;
        return true;
      });
    });
    expect(again).toBe(1);
    expect(result.current.state).toBe("saved");
  });

  test("reset while saving does nothing (the guard still owns the save)", async () => {
    const { result } = renderHook(() => useSubmitGuard());
    const pending = deferred();
    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current.submit(() => pending.promise);
    });
    act(() => result.current.reset());
    expect(result.current.state).toBe("saving");
    await act(async () => {
      pending.resolve(true);
      await done;
    });
    expect(result.current.state).toBe("saved");
  });
});
