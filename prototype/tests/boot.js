/* Shared bootstrap for the prototype harnesses.

   Worth stating plainly, because it silently faked a whole test pass: app.js
   defers boot() to DOMContentLoaded, and jsdom has NOT fired that event yet at
   the moment we eval the scripts. So we must not dispatch it ourselves — jsdom
   will fire its own, and two boots means wireBody() attaches the click
   delegation twice, so every click runs its handler twice. Instead: load the
   scripts, then yield until jsdom moves readyState past 'loading'. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const FILES = ['i18n.js', 'data.js', 'ui.js',
               '../../_bmad-output/planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/mockups/screen-map.js',
               'screens-core.js', 'screens-orders.js', 'screens-catalog.js', 'screens-money.js',
               'screens-system.js', 'screens-journeys.js', 'app.js'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
    url: 'file://' + ROOT + '/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const { window } = dom;
  window.matchMedia = window.matchMedia ||
    (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

  for (const f of FILES) {
    try { window.eval(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')); }
    catch (e) {
      console.log('!! LOAD FAILURE in js/' + f + '\n   ' +
        (e.stack || e.message).split('\n').slice(0, 4).join('\n   '));
      process.exit(1);
    }
  }

  for (let i = 0; i < 100 && window.document.readyState === 'loading'; i++) await sleep(10);
  if (window.document.readyState === 'loading') {
    console.log('!! DOMContentLoaded never fired — boot() did not run'); process.exit(1);
  }

  const App = window.App;
  const doc = window.document;
  if (!App || !App.screens || !App.SCREEN_INDEX) {
    console.log('!! App did not initialise'); process.exit(1);
  }

  /* Assert the delegation is wired exactly once. A double boot makes every
     click fire twice, which turns any toggle into a no-op and fakes results. */
  window.location.hash = '#/capture/voice';
  App.state.voice = null;
  App.render();
  const mic = doc.querySelector('.mic-btn[data-act="voice-toggle"]');
  mic.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  if (!(App.state.voice && App.state.voice.listening)) {
    console.log('!! harness: click delegation is not wired exactly once (voice state=' +
      JSON.stringify(App.state.voice) + ') — aborting rather than reporting nonsense');
    process.exit(1);
  }
  App.state.voice = null;
  errors.length = 0;

  return { dom, window, App, doc, errors, ROOT,
           routes: App.SCREEN_INDEX.filter((r) => r[1]).map((r) => r[1]) };
}

module.exports = { boot, sleep, ROOT };
