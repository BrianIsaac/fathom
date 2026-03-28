/**
 * One-time script to generate 3 TinyFish mascot SVG sprites via GPT-5.4 vision.
 * Usage: npx tsx scripts/generate-tinyfish-svg.ts
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
config({ path: join(__dirname, '../.env.local') });

const ROOT = join(__dirname, '../../');

const images = [
  { file: 'photo_3_2026-03-28_12-56-16.jpg', name: 'basic' },
  { file: 'photo_1_2026-03-28_12-56-16.jpg', name: 'coder' },
  { file: 'photo_2_2026-03-28_12-56-16.jpg', name: 'matrix' },
];

async function generateOne(img: typeof images[0], allImages: Buffer[]) {
  console.log(`\nGenerating ${img.name}...`);

  const imageData = readFileSync(join(ROOT, img.file));

  const { text } = await generateText({
    model: openai('gpt-5.4'),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', image: allImages[0] },
          { type: 'image', image: allImages[1] },
          { type: 'image', image: allImages[2] },
          {
            type: 'text',
            text: `These 3 photos show TinyFish mascot stickers on a wooden surface.

CRITICAL ORIENTATION NOTE: In these photos the fish are facing DOWNWARD (head at bottom, tail at top of the sticker). When you create the SVG, you must ROTATE the fish 90 degrees clockwise so it faces RIGHT (head on the right, tail on the left). This is for a swimming animation where fish swim horizontally.

The 3 fish are:
- Image 1: Basic orange TinyFish mascot — round body, orange back, peach/cream belly-face, small side fins, heart-shaped tail, one large eye with white highlight, small curved smile. Clean and simple.
- Image 2: Coder TinyFish — same body shape as basic but wearing round glasses and a dark beret/cap, holding a small laptop with green code on screen. Has an orange body with peach face.
- Image 3: Matrix TinyFish — same body shape but entirely in dark green/black colour scheme with vertical green "matrix code rain" lines across the body. Dark outlines.

I need you to generate the SVG for: **${img.name === 'basic' ? 'Image 1 — the basic orange TinyFish' : img.name === 'coder' ? 'Image 2 — the coder TinyFish with glasses, beret, and laptop' : 'Image 3 — the matrix green TinyFish'}**

Requirements:
- viewBox "0 0 72 64", the fish body should fill most of this space
- Fish faces RIGHT (head/eye on right side, tail on left side)
- The body is round/oval (like a chibi character)
- The heart-shaped tail is on the LEFT side (the back)
- Small side fin(s) on top or bottom
- Bold black outlines (stroke="#1a1a2e" stroke-width="2.5") — this is the signature sticker style
- Large expressive eye on the right side with white sclera, dark pupil, and small white highlight dot
- Small curved smile below the eye
${img.name === 'basic' ? '- Use hsl(h, sat%, light%) for colours so the hue h parameter can shift the orange to any colour\n- Main body: hsl(h, 80%, 55%), lighter belly/face: hsl(h, 65%, 80%)' : ''}
${img.name === 'coder' ? '- Use hsl(h, sat%, light%) for body colours (same as basic fish)\n- Add round glasses (two circles with bridge, dark frames)\n- Add a dark beret/cap on top of the head (#1a1a2e fill)\n- Add a small laptop held by the front fin (dark rectangle with green lines on screen)' : ''}
${img.name === 'matrix' ? '- Use dark green/black colour scheme: body fill #0a3d0a, outlines #001a00\n- Add vertical green lines across the body (matrix code rain effect) using thin rect elements with fill #00ff41 and varying opacity\n- Eye should be green (#00ff41) instead of white\n- The h parameter is accepted but ignored (matrix fish is always green)' : ''}
- Wrap everything in <g transform="translate(0,8)">
- Make it look CUTE and match the chibi sticker art style — rounded shapes, big eye, small body

Output ONLY the raw TypeScript function, nothing else:

function ${img.name === 'basic' ? 'tinyfishBody' : img.name === 'coder' ? 'tinyfishCoderBody' : 'tinyfishMatrixBody'}(h: number): string {
  return \`<g transform="translate(0,8)">
    ...
  </g>\`;
}`,
          },
        ],
      },
    ],
  });

  console.log(`\n=== ${img.name.toUpperCase()} ===\n`);
  console.log(text);
  return text;
}

async function main() {
  const allImages = images.map(img => readFileSync(join(ROOT, img.file)));

  for (const img of images) {
    await generateOne(img, allImages);
  }

  console.log('\n\nDone! Copy the functions above into lib/fish/sprites.ts');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
