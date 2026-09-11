/* Contrast is the one property in this product that is fully determined by the tokens
   and completely invisible to every other harness. smoke.js, truth.js, flows.js and
   classes.js all pass with an unreadable palette; shot.js renders it faithfully and a
   human eye forgives it, because a caption at 2.9:1 looks *quiet* rather than broken.

   So the floors are asserted arithmetically, straight off tokens.css. Three notes on why
   the checks are shaped the way they are:

   - Ratios are measured against `canvas-sunk`, the darkest of the three backgrounds a
     figure can sit on, not against white. 4.5:1 on #FFFFFF is a much easier bar than
     4.5:1 on #EFEDE7, and the whole palette is warm.
   - `line` and `line-strong` are deliberately EXEMPT. They are ruled ledger lines —
     decoration, and correctly faint. A border that bounds a control is a different job
     with a real 3:1 floor, which is what `line-control` is for.
   - The last block checks that DESIGN.md and tokens.css still agree. The spine wins on
     conflict, so a value that drifts here is the prototype lying about its own design. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SPINE = path.join(ROOT, '..', '_bmad-output', 'planning-artifacts',
  'ux-designs', 'ux-SmartBiz-2026-09-07', 'DESIGN.md');

/* Comments are stripped before any selector is read, and that is not tidiness. The block
   pattern below anchors on `}` or a line start, so a comment sitting between two rules is
   swallowed into the selector capture — the trimmed result is prose, matches no selector
   shape, and the rule it introduced is skipped in silence. Fourteen bordered rules were
   invisible for exactly that reason, `.btn`, `.chip`, `.pick-tile` and `.qty-stepper`
   among them, and this file's every "ok" was counted over what was left. A well-commented
   stylesheet was the least examined one. */
