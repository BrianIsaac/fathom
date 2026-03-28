import type { FishConfig } from '../agents/types';

export type Accessory = 'none' | 'top_hat' | 'party_hat' | 'crown' | 'beanie' | 'glasses' | 'monocle' | 'bow_tie' | 'scarf';

export const ACCESSORY_OPTIONS: { value: Accessory; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'top_hat', label: 'Top Hat' },
  { value: 'party_hat', label: 'Party Hat' },
  { value: 'crown', label: 'Crown' },
  { value: 'beanie', label: 'Beanie' },
  { value: 'glasses', label: 'Glasses' },
  { value: 'monocle', label: 'Monocle' },
  { value: 'bow_tie', label: 'Bow Tie' },
  { value: 'scarf', label: 'Scarf' },
];

export const COLOUR_OPTIONS = [
  { value: 'auto', label: 'Auto (from module)' },
  { value: '25', label: 'Orange' },
  { value: '0', label: 'Red' },
  { value: '200', label: 'Cyan' },
  { value: '270', label: 'Purple' },
  { value: '320', label: 'Pink' },
  { value: '50', label: 'Gold' },
  { value: '140', label: 'Green' },
];

export type Species = 'auto' | 'clownfish' | 'angelfish' | 'pufferfish' | 'tinyfish' | 'tinyfish_coder' | 'tinyfish_matrix';

export const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: 'auto', label: 'Auto (from module)' },
  { value: 'tinyfish', label: 'TinyFish' },
  { value: 'tinyfish_coder', label: 'TinyFish Coder' },
  { value: 'tinyfish_matrix', label: 'TinyFish Matrix' },
  { value: 'clownfish', label: 'Clownfish' },
  { value: 'angelfish', label: 'Angelfish' },
  { value: 'pufferfish', label: 'Pufferfish' },
];

const MODULE_HUE: Record<string, number> = {
  regulatory: 25,
  due_diligence: 220,
  earnings: 140,
  cyber: 0,
};

const MODULE_SPECIES: Record<string, string> = {
  regulatory: 'clownfish',
  due_diligence: 'angelfish',
  earnings: 'pufferfish',
  cyber: 'pufferfish',
};

/**
 * Per-species anchor points in FINAL SVG space (after translate(0,8) applied to body).
 * hatX/hatY = centre-top of head (where hat brim sits)
 * eyeX/eyeY = centre of the eye
 * chinX/chinY = front-bottom of head (bow tie / scarf)
 */
interface FishAnchors {
  hatX: number; hatY: number;
  eyeX: number; eyeY: number;
  chinX: number; chinY: number;
}

const ANCHORS: Record<string, FishAnchors> = {
  clownfish: { hatX: 48, hatY: 16, eyeX: 58, eyeY: 28, chinX: 48, chinY: 42 },
  angelfish: { hatX: 38, hatY: 16, eyeX: 52, eyeY: 32, chinX: 44, chinY: 50 },
  pufferfish: { hatX: 36, hatY: 14, eyeX: 46, eyeY: 32, chinX: 38, chinY: 50 },
  tinyfish: { hatX: 36, hatY: 12, eyeX: 51, eyeY: 22, chinX: 44, chinY: 42 },
  tinyfish_coder: { hatX: 38, hatY: 12, eyeX: 54, eyeY: 28, chinX: 46, chinY: 44 },
  tinyfish_matrix: { hatX: 36, hatY: 12, eyeX: 55, eyeY: 21, chinX: 50, chinY: 40 },
};

export function generateFishSVG(
  module: string,
  seed: string,
  config?: FishConfig,
): string {
  const hash = Array.from(seed).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const hueShift = Math.abs(hash % 20) - 10;

  const baseHue = config?.colour && config.colour !== 'auto'
    ? Number(config.colour)
    : MODULE_HUE[module];
  const h = baseHue + hueShift;
  const accessory = config?.accessory ?? 'none';

  const species = config?.species && config.species !== 'auto'
    ? config.species
    : MODULE_SPECIES[module] ?? 'clownfish';

  const body = fishBody(species, h);
  const anchors = ANCHORS[species];
  const acc = accessorySVG(accessory, anchors);

  const isTiny = species.startsWith('tinyfish');
  const vw = species === 'pufferfish' || isTiny ? 72 : 80;
  const vh = species === 'angelfish' || species === 'pufferfish' || isTiny ? 56 : 48;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh + 16}" width="${vw}" height="${vh + 16}">${body}${acc}</svg>`;
}

