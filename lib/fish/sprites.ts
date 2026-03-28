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

export type Species = 'auto' | 'clownfish' | 'angelfish' | 'pufferfish';

export const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: 'auto', label: 'Auto (from module)' },
  { value: 'clownfish', label: 'Clownfish' },
  { value: 'angelfish', label: 'Angelfish' },
  { value: 'pufferfish', label: 'Pufferfish' },
];

const MODULE_HUE: Record<string, number> = {
  regulatory: 25,
  due_diligence: 220,
  earnings: 140,
};

const MODULE_SPECIES: Record<string, string> = {
  regulatory: 'clownfish',
  due_diligence: 'angelfish',
  earnings: 'pufferfish',
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
};

export function generateFishSVG(
  module: 'regulatory' | 'due_diligence' | 'earnings',
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

  const vw = species === 'pufferfish' ? 72 : 80;
  const vh = species === 'angelfish' ? 56 : species === 'pufferfish' ? 56 : 48;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh + 16}" width="${vw}" height="${vh + 16}">${body}${acc}</svg>`;
}

function fishBody(species: string, h: number): string {
  switch (species) {
    case 'clownfish': return clownfishBody(h);
    case 'angelfish': return angelfishBody(h);
    case 'pufferfish': return pufferfishBody(h);
    default: return clownfishBody(h);
  }
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