const cssSource = (f) =>
  fs.readFileSync(path.join(ROOT, 'css', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const css = fs.readFileSync(path.join(ROOT, 'css', 'tokens.css'), 'utf8');
const T = {};
for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) T[m[1]] = m[2];

const luminance = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

let fails = 0;
const BODY = 4.5;      // WCAG AA, text below 18.66px bold / 24px regular
const LARGE = 3.0;     // WCAG AA, large text — and the non-text floor of 1.4.11
const PAPER = ['surface', 'canvas', 'canvas-sunk'];
const INK = ['ink-900', 'ink-800', 'ink-700'];

function floor(token, backgrounds, min, why) {
  const scores = backgrounds.map((b) => [b, ratio(T[token], T[b])]);
  const worst = scores.reduce((w, s) => (s[1] < w[1] ? s : w));
  const ok = worst[1] >= min;
  console.log('  ' + (ok ? 'ok  ' : '!!  ') + token.padEnd(15) +
    scores.map((s) => s[1].toFixed(2)).join('  ') +
    '   ≥' + min + (ok ? '' : '  ← ' + worst[1].toFixed(2) + ' on ' + worst[0] + ' — ' + why));
  if (!ok) fails++;
}

console.log('\n· text tones clear AA on every background it can sit on   [' + PAPER.join(' ') + ']');
for (const t of ['text', 'text-2', 'text-3']) floor(t, PAPER, BODY, 'captions and hints are body text');

console.log('\n· inverted text clears AA on every ink   [' + INK.join(' ') + ']');
for (const t of ['text-on-ink', 'text-on-ink-2', 'text-on-ink-3']) floor(t, INK, BODY, 'sidebar meta is still text');

console.log('\n· a hue at -600 tints a large figure (3.0); at -700 it sets small text (4.5)');
for (const h of ['green', 'brass', 'amber', 'red', 'teal', 'violet']) {
  floor(h + '-600', PAPER, LARGE, 'figures are large and bold, but only just clear 3:1');
  if (T[h + '-700']) floor(h + '-700', PAPER, BODY, 'the -700 step exists precisely to carry small text');
}

console.log('\n· a border that bounds a control clears the non-text floor');
floor('line-control', PAPER, LARGE, 'inputs, ghost buttons, outline chips, status dots');

/* The two ruled-line tokens are asserted to STAY faint. If someone "fixes" their
   contrast the ledger look is gone, and the fix belongs on line-control instead. */
console.log('\n· ruled ledger lines stay decorative — exempt by design, and asserted to stay so');
for (const t of ['line', 'line-strong']) {
  const r = ratio(T[t], T.canvas);
  const ok = r < LARGE;
  console.log('  ' + (ok ? 'ok  ' : '!!  ') + t.padEnd(15) + r.toFixed(2) +
    '   < ' + LARGE + (ok ? '  (a ruled line, not a control boundary)'
      : '  ← now dark enough to read as a control boundary; use line-control for that job'));
  if (!ok) fails++;
}

/* Every floor above checks a token's value. None checks where the token is USED, and
   that gap shipped a real defect: eleven bounded controls — selectable tiles, filter
   chips, the settlement run cards — drew their boundary in `line` at 1.19:1, and a
   duplicate `.iconbtn.bordered` in screens.css silently overrode the app.css fix.

   The check is static rather than rendered on purpose. `.cond-tile` and `.snode` are
   both `<button>` but neither appears in a synchronous pass — they need a return
   disposition picked and a state machine opened first — so a DOM walk is exactly the
   instrument that missed them. Reading the source catches states nobody navigated to.

   The distinction being enforced is the one tokens.css states: a border on ALL sides
   of an interactive element is that control's boundary and owes 3:1, while a
   border-bottom on a list row is a ruled separator and owes nothing. So only the
   all-sides form counts, and it is resolved through the cascade — `.feature-row` takes
   `border: 1px solid var(--line)` from one rule and `border: 0` from a later one, and
   is a separator in the end. */
console.log('\n· no control draws its boundary in a ruled-line colour');
const RULED = ['line', 'line-strong'];

/* Markup is built by concatenation, so a class attribute in the source reads
   `class="qa-tile' + (q ? ' is-on' : '') + '"`. Splitting on whitespace and keeping the
   raw tokens yields `qa-tile'` with a trailing quote, which matches no CSS selector and
   silently empties this check — it is why the first version of it could not fail.
   Pull class-shaped tokens out instead of trusting the attribute to be a literal. */
const interactive = new Set();
const classish = (s) => (s.match(/[a-z][a-z0-9-]*/g) || []);
for (const f of fs.readdirSync(path.join(ROOT, 'js'))) {
  const js = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  for (const m of js.matchAll(/<(button|a)\b[^>]{0,400}?class="([^"]*)"/g)) {
    for (const c of classish(m[2])) interactive.add(c);
  }
  for (const m of js.matchAll(/class="([^"]*)"[^>]{0,200}?(?:aria-pressed|role="button")/g)) {
    for (const c of classish(m[1])) interactive.add(c);
  }
}

/* A control is not always the element carrying the class. `.qty-stepper` is a div that
   wraps two buttons and `.searchbar` a div that wraps an input; in both the all-sides
   border is the control's own boundary, and both drew it in `line` while this check walked
   straight past them — the scan above only ever sees a class sitting on a button or a link.
   So a class that styles an interactive element of its own is treated as bounding one too.
   `input` earns its place separately from `button`: 1.4.11 is about the visible edge of the
   control, and a text field's edge is the only thing that says a field is there at all. */
for (const f of ['app.css', 'screens.css']) {
  for (const m of cssSource(f).matchAll(/(?:^|[},])\s*\.([a-z][a-z0-9-]*)[^{},]*\s(?:button|a|input|select|textarea)\b[^{},]*\{/gm)) {
    interactive.add(m[1]);
  }
}

/* Only the RESTING boundary is the control's identifying edge. `.qa-tile.is-on` sets
   green-600 for a selected tile; letting that count as the boundary is the second reason
   the first version could not fail — a state rule masked the resting colour it was meant
   to be checking. So `is-` chains are skipped, while plain chains are kept: the override
   that reverted the earlier fix was `.iconbtn.bordered`, and a check that only reads
   single-class selectors cannot see it. */
