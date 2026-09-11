import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const workspaceDir = '/Users/bs1071/Downloads/Temp/E2E/SmartBiz';
const buildDir = path.join(workspaceDir, '.codex-presentation-build');
const SKILL_DIR = '/Users/bs1071/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations';
const RUNTIME_PYTHON = '/Users/bs1071/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const FINAL_PPTX = path.join(workspaceDir, '_bmad-output/presentation-artifacts/SmartBiz-BD-Full-Journey.pptx');
const manifest = JSON.parse(await fs.readFile(path.join(buildDir, 'story-manifest.json'), 'utf8'));
const { resolvePresentationFont, finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')).href);

const bodyFont = resolvePresentationFont({ fontFamily: 'Helvetica Neue' });
const displayFont = resolvePresentationFont({ fontFamily: 'Georgia' });
const colors = {
  ink: '#0B1014', ink2: '#263038', canvas: '#F6F5F1', surface: '#FFFFFF',
  line: '#D2CDC2', text2: '#414A52', text3: '#656C74', green: '#0C6E52',
  greenSoft: '#DEEFE8', brass: '#A97F42', brassSoft: '#F3E9D9', tealSoft: '#DCEDED'
};
const epicNames = {
  1: 'Foundation, accounts & tenancy', 2: 'Product catalog & variants', 3: 'Inventory ledger',
  4: 'Order capture & lifecycle', 5: 'Courier & COD settlement', 6: 'Decision-first dashboard',
  7: 'Customers & dues', 8: 'Suppliers & purchases', 9: 'Expenses', 10: 'Reports & exports',
  11: 'Audit & reversals', 12: 'Safe insight assistant'
};

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function addBox(slide, x, y, w, h, fill, radius = 0, line = 'none') {
  return slide.shapes.add({
    geometry: radius ? 'roundRect' : 'rect',
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { fill: line, width: line === 'none' ? 0 : 1 },
    ...(radius ? { borderRadius: radius } : {})
  });
}

function addText(slide, text, x, y, w, h, options = {}) {
  const shape = slide.shapes.add({
    geometry: 'textbox',
    position: { left: x, top: y, width: w, height: h },
    fill: 'none', line: { fill: 'none', width: 0 }
  });
  shape.text = text;
  shape.text.style = {
    typeface: options.font || bodyFont,
    fontSize: options.size || 24,
    bold: Boolean(options.bold),
    italic: Boolean(options.italic),
    color: options.color || colors.ink,
    alignment: options.align || 'left',
    verticalAlignment: options.valign || 'top',
    autoFit: options.autoFit || 'none'
  };
  return shape;
}

async function addImage(slide, imagePath, x, y, w, h, alt, fit = 'contain', radius = 0) {
  const bytes = new Uint8Array(await fs.readFile(imagePath));
  return slide.images.add({
    blob: bytes, contentType: 'image/png', alt, fit,
    position: { left: x, top: y, width: w, height: h },
    geometry: radius ? 'roundRect' : 'rect',
    ...(radius ? { borderRadius: radius } : {})
  });
}

function addSlideNumber(slide, number) {
  addText(slide, String(number).padStart(2, '0'), 1180, 674, 48, 22, { size: 16, bold: true, color: colors.text3, align: 'right' });
}

// 1. Cover
{
  const slide = presentation.slides.add();
  slide.background.fill = colors.ink;
  addBox(slide, 0, 0, 18, 720, colors.green);
  addText(slide, 'SmartBiz BD', 72, 74, 430, 70, { font: displayFont, size: 55, bold: true, color: '#F3F1EC' });
  addText(slide, 'Complete story-to-screen journey', 72, 158, 430, 74, { font: displayFont, size: 35, color: '#C5EEE0' });
  addText(slide, '12 epics  ·  76 stories  ·  76 presentation screens', 75, 258, 430, 55, { size: 23, bold: true, color: '#A8B2BA' });
  addText(slide, 'Bangla-first order-to-cash clarity for small online sellers in Bangladesh', 75, 338, 420, 100, { size: 25, color: '#F3F1EC' });
  await addImage(slide, path.join(workspaceDir, '_bmad-output/planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/mockups/journey-hub-concept.png'), 540, 72, 680, 575, 'SmartBiz BD journey hub design concept', 'contain', 18);
  slide.speakerNotes.textFrame.setText('Sources: approved SmartBiz BD product brief, epics.md, and the authoritative 76-story mockup catalog. Presentation data is synthetic.');
  addSlideNumber(slide, 1);
}

// 2. Short product brief
{
  const slide = presentation.slides.add();
  slide.background.fill = colors.canvas;
  addBox(slide, 0, 0, 1280, 18, colors.green);
  addText(slide, 'SmartBiz BD in brief', 62, 50, 520, 60, { font: displayFont, size: 43, bold: true });
  addText(slide, 'The problem', 62, 140, 460, 30, { size: 22, bold: true, color: colors.green });
  addText(slide, 'Small Facebook and WhatsApp sellers can see sales, but returns, delivery charges, purchase cost, and COD deductions make real profit hard to know.', 62, 176, 480, 100, { size: 23, color: colors.text2 });
  addText(slide, 'The product', 62, 294, 460, 30, { size: 22, bold: true, color: colors.green });
  addText(slide, 'One order-to-cash ledger follows each order from message capture through stock, delivery, collection, settlement, and realized profit.', 62, 330, 480, 92, { size: 23, color: colors.text2 });
  addText(slide, 'The distinction', 62, 442, 460, 30, { size: 22, bold: true, color: colors.green });
  addText(slide, 'Every profit figure states its recognition basis and completeness. Missing cost stays visible instead of becoming false precision.', 62, 478, 480, 100, { size: 23, color: colors.text2 });
  addText(slide, 'Primary audience: owner-led social-commerce businesses handling 10 to 50 orders a day.', 62, 608, 480, 54, { size: 21, bold: true, color: colors.ink2 });
  await addImage(slide, path.join(workspaceDir, '_bmad-output/planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/mockups/desktop-home.png'), 585, 90, 640, 540, 'SmartBiz BD desktop dashboard mockup', 'contain', 16);
  slide.speakerNotes.textFrame.setText('Source: _bmad-output/planning-artifacts/briefs/brief-SmartBiz-2026-09-06/brief.md.');
  addSlideNumber(slide, 2);
}

// 3. Journey overview
{
  const slide = presentation.slides.add();
  slide.background.fill = colors.canvas;
  addBox(slide, 0, 0, 18, 720, colors.brass);
  addText(slide, 'Journey coverage', 62, 56, 350, 54, { font: displayFont, size: 42, bold: true });
  addText(slide, '76 / 76', 62, 140, 320, 82, { font: displayFont, size: 62, bold: true, color: colors.green });
  addText(slide, 'Every story in epics.md has a directly addressable static prototype screen.', 62, 235, 320, 116, { size: 24, color: colors.text2 });
  addText(slide, 'Sequence', 62, 390, 320, 28, { size: 22, bold: true, color: colors.green });
  addText(slide, 'Foundation first, then catalog, inventory, order lifecycle, settlement, reporting, audit, and safe insights.', 62, 430, 320, 130, { size: 23, color: colors.text2 });
  await addImage(slide, path.join(workspaceDir, 'prototype/tests/shots/desktop-journeys.png'), 420, 76, 810, 565, 'Complete SmartBiz BD journey hub', 'contain', 14);
  slide.speakerNotes.textFrame.setText('The journey hub consumes the approved mockup map directly. Story IDs and titles therefore stay aligned with epics.md.');
  addSlideNumber(slide, 3);
}

// 4. Guide
{
  const slide = presentation.slides.add();
  slide.background.fill = colors.ink;
  addText(slide, 'How to read the journey', 72, 64, 760, 58, { font: displayFont, size: 44, bold: true, color: '#F3F1EC' });
  addText(slide, '12 epics   76 stories   76 screens', 72, 158, 900, 62, { font: displayFont, size: 42, color: '#C5EEE0' });
  addBox(slide, 72, 270, 8, 320, colors.green);
  addText(slide, 'Story order', 112, 264, 260, 34, { size: 24, bold: true, color: '#F3F1EC' });
  addText(slide, 'Slides follow the exact epic and story sequence.', 112, 306, 300, 76, { size: 23, color: '#A8B2BA' });
  addText(slide, 'Each screen', 470, 264, 260, 34, { size: 24, bold: true, color: '#F3F1EC' });
  addText(slide, 'A designed state, one primary action, and the evidence the audience should notice.', 470, 306, 310, 112, { size: 23, color: '#A8B2BA' });
  addText(slide, 'System stories', 850, 264, 280, 34, { size: 24, bold: true, color: '#F3F1EC' });
  addText(slide, 'Tenant isolation, permissions, rendering, and AI safeguards appear as explicit proof surfaces.', 850, 306, 315, 130, { size: 23, color: '#A8B2BA' });
  addText(slide, 'The deck shows synthetic presentation data. It demonstrates UX coverage rather than production readiness.', 112, 530, 1030, 64, { size: 24, bold: true, color: '#EADFCB' });
  slide.speakerNotes.textFrame.setText('Use the story number at the top of each slide to correlate the screen with epics.md.');
  addSlideNumber(slide, 4);
}

// 5-80. Every story screen, sequentially
for (let index = 0; index < manifest.length; index++) {
  const story = manifest[index];
  const slideNumber = index + 5;
  const slide = presentation.slides.add();
  slide.background.fill = colors.canvas;
  addBox(slide, 0, 0, 18, 720, story.kind === 'proof' ? colors.brass : colors.green);
  addText(slide, `EPIC ${story.epic}  ·  STORY ${story.id}`, 54, 42, 340, 28, { size: 18, bold: true, color: colors.green });
  addText(slide, epicNames[story.epic], 54, 76, 340, 28, { size: 20, color: colors.text3 });
  const titleSize = story.title.length > 66 ? 27 : story.title.length > 44 ? 30 : 34;
  addText(slide, story.title, 54, 124, 350, 118, { font: displayFont, size: titleSize, bold: true, autoFit: 'shrinkText' });
  addText(slide, story.surface, 54, 250, 340, 35, { size: 22, bold: true, color: colors.green });
  addText(slide, `State: ${story.state}`, 54, 292, 340, 70, { size: 22, color: colors.text2 });
  addText(slide, 'Visible proof', 54, 382, 340, 28, { size: 21, bold: true, color: colors.ink2 });
  let proofY = 420;
  for (const proof of story.evidence) {
    addText(slide, '✓', 54, proofY, 28, 38, { size: 23, bold: true, color: colors.green });
    addText(slide, proof, 88, proofY, 305, 66, { size: 21, color: colors.text2, autoFit: 'shrinkText' });
    proofY += 72;
  }
  addText(slide, `Primary action: ${story.action}`, 54, 646, 340, 38, { size: 19, bold: true, color: colors.brass });

  addBox(slide, 430, 44, 802, 632, '#E9E6DF', 18, colors.line);
  if (story.mode === 'phone') {
    await addImage(slide, story.image, 674, 60, 314, 600, `Story ${story.id}: ${story.surface}, phone prototype`, 'contain');
  } else {
    await addImage(slide, story.image, 446, 108, 770, 500, `Story ${story.id}: ${story.surface}, desktop prototype`, 'contain', 12);
  }
  addSlideNumber(slide, slideNumber);
  slide.speakerNotes.textFrame.setText(`Source: epics.md Story ${story.id}, ${story.title}. Prototype target: #/${story.route}. Presentation data is synthetic.`);
}

if (presentation.slides.items.length !== 80) throw new Error(`Expected 80 slides, built ${presentation.slides.items.length}.`);

const stagingDir = path.join(workspaceDir, '.codex-finalizer');
await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });
const candidatePath = path.join(stagingDir, 'SmartBiz-BD-Full-Journey-clean-candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const requirements = {
  explicitTotalSlideCount: 80,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: []
};
const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: 'design', families: [bodyFont, displayFont] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, 'SmartBiz-BD-Full-Journey-clean.validation.json')
});

console.log(JSON.stringify({ slides: presentation.slides.items.length, final: FINAL_PPTX, result }, null, 2));
