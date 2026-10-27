/**
 * tests/unit/stylesheet.test.ts — the stylesheet rules (BR9.1, BR9.3; P14; NFR9.6, NFR9.7,
 * NFR9.9; review N-02, D-10).
 *
 * Restated from D-10 and P14, over every `.css` file under `src/`:
 *  - no literal colour outside tokens.css: no `#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()` or
 *    named CSS colour in a declaration value; `transparent`, `currentColor` and `inherit` are
 *    allowed;
 *  - no `width` or `min-width` above 360 px in any block, `@media` blocks included, outside a
 *    selector containing `.scroll-x` (so nothing forces sideways scroll at 360 px);
 *  - one `:focus-visible` rule covers button, input, select, textarea, a and [tabindex], and
 *    takes its outline from the `--focus-ring-outline` token (BR9.3).
 * The checkers are proved on small samples first, so a rule cannot pass by matching nothing.
 * The real-browser 360 px check is scripts/browser-check.ts (NFR9.6).
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

const SRC = join(import.meta.dir, "..", "..", "src");

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return cssFiles(full);
    return name.endsWith(".css") ? [full] : [];
  });

interface Rule {
  readonly selector: string;
  readonly declarations: ReadonlyArray<{ readonly property: string; readonly value: string }>;
}

/** Rules of a stylesheet, flattening @media and other at-rule blocks. */
export const parseRules = (css: string): Rule[] => {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  const walk = (body: string): void => {
    let i = 0;
    while (i < body.length) {
      const open = body.indexOf("{", i);
      if (open < 0) return;
      const head = body.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < body.length && depth > 0) {
        if (body[j] === "{") depth += 1;
        else if (body[j] === "}") depth -= 1;
        j += 1;
      }
      const inner = body.slice(open + 1, j - 1);
      if (head.startsWith("@")) {
        walk(inner);
      } else {
        const declarations = inner
          .split(";")
          .map((d) => d.trim())
          .filter((d) => d.includes(":"))
          .map((d) => {
            const at = d.indexOf(":");
            return { property: d.slice(0, at).trim().toLowerCase(), value: d.slice(at + 1).trim() };
          });
        rules.push({ selector: head, declarations });
      }
      i = j;
    }
  };
  walk(text);
  return rules;
};

// The CSS named colours (CSS Color Module Level 4), minus the three allowed keywords.
const NAMED = (
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue " +
  "blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk " +
  "crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki " +
  "darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
  "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue " +
  "dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite " +
  "gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
  "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
  "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen " +
  "lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen " +
  "magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
  "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream " +
  "mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
  "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
  "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
  "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen " +
  "steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
).split(" ");

/** The literal colours in a declaration value, with `var(--…)` references removed. */
export const literalColours = (value: string): string[] => {
  const v = value.replace(/var\(\s*--[\w-]+\s*(,[^)]*)?\)/g, " ");
  const found: string[] = [];
  for (const m of v.matchAll(/#[0-9a-f]{3,8}\b/gi)) found.push(m[0]);
  for (const m of v.matchAll(/\b(rgba?|hsla?)\s*\(/gi)) found.push(m[0]);
  for (const word of v.toLowerCase().match(/[a-z][a-z-]*/g) ?? []) {
    if (NAMED.includes(word)) found.push(word);
  }
  return found;
};

/** A width in px, from px, rem or em (16 px); null when not a fixed length. */
export const fixedPx = (value: string): number | null => {
  const m = /^(\d+(?:\.\d+)?)(px|rem|em)$/.exec(value.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "px" ? n : n * 16;
};

const tooWide = (rules: ReadonlyArray<Rule>): string[] =>
  rules.flatMap((r) =>
    r.selector.includes(".scroll-x")
      ? []
      : r.declarations
          .filter((d) => d.property === "width" || d.property === "min-width")
          .filter((d) => (fixedPx(d.value) ?? 0) > 360)
          .map((d) => `${r.selector} { ${d.property}: ${d.value} }`),
  );

const colourViolations = (rules: ReadonlyArray<Rule>): string[] =>
  rules.flatMap((r) =>
    r.declarations
      .filter((d) => !d.property.startsWith("--"))
      .flatMap((d) => literalColours(d.value).map((c) => `${r.selector} { ${d.property}: ${c} }`)),
  );

const FOCUSABLE = ["button", "input", "select", "textarea", "a", "[tabindex]"];

describe("stylesheet rules", () => {
  const files = cssFiles(SRC);
  const all = files.map((f) => ({
    file: relative(SRC, f),
    rules: parseRules(readFileSync(f, "utf8")),
  }));

  test("the checkers catch what they must (self-check on samples)", () => {
    const sample = parseRules(
      "a { color: red; background: #fff; border-color: rgb(0,0,0); fill: hsla(0,0%,0%,1) }" +
        "@media (min-width: 600px) { .wide { width: 400px; } .ok { width: 360px } }" +
        ".scroll-x table { min-width: 900px } p { color: currentColor; background: transparent }",
    );
    expect(colourViolations(sample)).toEqual([
      "a { color: red }",
      "a { background: #fff }",
      "a { border-color: rgb( }",
      "a { fill: hsla( }",
    ]);
    expect(tooWide(sample)).toEqual([".wide { width: 400px }"]);
    expect(fixedPx("30rem")).toBe(480);
    expect(literalColours("var(--color-text)")).toEqual([]);
  });

  test("there are stylesheets to check: tokens.css and the component rules", () => {
    expect(files.map((f) => basename(f)).sort()).toEqual(["components.css", "tokens.css"]);
    expect(all.every((s) => s.rules.length > 0)).toBe(true);
  });

  test("no literal colour outside tokens.css (NFR9.9, D-10)", () => {
    for (const sheet of all.filter((s) => basename(s.file) !== "tokens.css")) {
      expect({ file: sheet.file, literal: colourViolations(sheet.rules) }).toEqual({
        file: sheet.file,
        literal: [],
      });
    }
  });

  test("no width or min-width above 360 px outside .scroll-x, media blocks included (BR9.1)", () => {
    for (const sheet of all) {
      expect({ file: sheet.file, wide: tooWide(sheet.rules) }).toEqual({
        file: sheet.file,
        wide: [],
      });
    }
    const scroll = all.flatMap((s) => s.rules).find((r) => r.selector.trim() === ".scroll-x");
    expect(scroll?.declarations).toContainEqual({ property: "overflow-x", value: "auto" });
  });

  test("the :focus-visible rule covers every focusable element, from the token (BR9.3)", () => {
    const rules = all.flatMap((s) => s.rules);
    const focus = rules.find((r) =>
      FOCUSABLE.every((sel) =>
        r.selector
          .split(",")
          .map((s) => s.trim())
          .includes(`${sel}:focus-visible`),
      ),
    );
    expect(focus).toBeDefined();
    expect(focus?.declarations).toContainEqual({
      property: "outline",
      value: "var(--focus-ring-outline)",
    });
    const tokens = rules.find((r) => r.selector === ":root");
    const outline = tokens?.declarations.find((d) => d.property === "--focus-ring-outline");
    expect(outline?.value).toMatch(/^\d+px solid var\(--color-[\w-]+\)$/);
  });
});
