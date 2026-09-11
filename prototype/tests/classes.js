/* Render every route (all Roles, both languages, both devices, both AI states,
   plus every sheet reachable by a click) and collect every class that actually
   lands in the DOM. Diff against the classes the stylesheets define. Anything in
   the DOM but not in CSS is an unstyled element — invisible to a smoke test,
   obvious to the eye.

   Known blind spot: this proves each class is styled somewhere, not that a
   *combination* selector matches. `.mic-btn.is-live` passed here while being
   unreachable. That is what flows.js is for. */
const fs = require('fs');
const path = require('path');
const { boot, ROOT } = require('./boot');

(async () => {
  const { window, App, doc } = await boot();
  const routes = App.SCREEN_INDEX.filter((r) => r[1]).map((r) => r[1]);

  const inDom = new Map(); // class -> example origin
  const pairsInDom = new Map(); // 'base|is-mod' -> example origin
  function harvest(where) {
    for (const el of doc.querySelectorAll('*')) {
      for (const c of el.classList) if (!inDom.has(c)) inDom.set(c, where);
      /* A state modifier is only styled if CSS joins it to the class it sits on.
         `.qa-tile.is-on` made the bare token `is-on` look styled everywhere, so
         `.lang-card.is-on` — which no rule matched — passed the token check. */
      const bases = [...el.classList].filter((c) => !/^(is|has)-/.test(c)).sort();
      for (const mod of el.classList) {
        if (!/^(is|has)-/.test(mod)) continue;
        const k = mod + '|' + bases.join('.');
        if (!pairsInDom.has(k)) pairsInDom.set(k, where);
      }
    }
  }
  function nav(r) { window.location.hash = '#/' + r; App.render(); }

  for (const device of ['phone', 'desktop']) {
    App.device = device; doc.body.dataset.device = device;
    for (const aiOn of [true, false]) {
      App.aiOn = aiOn;
      for (const lang of ['bn', 'en']) {
        App.lang = lang; doc.body.dataset.lang = lang;
        for (const role of Object.keys(App.ROLES)) {
          App.role = role; doc.body.dataset.role = role;
          for (const r of routes) {
            try { nav(r); harvest(r + ' [' + device + '/' + (aiOn ? 'ai' : 'noai') + ']'); } catch (e) {}
          }
        }
      }
    }
  }

  /* second pass: open every sheet / fire every action, harvesting what appears */
  App.device = 'phone'; doc.body.dataset.device = 'phone'; App.aiOn = true;
  App.lang = 'bn'; App.role = 'owner'; doc.body.dataset.role = 'owner';

  let sheets = 0;
  for (const r of routes) {
    try { nav(r); } catch (e) { continue; }
    const n = doc.querySelectorAll('#app [data-act],#app [data-go]').length;
    for (let i = 0; i < n; i++) {
      try { nav(r); } catch (e) { break; }
      const els = [...doc.querySelectorAll('#app [data-act],#app [data-go]')];
      if (!els[i]) break;
      try { els[i].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }
      catch (e) { continue; }
      harvest(r + ' → ' + (els[i].dataset.act || els[i].dataset.go));
      if (doc.querySelector('.sheet')) {
        sheets++;
        const inner = [...doc.querySelectorAll('.sheet [data-act],.sheet [data-go]')];
        for (const el of inner.slice(0, 6)) {
          try { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); } catch (e) {}
          harvest(r + ' → sheet');
        }
      }
    }
  }

  /* ---- classes the stylesheets define ---- */
  const css = ['tokens.css', 'app.css', 'screens.css']
    .map((f) => fs.readFileSync(path.join(ROOT, 'css', f), 'utf8')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const inCss = new Set();
  for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) inCss.add(m[1]);

  /* compound units: the class tokens a single selector step requires together */
  const pairsInCss = new Set();
  const soloMods = new Set();
  for (const sel of css.replace(/\{[\s\S]*?\}/g, ',').split(',')) {
    for (const unit of sel.split(/[\s>+~]+/)) {
      const cls = [...unit.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
      if (!cls.length) continue;
      for (const a of cls) for (const b of cls) if (a !== b) pairsInCss.add(a + '|' + b);
      if (cls.length === 1 && /^(is|has)-/.test(cls[0])) soloMods.add(cls[0]);
    }
  }

  /* behavioural hooks the CSS is not expected to know about */
  const IGNORE = new Set(['screen-in', 'spacer']);

  const missing = [...inDom.keys()].filter((c) => !inCss.has(c) && !IGNORE.has(c)).sort();
  const unused = [...inCss].filter((c) => !inDom.has(c)).sort();
  /* The modifier is reachable if some rule joins it to any one of the classes it
     shares an element with — not to all of them. */
  const deadMods = [...pairsInDom.keys()].filter((k) => {
    const mod = k.split('|')[0];
    if (soloMods.has(mod)) return false;
    return !k.split('|')[1].split('.').some((base) => pairsInCss.has(base + '|' + mod));
  }).sort();

  console.log('sheets opened: ' + sheets);
  console.log('distinct classes in DOM: ' + inDom.size + ' · defined in CSS: ' + inCss.size);
  console.log('\n=== IN DOM, NOT STYLED (' + missing.length + ') ===');
  for (const c of missing) console.log('  .' + c + '   ← ' + inDom.get(c));
  console.log('\n=== STATE MODIFIER NO RULE MATCHES (' + deadMods.length + ') ===');
  for (const k of deadMods) {
    const p = k.split('|');
    console.log('  .' + (p[1] || '(no base)') + '.' + p[0] + '   ← ' + pairsInDom.get(k));
  }
  console.log('\n=== STYLED, NEVER RENDERED (' + unused.length + ') ===');
  console.log('  ' + unused.map((c) => '.' + c).join(' '));
  process.exit(missing.length === 0 && deadMods.length === 0 ? 0 : 1);
})();
