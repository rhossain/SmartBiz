const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const inputDir = path.join(__dirname, 'rendered-clean');
const outputDir = path.join(__dirname, 'contact-sheets');
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  for (let start = 1; start <= 80; start += 6) {
    const end = Math.min(start + 5, 80);
    const composite = [];
    for (let slide = start; slide <= end; slide++) {
      const source = path.join(inputDir, `slide-${String(slide).padStart(2, '0')}.png`);
      const input = await sharp(source).resize(640, 360).png().toBuffer();
      const slot = slide - start;
      composite.push({ input, left: (slot % 2) * 640, top: Math.floor(slot / 2) * 360 });
    }
    const output = path.join(outputDir, `slides-${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}.png`);
    await sharp({ create: { width: 1280, height: 1080, channels: 4, background: '#d8d4cb' } })
      .composite(composite)
      .png()
      .toFile(output);
  }
})();
