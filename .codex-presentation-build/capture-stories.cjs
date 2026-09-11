'use strict';

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const WebSocket = require(path.resolve(__dirname, '../prototype/tests/node_modules/ws'));

const workspace = path.resolve(__dirname, '..');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const prototypeUrl = 'file://' + path.join(workspace, 'prototype/index.html');
const outDir = path.join(__dirname, 'story-shots');
const port = 9348;
const profile = fs.mkdtempSync('/tmp/smartbiz-deck-');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(workspace, '_bmad-output/planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/mockups/screen-map.js'), 'utf8'), sandbox);
const stories = sandbox.window.SMARTBIZ_SCREEN_MAP;

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: urlPath }, response => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--allow-file-access-from-files', '--remote-debugging-port=' + port,
    '--window-size=1440,1000', '--user-data-dir=' + profile,
    '--no-first-run', '--no-default-browser-check', prototypeUrl
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 80 && !target; i++) {
    await sleep(250);
    try {
      target = (await getJson('/json/list')).find(item => item.type === 'page' && item.webSocketDebuggerUrl);
    } catch (_) {}
  }
  if (!target) throw new Error('Chrome DevTools endpoint did not become ready.');

  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise(resolve => ws.on('open', resolve));
  let commandId = 0;
  const pending = new Map();
  const browserErrors = [];
  ws.on('message', raw => {
    const message = JSON.parse(raw);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text || 'Browser exception');
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') browserErrors.push('console.error');
  });
  const send = (method, params = {}) => new Promise(resolve => {
    const id = ++commandId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const reply = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (reply.result && reply.result.exceptionDetails) throw new Error(reply.result.exceptionDetails.text);
    return reply.result && reply.result.result ? reply.result.result.value : undefined;
  };

  await send('Runtime.enable');
  await send('Page.enable');
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    await sleep(200);
    ready = await evaluate('!!(window.App && App.screens && App.screens.journeys)');
  }
  if (!ready) throw new Error('Prototype did not boot.');

  await evaluate(`
    window.__deckSet = function(device, storyId) {
      document.querySelector('#c-device button[data-device="' + device + '"]').click();
      document.querySelector('#c-lang button[data-lang="en"]').click();
      var role = document.getElementById('c-role');
      role.value = 'owner';
      App.role = 'owner';
      document.body.dataset.role = 'owner';
      location.hash = '#/journeys/' + storyId;
    };
  `);

  for (let index = 0; index < stories.length; index++) {
    const story = stories[index];
    await evaluate(`__deckSet(${JSON.stringify(story.mode)}, ${JSON.stringify(story.id)})`);
    await sleep(180);
    await evaluate(`(function () { var host = document.getElementById('toasts'); if (host) host.innerHTML = ''; }())`);
    const box = JSON.parse(await evaluate(`(function () {
      var r = document.getElementById('viewport').getBoundingClientRect();
      return JSON.stringify({ x:r.left, y:r.top, width:r.width, height:r.height });
    }())`));
    const result = await send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: false,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
    });
    fs.writeFileSync(path.join(outDir, story.id.replace('.', '-') + '.png'), Buffer.from(result.result.data, 'base64'));
    if ((index + 1) % 10 === 0 || index === stories.length - 1) console.log(`captured ${index + 1}/${stories.length}`);
  }

  const manifest = stories.map(story => ({ ...story, image: path.join(outDir, story.id.replace('.', '-') + '.png') }));
  fs.writeFileSync(path.join(__dirname, 'story-manifest.json'), JSON.stringify(manifest, null, 2));
  if (browserErrors.length) throw new Error('Browser errors: ' + [...new Set(browserErrors)].join(', '));
  console.log('capture complete: 76/76, no browser errors');
  ws.close();
  chrome.kill();
  await sleep(750);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
})().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
