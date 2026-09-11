#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const here = __dirname;
const epicsPath = path.resolve(here, '../../../epics.md');
const epics = fs.readFileSync(epicsPath, 'utf8');
const planned = [...epics.matchAll(/^### Story (\d+\.\d+): (.+)$/gm)].map(match => ({ id: match[1], title: match[2].trim() }));
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(here, 'screen-map.js'), 'utf8'), sandbox);
const designed = sandbox.window.SMARTBIZ_SCREEN_MAP;

const failures = [];
if (!Array.isArray(designed)) failures.push('screen-map.js did not expose an array.');
const ids = designed.map(item => item.id);
if (new Set(ids).size !== ids.length) failures.push('Duplicate story IDs exist in the design map.');
for (const story of planned) {
  const screen = designed.find(item => item.id === story.id);
  if (!screen) failures.push(`Missing screen for Story ${story.id}: ${story.title}`);
  else if (screen.title !== story.title) failures.push(`Title mismatch for Story ${story.id}: “${screen.title}”`);
}
for (const screen of designed) {
  if (!planned.some(story => story.id === screen.id)) failures.push(`Extra screen ${screen.id}: ${screen.title}`);
  for (const field of ['epic', 'kind', 'mode', 'route', 'surface', 'state', 'action', 'evidence']) {
    if (!screen[field] || (Array.isArray(screen[field]) && screen[field].length !== 3)) failures.push(`Story ${screen.id} has invalid ${field}.`);
  }
}

if (failures.length) {
  console.error(`Mockup gate FAILED (${failures.length} issues)\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Mockup gate PASSED — ${planned.length}/${planned.length} epics.md stories have authoritative, addressable screen designs.`);
