/* Geometry probe. Screenshots show that something is wrong; they cannot say what.
   This reports real boxes and computed padding from the real browser, so layout
   questions get answered by numbers instead of by squinting at upscaled crops.

   usage: node measure.js <device> <lang> <route> <selector> [selector...] */
const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');
const PORT = 9334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [device, lang, route, ...selectors] = process.argv.slice(2);
if (!selectors.length) { console.log('usage: node measure.js <device> <lang> <route> <selector>...'); process.exit(1); }

function getJSON(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path }, (r) => {
      let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

(async () => {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT, '--window-size=1440,1000',
    '--user-data-dir=/tmp/sbchrome-m', '--no-first-run', '--no-default-browser-check', URL,
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      target = (await getJSON('/json/list')).find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch (e) {}
  }
  if (!target) { console.log('!! could not reach Chrome'); chrome.kill(); process.exit(1); }

  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise((r) => ws.on('open', r));
  let id = 0;
  const pending = new Map();
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params) => new Promise((res) => {
    const mid = ++id; pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
  await send('Runtime.enable');

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    const res = r.result || {};
    if (res.exceptionDetails)
      console.log('  !! ' + (res.exceptionDetails.exception || {}).description);
    return res.result ? res.result.value : undefined;
  };

  await sleep(1200);
  await evaluate(
    'document.querySelector(\'#c-device button[data-device="' + device + '"]\').click();' +
    'document.querySelector(\'#c-lang button[data-lang="' + lang + '"]\').click();' +
    'location.hash = "#/' + route + '";'
  );
  await sleep(700);

  /* A selector prefixed "!" is setup JS, not a selector — the states worth
     measuring usually sit behind a toggle rather than on a fresh load. */
  for (const s of selectors.filter((x) => x.startsWith('!'))) {
    await evaluate(s.slice(1));
    await sleep(500);
  }
  const measured = selectors.filter((x) => !x.startsWith('!'));

  const rows = await evaluate(
    'JSON.stringify(' + JSON.stringify(measured) + '.map(function (s) {' +
    '  var el = document.querySelector(s);' +
    '  if (!el) return { sel: s, missing: true };' +
    '  var r = el.getBoundingClientRect(), c = getComputedStyle(el);' +
    '  return { sel: s,' +
    '    left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height),' +
    '    top: Math.round(r.top),' +
    '    pad: [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].join(" "),' +
    '    overflowsParent: el.parentElement' +
    '      ? Math.round(r.left - el.parentElement.getBoundingClientRect().left) + "/" +' +
    '        Math.round(el.parentElement.getBoundingClientRect().right - r.right) : "-",' +
    '    scrollW: el.scrollWidth, clientW: el.clientWidth };' +
    '}))'
  );

  console.log(device + ' · ' + lang + ' · #/' + route + '\n');
  JSON.parse(rows).forEach((r) => {
    if (r.missing) { console.log('  ' + r.sel.padEnd(22) + ' MISSING'); return; }
    console.log('  ' + r.sel.padEnd(22) +
      ' y ' + String(r.top).padStart(4) +
      ' x ' + String(r.left).padStart(5) + '→' + String(r.right).padStart(5) +
      '  w ' + String(r.w).padStart(5) +
      '  inset(l/r vs parent) ' + r.overflowsParent.padEnd(11) +
      '  pad ' + r.pad.padEnd(28) +
      (r.scrollW > r.clientW ? '  SCROLLS (' + r.scrollW + ' > ' + r.clientW + ')' : ''));
  });

  ws.close(); chrome.kill();
  process.exit(0);
})();
