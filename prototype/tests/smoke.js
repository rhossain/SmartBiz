/* Headless smoke test: render every route on both devices, both AI states, both
   languages and every Role, then click every interactive element on every
   screen from a freshly rendered state. */
const { boot } = require('./boot');

(async () => {
  const { window, App, doc, errors } = await boot();
  const routes = App.SCREEN_INDEX.filter((r) => r[1]).map((r) => r[1]);
  console.log('routes: ' + routes.length + ' · screens registered: ' + Object.keys(App.screens).length);

  let fails = 0;
  const seen = new Set();

  function nav(route) { window.location.hash = '#/' + route; App.render(); }

  function tryNav(route, label) {
    const before = errors.length;
    try { nav(route); }
    catch (e) {
      const key = 'r|' + route + '|' + (e.message || '');
      if (!seen.has(key)) {
        seen.add(key); fails++;
        console.log('\n!! RENDER ' + route + '  (' + label + ')');
        console.log('   ' + (e.stack || e.message).split('\n').slice(0, 5).join('\n   '));
      }
      return false;
    }
    if (errors.length > before) {
      for (const m of errors.slice(before)) {
        const key = 'c|' + route + '|' + m.slice(0, 120);
        if (!seen.has(key)) {
          seen.add(key); fails++;
          console.log('\n!! CONSOLE ' + route + '  (' + label + ')\n   ' + m.split('\n').slice(0, 5).join('\n   '));
        }
      }
    }
    const app = doc.getElementById('app');
    if (!app.innerHTML || app.innerHTML.length < 200) {
      const key = 'e|' + route;
      if (!seen.has(key)) {
        seen.add(key); fails++;
        console.log('\n!! EMPTY ' + route + '  (' + label + ', len ' + app.innerHTML.length + ')');
      }
      return false;
    }
    return true;
  }

  /* ---- pass 1: every route in every combination of the four switches ---- */
  let renders = 0;
  for (const device of ['phone', 'desktop']) {
    App.device = device; doc.body.dataset.device = device;
    for (const aiOn of [true, false]) {
      App.aiOn = aiOn;
      for (const lang of ['bn', 'en']) {
        App.lang = lang; doc.body.dataset.lang = lang;
        for (const role of Object.keys(App.ROLES)) {
          App.role = role; doc.body.dataset.role = role;
          for (const r of routes) {
            tryNav(r, [device, aiOn ? 'ai' : 'noai', lang, role].join('/'));
            renders++;
          }
        }
      }
    }
  }
  console.log('renders exercised: ' + renders);

  /* ---- pass 2: click everything, as owner ---- */
  App.device = 'phone'; doc.body.dataset.device = 'phone';
  App.aiOn = true; App.lang = 'bn'; App.role = 'owner';
  doc.body.dataset.role = 'owner';

  let clicks = 0;
  for (const r of routes) {
    if (!tryNav(r, 'click-base')) continue;
    const n = doc.getElementById('app').querySelectorAll('[data-act],[data-go]').length;
    for (let i = 0; i < n; i++) {
      /* re-render to a clean state each click so no stale node is clicked */
      try { nav(r); } catch (e) { break; }
      const fresh = [...doc.getElementById('app').querySelectorAll('[data-act],[data-go]')];
      const el = fresh[i];
      if (!el) break;
      const desc = (el.dataset.act ? 'act=' + el.dataset.act : 'go=' + el.dataset.go) +
        (el.dataset.arg ? ' arg=' + el.dataset.arg : '');
      const before = errors.length;
      try {
        el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        clicks++;
      } catch (e) {
        const key = 'click|' + desc + '|' + e.message;
        if (!seen.has(key)) {
          seen.add(key); fails++;
          console.log('\n!! CLICK ' + r + ' [' + desc + ']\n   ' + (e.stack || e.message).split('\n').slice(0, 5).join('\n   '));
        }
        continue;
      }
      if (errors.length > before) {
        for (const m of errors.slice(before)) {
          const key = 'clickc|' + desc + '|' + m.slice(0, 100);
          if (!seen.has(key)) {
            seen.add(key); fails++;
            console.log('\n!! CLICK-CONSOLE ' + r + ' [' + desc + ']\n   ' + m.split('\n').slice(0, 5).join('\n   '));
          }
        }
      }
    }
  }

  console.log('\nclicks exercised: ' + clicks);
  console.log(fails === 0 ? '\nPASS — no errors' : '\nFAIL — ' + fails + ' problem(s)');
  process.exit(fails === 0 ? 0 : 1);
})();