function fishBody(species: string, h: number): string {
  switch (species) {
    case 'tinyfish': return tinyfishBody(h);
    case 'tinyfish_coder': return tinyfishCoderBody(h);
    case 'tinyfish_matrix': return tinyfishMatrixBody(h);
    case 'clownfish': return clownfishBody(h);
    case 'angelfish': return angelfishBody(h);
    case 'pufferfish': return pufferfishBody(h);
    default: return clownfishBody(h);
  }
}

function tinyfishBody(h: number): string {
  return `<g transform="translate(0,8)">
    <path d="M14 24 C8 18, 6 11, 13 9 C18 8, 22 12, 24 17 C26 12, 30 8, 35 9 C42 11, 40 18, 34 24 C40 30, 42 37, 35 39 C30 40, 26 36, 24 31 C22 36, 18 40, 13 39 C6 37, 8 30, 14 24 Z" fill="hsl(${h}, 80%, 55%)" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <ellipse cx="39" cy="24" rx="23" ry="19" fill="hsl(${h}, 80%, 55%)" stroke="#1a1a2e" stroke-width="2.5"/>
    <path d="M28 11 C40 8, 54 13, 58 23 C55 33, 42 39, 30 35 C23 32, 20 26, 21 20 C22 16, 24 13, 28 11 Z" fill="hsl(${h}, 65%, 80%)" stroke="none"/>
    <path d="M36 8 C39 2, 46 1, 49 8 C45 10, 40 11, 36 8 Z" fill="hsl(${h}, 80%, 55%)" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M34 38 C38 43, 46 43, 49 36 C44 35, 38 35, 34 38 Z" fill="hsl(${h}, 80%, 55%)" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="51" cy="22" rx="5.8" ry="7.2" fill="#ffffff" stroke="#1a1a2e" stroke-width="2.5"/>
    <ellipse cx="52.5" cy="23.5" rx="2.8" ry="3.6" fill="#1a1a2e"/>
    <circle cx="53.4" cy="21.5" r="1" fill="#ffffff"/>
    <path d="M47 31 C49 33, 52 33.5, 54 31.5" fill="none" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="46" cy="28.5" r="1.4" fill="hsl(${h}, 80%, 68%)" opacity="0.75"/>
  </g>`;
}

function tinyfishCoderBody(h: number): string {
  return `<g transform="translate(0,8)">
    <path d="M12 24 C6 18, 6 10, 14 10 C18 10, 21 13, 22 17 C23 13, 26 10, 30 10 C38 10, 38 18, 32 24 C27 29, 17 29, 12 24 Z" fill="hsl(${h}, 78%, 55%)" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="38" cy="26" rx="24" ry="20" fill="hsl(${h}, 78%, 55%)" stroke="#1a1a2e" stroke-width="2.5"/>
    <ellipse cx="43" cy="29" rx="18" ry="15" fill="hsl(38, 72%, 82%)" stroke="#1a1a2e" stroke-width="2.5"/>
    <path d="M34 9 C36 3, 43 2, 47 8 C43 10, 38 11, 34 9 Z" fill="hsl(${h}, 78%, 55%)" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M21 38 C16 42, 15 48, 20 51 C24 49, 27 44, 26 39 Z" fill="hsl(${h}, 78%, 55%)" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M23 17 C25 8, 35 4, 46 6 C56 8, 61 16, 58 23 C52 20, 43 19, 34 19 C29 19, 25 18, 23 17 Z" fill="#1a1a2e" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="42" cy="27" r="5.5" fill="none" stroke="#1a1a2e" stroke-width="2.5"/>
    <circle cx="53" cy="27" r="5.5" fill="none" stroke="#1a1a2e" stroke-width="2.5"/>
    <path d="M47.5 27 L47.5 27" fill="none" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M36.8 24.8 C35.5 24.3, 34.2 24.4, 33 25.2" fill="none" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="54" cy="27.8" rx="2.7" ry="3.5" fill="#1a1a2e"/>
    <circle cx="55.1" cy="26.6" r="0.9" fill="#ffffff"/>
    <path d="M46 35 C48.5 37.2, 52 37.2, 54.5 35" fill="none" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M31 35 C27 36, 24 39, 24 43 C28 44, 32 42, 34 39 C34.5 37.5, 33.5 36, 31 35 Z" fill="hsl(${h}, 78%, 55%)" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M18 39 L28 37 L33 42 L23 44 Z" fill="#20243a" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M22 31 L31 29 L31 39 L22 41 Z" fill="#163325" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M24 33 L29 32 M24 35 L29 34 M24 37 L28.5 36 M24 39 L27.8 38" fill="none" stroke="#33dd77" stroke-width="1.2" stroke-linecap="round"/>
  </g>`;
}

