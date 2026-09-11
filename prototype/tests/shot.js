/* Drive the real browser over CDP so screenshots can reach states a static load
   cannot: desktop mode, English, a money-gated Role, an open sheet, the live
   mic. Structural harnesses cannot see type rendering, spacing or animation —
   this is the only pass that looks at what the user will actually look at. */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');
const OUT = require('path').resolve(__dirname, 'shots');
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJSON(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path }, (r) => {
      let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const profile = fs.mkdtempSync('/tmp/sbchrome-');
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--window-size=1440,1000',
    '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
    URL,
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await getJSON('/json/list');
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch (e) {}
  }
  if (!target) { console.log('!! could not reach Chrome'); chrome.kill(); process.exit(1); }

  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise((r) => ws.on('open', r));
  let id = 0;
  const pending = new Map();
  const consoleErrs = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown')
      consoleErrs.push('exception: ' + (m.params.exceptionDetails.text || '') + ' ' +
        JSON.stringify((m.params.exceptionDetails.exception || {}).description || '').slice(0, 200));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      consoleErrs.push('console.error: ' + m.params.args.map((a) => a.value).join(' '));
  });
  const send = (method, params) => new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });

  await send('Runtime.enable');
  await send('Page.enable');

  async function evaluate(expr) {
    const r = await send('Runtime.evaluate', {
      expression: expr, awaitPromise: true, returnByValue: true,
    });
    const res = r.result || {};
    if (res.exceptionDetails)
      console.log('  !! eval threw: ' + (res.exceptionDetails.text || '') + ' ' +
        ((res.exceptionDetails.exception || {}).description || '').split('\n')[0]);
    return res.result ? res.result.value : undefined;
  }

  async function shot(name) {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(OUT + '/' + name + '.png', Buffer.from(r.result.data, 'base64'));
    console.log('  · ' + name + '.png');
  }

  var ok = false;
  for (var bootTry = 0; bootTry < 80 && !ok; bootTry++) {
    await sleep(250);
    ok = await evaluate('!!(window.App && App.screens && Object.keys(App.screens).length)');
  }
  if (!ok) {
    console.log('!! App did not boot in the real browser');
    console.log('  page: ' + await evaluate('location.href'));
    console.log('  body: ' + await evaluate('document.body.innerText.slice(0, 240)'));
    console.log('  app: ' + await evaluate('JSON.stringify({type:typeof window.App, keys:window.App?Object.keys(window.App):[], ready:document.readyState, map:typeof window.SMARTBIZ_SCREEN_MAP})'));
    console.log('  errors: ' + (consoleErrs.join(' | ') || 'none captured'));
    ws.close(); chrome.kill(); process.exit(1);
  }
  console.log('booted in Chrome · screens: ' + (await evaluate('Object.keys(App.screens).length')));

  /* flip the chrome controls the way a user would, rather than poking App */
  await evaluate(
    'window.__set = function (device, lang, role) {' +
    '  document.querySelector(\'#c-device button[data-device="\' + device + \'"]\').click();' +
    '  document.querySelector(\'#c-lang button[data-lang="\' + lang + \'"]\').click();' +
    '  var sel = document.getElementById("c-role");' +
    '  sel.value = role;' +
    '  sel.dispatchEvent(new Event("change", { bubbles: true }));' +
    '};' +
    'window.__nav = function (r) { location.hash = "#/" + r; };'
  );

  const shots = [
    ['desktop-journeys', 'desktop', 'en', 'owner',  'journeys'],
    ['desktop-story-5-10', 'desktop', 'en', 'owner', 'journeys/5.10'],
    ['phone-story-4-12', 'phone', 'en', 'owner', 'journeys/4.12'],
    ['desktop-home',   'desktop', 'bn', 'owner',  'home'],
    ['desktop-orders', 'desktop', 'bn', 'owner',  'orders'],
    ['desktop-settle', 'desktop', 'bn', 'owner',  'settlement/STL-0831'],
    ['desktop-flows',  'desktop', 'bn', 'owner',  'flows'],
    ['phone-home-en',  'phone',   'en', 'owner',  'home'],
    ['phone-gated',    'phone',   'bn', 'packer', 'reports/profit'],
    ['phone-splash',   'phone',   'bn', 'owner',  'splash'],
    ['phone-slip',     'phone',   'bn', 'owner',  'order/ORD-1037/slip'],
    ['phone-audit',    'phone',   'bn', 'owner',  'audit/A-84'],
    ['phone-custody',  'phone',   'bn', 'owner',  'cod'],
  ];
  for (const [name, device, lang, role, route] of shots) {
    await evaluate('__set("' + device + '","' + lang + '","' + role + '"); __nav("' + route + '");');
    /* the Role switch raises a toast that lives 2.6s — wait it out so the
       screenshots show the screen rather than a pile of stale confirmations */
    await sleep(2900);
    await shot(name);
  }

  console.log('interactive states:');
  await evaluate('__set("phone","bn","owner"); __nav("capture/voice");');
  await sleep(500);
  await evaluate('App.state.voice = null; App.render();' +
    'document.querySelector(\'.mic-btn[data-act="voice-toggle"]\').click();');
  await sleep(500);
  await shot('phone-voice-live');

  await evaluate('__nav("insights");');
  await sleep(500);
  await evaluate('App.state.insight = null; App.render();' +
    'document.getElementById("ai-q").value = "এ মাসে লাভ কত";' +
    'document.querySelector(\'[data-act="ai-ask"]\').click();');
  await sleep(1700);
  await shot('phone-ai-answer');

  await evaluate('__nav("home");');
  await sleep(500);
  await evaluate('document.querySelector(\'[data-act="completeness-why"]\').click();');
  await sleep(700);
  await shot('phone-sheet');

  await evaluate('__nav("product/P-101/variants");');
  await sleep(500);
  await evaluate('App.state.matrix = null; App.render();' +
    'document.querySelector(\'[data-act="matrix-grid"]\').click();');
  await sleep(500);
  await shot('phone-grid');

  /* The parse result, in English, because this is the screen that has to prove
     it did not guess: the count of what it found, the recognised number, and —
     after the misattribution fix — a pink dupatta beside a black kurti. */
  await evaluate('__set("phone","en","staff"); __nav("capture/paste");');
  await sleep(2900);
  await evaluate('App.state.paste = null; App.state.parsed = null; App.render();' +
    'document.querySelector(\'[data-act="paste-demo"]\').click();' +
    'document.querySelector(\'[data-act="paste-parse"]\').click();');
  /* both clicks raise a toast, and stacked toasts sit exactly over the result —
     wait them out, then bring the extracted card into view */
  await sleep(3200);
  console.log('  scrolled to: ' + await evaluate(
    '(function(){var s=document.querySelector(".scroll");' +
    'var h=[].filter.call(document.querySelectorAll("h3"),' +
    'function(e){return /^(Items|পণ্য)/.test(e.textContent.trim());})[0];' +
    'if(!s) return "no .scroll"; if(!h) return "no Items heading";' +
    's.style.scrollBehavior="auto"; s.scrollTop = h.closest(".card").offsetTop - 8;' +
    'return s.scrollTop + "/" + (s.scrollHeight - s.clientHeight);})()'));
  await sleep(400);
  await shot('phone-paste-parsed');

  console.log(consoleErrs.length
    ? '\n!! browser errors:\n  ' + [...new Set(consoleErrs)].join('\n  ')
    : '\nno browser console errors');

  ws.close();
  chrome.kill();
  await sleep(750);
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }); } catch (e) {}
  process.exit(0);
})();