const boundary = new Map();
for (const f of ['app.css', 'screens.css']) {
  for (const m of cssSource(f).matchAll(/(^|\})([^{}]+)\{([^{}]*)\}/gm)) {
    const decl = [...m[3].matchAll(/(?:^|;)\s*border(?:-color)?\s*:\s*([^;]+)/g)].pop();
    if (!decl) continue;
    const tok = (decl[1].match(/var\(--([a-z0-9-]+)\)/) || [])[1] ||
      (/(^|\s)(0|none)(\s|$)/.test(decl[1].trim()) ? '<none>' : null);
    if (!tok) continue;
    for (const one of m[2].split(',')) {
      const sel = one.trim();
      if (!/^(\.[a-z][a-z0-9-]*)+$/.test(sel)) continue;      // no pseudo, no attribute
      const parts = sel.slice(1).split('.');
      if (parts.some((p) => p.startsWith('is-'))) continue;    // a state, not the resting edge
      boundary.set(parts.join('.'), { tok: tok, at: f, base: parts[0] });
    }
  }
}

const leaks = [];
const checked = [];
for (const [key, b] of boundary) {
  if (!interactive.has(b.base)) continue;
  checked.push(key);
  if (RULED.indexOf(b.tok) > -1) leaks.push('.' + key.replace(/\./g, '.') + '  (' + b.at + ', ' + b.tok + ')');
}

/* A floor on the count would be arbitrary. These are load-bearing controls whose boundary
   is the only thing marking them as controls; if the source scan stops finding them, it has
   broken and every "ok" below it is worthless. `qty-stepper` is named because it is the one
   reached through the wrapper path — the class sits on a div, so it proves that path still
   works — and `pick-tile` because it sat behind a comment and went unexamined until the
   comment strip above was added. */
const MUST_CHECK = ['qa-tile', 'act-tile', 'cond-tile', 'q-chip', 'iconbtn.bordered',
  'qty-stepper', 'pick-tile'];
const lost = MUST_CHECK.filter((c) => checked.indexOf(c) < 0);
if (lost.length) {
  console.log('  !!  the scan no longer reaches ' + lost.join(', ') +
    ' — it is matching too little to prove anything');
  fails++;
}
console.log('  ' + (leaks.length === 0 ? 'ok  ' : '!!  ') + checked.length +
  ' control boundaries resolved from ' + interactive.size + ' interactive classes' +
  (leaks.length === 0 ? ' — none of them a ruled line'
    : '\n      ' + leaks.join('\n      ') + '\n      ← a control boundary needs line-control (WCAG 1.4.11)'));
if (leaks.length) fails++;

/* Two meanings one colour apart is not a contrast failure, it is a semantics failure,
   and no ratio floor catches it. Asserted here because this is where colour lives. */
console.log('\n· two colours carrying different meanings are told apart, or their words are');
const pair = ratio(T['amber-600'], T['brass-600']);
console.log('  ok  amber-600 vs brass-600   ' + pair.toFixed(2) +
  '   — indistinguishable by design constraint, so DESIGN.md requires a label with each:\n' +
  '      amber never appears without a Recognition Basis, brass never without a Completeness Indicator.');
if (pair >= LARGE) {
  console.log('  !!  the pair now separates on its own — the redundancy rule in DESIGN.md can be relaxed');
  fails++;
}

console.log('\n· the prototype still carries the spine\'s values, token for token');
if (!fs.existsSync(SPINE)) {
  console.log('  !!  DESIGN.md not found at ' + SPINE);
  fails++;
} else {
  const fm = fs.readFileSync(SPINE, 'utf8').split('\n---')[0];
  let checked = 0;
  const drift = [];
  for (const m of fm.matchAll(/^ {2}([a-z0-9-]+): '(#[0-9A-Fa-f]{6})'$/gm)) {
    checked++;
    if (!T[m[1]]) drift.push(m[1] + ' missing from tokens.css');
    else if (T[m[1]].toUpperCase() !== m[2].toUpperCase()) {
      drift.push(m[1] + ': spine ' + m[2] + ' vs css ' + T[m[1]]);
    }
  }
  const ok = drift.length === 0 && checked > 0;
  console.log('  ' + (ok ? 'ok  ' : '!!  ') + checked + ' colour tokens compared' +
    (ok ? ' — no drift' : '   ' + drift.join('; ')));
  if (!ok) fails++;
}

console.log(fails === 0 ? '\nPASS — every contrast floor holds' : '\nFAIL — ' + fails + ' problem(s)');
process.exit(fails === 0 ? 0 : 1);