function tinyfishMatrixBody(h: number): string {
  return `<g transform="translate(0,8)">
    <path d="M14 24 C8 18, 6 12, 11 10 C15 9, 19 12, 21 17 C23 12, 27 9, 31 10 C36 12, 34 18, 28 24 C34 30, 36 36, 31 38 C27 39, 23 36, 21 31 C19 36, 15 39, 11 38 C6 36, 8 30, 14 24 Z" fill="#0a3d0a" stroke="#001a00" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M28 14 C30 8, 36 6, 41 10 C39 15, 34 18, 29 18 Z" fill="#0a3d0a" stroke="#001a00" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M30 40 C33 45, 39 47, 44 43 C42 38, 36 36, 31 37 Z" fill="#0a3d0a" stroke="#001a00" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M20 24 C20 13, 30 6, 44 6 C58 6, 67 14, 67 24 C67 35, 58 43, 44 43 C30 43, 20 35, 20 24 Z" fill="#0a3d0a" stroke="#001a00" stroke-width="2.5" stroke-linejoin="round"/>
    <defs><clipPath id="tf-matrix-clip"><path d="M20 24 C20 13, 30 6, 44 6 C58 6, 67 14, 67 24 C67 35, 58 43, 44 43 C30 43, 20 35, 20 24 Z"/></clipPath></defs>
    <g clip-path="url(#tf-matrix-clip)">
      <rect x="24" y="8" width="1.1" height="34" fill="#00ff41" opacity="0.22"/>
      <rect x="26.5" y="7" width="0.9" height="35" fill="#00ff41" opacity="0.34"/>
      <rect x="29" y="9" width="1.2" height="32" fill="#00ff41" opacity="0.26"/>
      <rect x="31.5" y="8" width="0.8" height="33" fill="#00ff41" opacity="0.42"/>
      <rect x="34" y="7" width="1.1" height="35" fill="#00ff41" opacity="0.28"/>
      <rect x="36.5" y="8" width="0.9" height="33" fill="#00ff41" opacity="0.38"/>
      <rect x="39" y="7" width="1.2" height="35" fill="#00ff41" opacity="0.24"/>
      <rect x="41.5" y="8" width="0.8" height="33" fill="#00ff41" opacity="0.44"/>
      <rect x="44" y="7" width="1.1" height="35" fill="#00ff41" opacity="0.27"/>
      <rect x="46.5" y="8" width="0.9" height="33" fill="#00ff41" opacity="0.36"/>
      <rect x="49" y="9" width="1.2" height="31" fill="#00ff41" opacity="0.23"/>
      <rect x="51.5" y="8" width="0.8" height="33" fill="#00ff41" opacity="0.41"/>
      <rect x="54" y="10" width="1.1" height="29" fill="#00ff41" opacity="0.25"/>
      <rect x="56.5" y="11" width="0.9" height="27" fill="#00ff41" opacity="0.33"/>
      <rect x="26.5" y="12" width="0.9" height="2" fill="#00ff41" opacity="0.65"/>
      <rect x="29" y="19" width="1.2" height="2.5" fill="#00ff41" opacity="0.7"/>
      <rect x="31.5" y="14" width="0.8" height="3" fill="#00ff41" opacity="0.72"/>
      <rect x="34" y="25" width="1.1" height="2.5" fill="#00ff41" opacity="0.68"/>
      <rect x="36.5" y="17" width="0.9" height="2.2" fill="#00ff41" opacity="0.74"/>
      <rect x="39" y="28" width="1.2" height="2.5" fill="#00ff41" opacity="0.7"/>
      <rect x="41.5" y="13" width="0.8" height="2.8" fill="#00ff41" opacity="0.76"/>
      <rect x="44" y="22" width="1.1" height="2.4" fill="#00ff41" opacity="0.7"/>
      <rect x="46.5" y="16" width="0.9" height="2.1" fill="#00ff41" opacity="0.75"/>
      <rect x="49" y="26" width="1.2" height="2.6" fill="#00ff41" opacity="0.68"/>
      <rect x="51.5" y="18" width="0.8" height="2.3" fill="#00ff41" opacity="0.73"/>
      <rect x="54" y="14" width="1.1" height="2.2" fill="#00ff41" opacity="0.66"/>
    </g>
    <ellipse cx="55" cy="21" rx="5.4" ry="7" fill="#00ff41" stroke="#001a00" stroke-width="2.2"/>
    <ellipse cx="56.2" cy="22.2" rx="2.2" ry="3.2" fill="#001a00"/>
    <circle cx="53.5" cy="18.2" r="1.1" fill="#d8ffd8"/>
    <path d="M52 30 C54 32, 57 32.5, 59.5 30.8" fill="none" stroke="#001a00" stroke-width="2.3" stroke-linecap="round"/>
  </g>`;
}

