/**
 * Coverage booster — render each pres primitive.
 */
import { describe, expect, test } from "bun:test";
import * as React from "react";
import { render, cleanup } from "@testing-library/react";
import { Screen } from "../../src/pres/Screen.js";
import { Field } from "../../src/pres/Field.js";
import { Pill } from "../../src/pres/Pill.js";
import { BasisPill } from "../../src/pres/BasisPill.js";
import { CompletenessControl } from "../../src/pres/CompletenessControl.js";
import { Toast } from "../../src/pres/Toast.js";
import { Shell } from "../../src/pres/Shell.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import type { Locale } from "../../src/auth/types.js";

describe("pres primitives", () => {
  test("Screen renders title + children", () => {
    const { container } = render(<Screen title="Hello"><span>child</span></Screen>);
    expect(container.querySelector('[data-testid="screen-title"]')?.textContent).toBe("Hello");
    expect(container.textContent).toContain("child");
    cleanup();
  });

  test("Field emits input + label", () => {
    const { container } = render(<Field label="Email" name="email" value="x" onChange={() => {}} />);
    expect(container.querySelector("input")).not.toBeNull();
    expect(container.querySelector("label")?.textContent).toBe("Email");
    cleanup();
  });

  test("Pill renders label + kind", () => {
    const { container } = render(<Pill kind="danger" label="warn" />);
    expect(container.querySelector('[data-testid="pill"]')?.getAttribute("data-kind")).toBe("danger");
    cleanup();
  });

  test("BasisPill renders earned + realized", () => {
    const { container: a } = render(<BasisPill basis="earned" />);
    const { container: b } = render(<BasisPill basis="realized" />);
    expect(a.textContent).toContain("earned");
    expect(b.textContent).toContain("realized");
    cleanup();
  });

  test("CompletenessControl renders each value", () => {
    const { container: c1 } = render(<CompletenessControl completeness="complete" />);
    const { container: c2 } = render(<CompletenessControl completeness="partial" />);
    const { container: c3 } = render(<CompletenessControl completeness="unknown" />);
    expect(c1.textContent).toBe("complete");
    expect(c2.textContent).toBe("partial");
    expect(c3.textContent).toBe("unknown");
    cleanup();
  });

  test("Toast renders message + tone", () => {
    const { container } = render(<Toast message="hi" tone="warn" />);
    expect(container.querySelector('[data-testid="toast"]')?.getAttribute("data-tone")).toBe("warn");
    cleanup();
  });

  test("Shell renders chrome", () => {
    setLocale("bn");
    const { container } = render(<Shell locale={"bn" as Locale} onLocaleChange={() => {}} />);
    expect(container.querySelector('[data-testid="shell"]')).not.toBeNull();
    cleanup();
  });
});