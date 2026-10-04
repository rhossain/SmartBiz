/* Exact story-to-screen parity and render coverage for the presentation route. */
'use strict';

const fs = require('fs');
const path = require('path');
const { boot } = require('./boot');

(async () => {
  const { window, App, doc, errors, ROOT } = await boot();
  const epicsPath = path.resolve(ROOT, '../_bmad-output/planning-artifacts/epics.md');
  const planned = [...fs.readFileSync(epicsPath, 'utf8').matchAll(/^### Story (\d+\.\d+): (.+)$/gm)]
    .map(match => ({ id: match[1], title: match[2].trim() }));
  const designed = window.SMARTBIZ_SCREEN_MAP || [];
  const failures = [];
  App.lang = 'en';
  doc.documentElement.lang = 'en';
  doc.body.dataset.lang = 'en';

  if (planned.length !== 76) failures.push(`Expected 76 planned stories, found ${planned.length}.`);
  if (designed.length !== planned.length) failures.push(`Design map has ${designed.length}; expected ${planned.length}.`);
  for (const story of planned) {
    const design = designed.find(item => item.id === story.id);
    if (!design) { failures.push(`Story ${story.id} has no design.`); continue; }
    if (design.title !== story.title) failures.push(`Story ${story.id} title drifted.`);
    window.location.hash = '#/journeys/' + story.id;
    App.render();
    const frame = doc.querySelector('[data-story-id="' + story.id + '"]');
    if (!frame) failures.push(`Story ${story.id} did not render an addressable prototype frame.`);
    else {
      const evidence = (design.proofs || []).map(proof => proof.label);
      for (const text of [design.title, design.surface, design.state, ...evidence]) {
        if (!frame.textContent.includes(text)) failures.push(`Story ${story.id} omitted visible contract text: ${text}`);
      }
      if (!frame.querySelector('[data-act="journey-action"]')) failures.push(`Story ${story.id} has no primary action.`);
      const rendered = doc.getElementById('app').textContent;
      if (!rendered.includes(design.primaryMode) || !rendered.includes(design.secondaryMode)) failures.push(`Story ${story.id} omitted responsive modes.`);
      if (!frame.textContent.includes('#/journeys/' + story.id)) failures.push(`Story ${story.id} omitted its presentation URL.`);
    }
  }

  window.location.hash = '#/journeys';
  App.render();
  if (!doc.querySelector('[data-story-hub="76"]')) failures.push('Journey hub did not render its 76-story marker.');
  if (doc.querySelectorAll('.journey-story').length !== 76) failures.push('Journey hub does not expose all 76 story links.');
  if (errors.length) failures.push(...errors);

  if (failures.length) {
    console.error(`Story coverage FAILED (${failures.length})\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log('Story coverage PASSED — 76/76 story routes render their exact mockup contract, visible proof, and primary action.');
})().catch(error => { console.error(error); process.exit(1); });