function clownfishBody(h: number): string {
  return `<g transform="translate(0,8)">
    <polygon points="8,24 0,14 0,34" fill="hsl(${h}, 85%, 50%)"/>
    <ellipse cx="36" cy="24" rx="28" ry="16" fill="hsl(${h}, 90%, 55%)"/>
    <rect x="22" y="8" width="5" height="32" rx="2" fill="white" opacity="0.9"/>
    <rect x="38" y="10" width="5" height="28" rx="2" fill="white" opacity="0.9"/>
    <ellipse cx="54" cy="18" rx="12" ry="6" fill="hsl(${h}, 80%, 45%)" transform="rotate(-15, 54, 18)"/>
    <circle cx="58" cy="20" r="4.5" fill="white"/>
    <circle cx="59.5" cy="20" r="2.5" fill="#1a1a2e"/>
    <circle cx="60" cy="19" r="0.8" fill="white"/>
  </g>`;
}

function angelfishBody(h: number): string {
  return `<g transform="translate(0,8)">
    <polygon points="10,28 2,16 2,40" fill="hsl(${h}, 70%, 45%)"/>
    <ellipse cx="38" cy="28" rx="26" ry="18" fill="hsl(${h}, 75%, 55%)"/>
    <ellipse cx="38" cy="28" rx="18" ry="12" fill="hsl(${h}, 65%, 65%)" opacity="0.5"/>
    <polygon points="28,8 36,14 20,14" fill="hsl(${h}, 80%, 50%)"/>
    <polygon points="28,48 36,42 20,42" fill="hsl(${h}, 80%, 50%)"/>
    <circle cx="52" cy="24" r="4.5" fill="white"/>
    <circle cx="53.5" cy="24" r="2.5" fill="#1a1a2e"/>
    <circle cx="54" cy="23" r="0.8" fill="white"/>
  </g>`;
}

function pufferfishBody(h: number): string {
  const spines = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const x = 34 + Math.cos(angle) * 19;
    const y = 28 + Math.sin(angle) * 19;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="hsl(${h}, 70%, 40%)" opacity="0.6"/>`;
  }).join('');

  return `<g transform="translate(0,8)">
    <polygon points="6,28 0,20 0,36" fill="hsl(${h}, 60%, 45%)"/>
    <circle cx="34" cy="28" r="22" fill="hsl(${h}, 65%, 55%)"/>
    <circle cx="34" cy="28" r="16" fill="hsl(${h}, 55%, 65%)" opacity="0.5"/>
    ${spines}
    <ellipse cx="36" cy="14" rx="8" ry="4" fill="hsl(${h}, 70%, 50%)" transform="rotate(-10, 36, 14)"/>
    <circle cx="46" cy="24" r="5" fill="white"/>
    <circle cx="47.5" cy="24" r="3" fill="#1a1a2e"/>
    <circle cx="48" cy="23" r="1" fill="white"/>
  </g>`;
}

function accessorySVG(accessory: Accessory, a: FishAnchors): string {
  switch (accessory) {
    case 'top_hat':
      return `<g transform="translate(${a.hatX - 8}, ${a.hatY - 14})">
        <rect x="0" y="10" width="16" height="3" rx="1" fill="#1a1a2e"/>
        <rect x="2" y="0" width="12" height="11" rx="2" fill="#1a1a2e"/>
        <rect x="4" y="2" width="8" height="2" rx="1" fill="#8B4513" opacity="0.6"/>
      </g>`;
    case 'party_hat':
      return `<g transform="translate(${a.hatX - 6}, ${a.hatY - 16})">
        <polygon points="6,-2 0,14 12,14" fill="#FF1493"/>
        <polygon points="6,-2 2,14 6,14" fill="#FF69B4" opacity="0.5"/>
        <circle cx="6" cy="-2" r="2.5" fill="#FFD700"/>
        <circle cx="2" cy="8" r="1" fill="#00BFFF"/>
        <circle cx="9" cy="6" r="1" fill="#7FFF00"/>
      </g>`;
    case 'crown':
      return `<g transform="translate(${a.hatX - 8}, ${a.hatY - 10})">
        <polygon points="0,8 2,0 5,5 8,-2 11,5 14,0 16,8" fill="#FFD700"/>
        <rect x="0" y="6" width="16" height="3" rx="1" fill="#DAA520"/>
        <circle cx="4" cy="2" r="1.2" fill="#FF0000"/>
        <circle cx="8" cy="0" r="1.2" fill="#0000FF"/>
        <circle cx="12" cy="2" r="1.2" fill="#00FF00"/>
      </g>`;
    case 'beanie':
      return `<g transform="translate(${a.hatX - 10}, ${a.hatY - 10})">
        <ellipse cx="10" cy="8" rx="12" ry="6" fill="#4169E1"/>
        <ellipse cx="10" cy="6" rx="10" ry="4" fill="#4169E1"/>
        <rect x="0" y="7" width="20" height="3" rx="1" fill="#DC143C"/>
        <circle cx="10" cy="0" r="3" fill="#4169E1"/>
      </g>`;
    case 'glasses':
      return `<g transform="translate(${a.eyeX - 14}, ${a.eyeY - 5})">
        <circle cx="5" cy="5" r="5" fill="none" stroke="#1a1a2e" stroke-width="1.5"/>
        <circle cx="17" cy="5" r="5" fill="none" stroke="#1a1a2e" stroke-width="1.5"/>
        <line x1="10" y1="5" x2="12" y2="5" stroke="#1a1a2e" stroke-width="1.5"/>
        <line x1="22" y1="5" x2="25" y2="4" stroke="#1a1a2e" stroke-width="1"/>
        <rect x="2" y="2" width="6" height="6" rx="1" fill="rgba(100,180,255,0.15)"/>
        <rect x="14" y="2" width="6" height="6" rx="1" fill="rgba(100,180,255,0.15)"/>
      </g>`;
    case 'monocle':
      return `<g transform="translate(${a.eyeX - 5}, ${a.eyeY - 5})">
        <circle cx="5" cy="5" r="6" fill="none" stroke="#DAA520" stroke-width="1.5"/>
        <circle cx="5" cy="5" r="4.5" fill="rgba(200,230,255,0.2)"/>
        <line x1="5" y1="11" x2="3" y2="22" stroke="#DAA520" stroke-width="0.8"/>
      </g>`;
    case 'bow_tie':
      return `<g transform="translate(${a.chinX - 8}, ${a.chinY - 4})">
        <polygon points="0,0 8,4 0,8" fill="#FF1493"/>
        <polygon points="16,0 8,4 16,8" fill="#FF1493"/>
        <circle cx="8" cy="4" r="2" fill="#FF69B4"/>
      </g>`;
    case 'scarf':
      return `<g transform="translate(${a.chinX - 10}, ${a.chinY - 4})">
        <path d="M0,2 Q10,0 20,2 Q24,3 24,6 Q20,8 10,6 Q0,4 0,2 Z" fill="#DC143C"/>
        <path d="M16,4 Q18,8 16,14 Q14,16 12,14 Q14,8 16,4 Z" fill="#DC143C" opacity="0.8"/>
        <line x1="2" y1="3" x2="20" y2="3" stroke="#FFD700" stroke-width="0.8"/>
      </g>`;
    default:
      return '';
  }
}
