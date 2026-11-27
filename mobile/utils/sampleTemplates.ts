/**
 * Sample template metadata, exact SVG vector illustrations, and normalized contours
 * matching reference/master_foldly_photo_to_3d_paper_craft_studio.html.
 */

export interface ContourPoint {
  x: number;
  y: number;
}

export interface SampleTemplate {
  id: 'crossing' | 'sneaker' | 'fox' | 'boba';
  name: string;
  shortName: string;
  category: 'Signs' | 'Style' | 'Animals' | 'Drinks';
  tags: string[];
  edgeColorHex: string;
  suggestStand: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estMinutes: number;
  heightCm: number;
  depthCm: number;
  moldStyle: 'block' | 'standee';
  buildTip: string;
  svgMarkup: string;
  contour: ContourPoint[];
}

export const SAMPLE_TEMPLATES: Record<'crossing' | 'sneaker' | 'fox' | 'boba', SampleTemplate> = {
  crossing: {
    id: 'crossing',
    name: 'Pedestrian Crossing Sign',
    shortName: 'Crossing',
    category: 'Signs',
    tags: ['Easy', 'Signs'],
    edgeColorHex: '#e63946',
    suggestStand: true,
    difficulty: 'Easy',
    estMinutes: 14,
    heightCm: 18,
    depthCm: 2.5,
    moldStyle: 'block',
    buildTip: 'Keep the pole section slightly wider with the white cut margin so it stands super sturdy!',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420">
      <rect x="162" y="344" width="96" height="36" rx="12" fill="#d6d3ce" stroke="#334155" stroke-width="5"/>
      <rect x="197" y="186" width="26" height="27" fill="#1e293b"/>
      <rect x="197" y="213" width="26" height="27" fill="#f8fafc"/>
      <rect x="197" y="240" width="26" height="27" fill="#1e293b"/>
      <rect x="197" y="267" width="26" height="27" fill="#f8fafc"/>
      <rect x="197" y="294" width="26" height="27" fill="#1e293b"/>
      <rect x="197" y="321" width="26" height="27" fill="#f8fafc"/>
      <rect x="197" y="186" width="26" height="162" fill="none" stroke="#17201d" stroke-width="4"/>
      <polygon points="210,40 318,198 102,198" fill="#ef233c" stroke="#b91c1c" stroke-width="6" stroke-linejoin="round"/>
      <polygon points="210,74 286,180 134,180" fill="#ffffff" stroke-linejoin="round"/>
      <polygon points="152,152 161,152 158,173 146,173" fill="#111827"/>
      <polygon points="172,152 181,152 180,173 168,173" fill="#111827"/>
      <polygon points="192,152 201,152 202,173 190,173" fill="#111827"/>
      <polygon points="211,152 220,152 223,173 211,173" fill="#111827"/>
      <polygon points="231,152 240,152 245,173 233,173" fill="#111827"/>
      <polygon points="251,152 260,152 267,173 255,173" fill="#111827"/>
      <circle cx="212" cy="107" r="7.5" fill="#111827"/>
      <path d="M211,116 L208,138 M210,121 L194,131 M210,121 L223,134 M208,137 L196,157 M208,137 L220,156" stroke="#111827" stroke-width="7.5" stroke-linecap="round" fill="none"/>
    </svg>`,
    contour: [
      { x: 0.50, y: 0.08 },
      { x: 0.77, y: 0.47 },
      { x: 0.57, y: 0.48 },
      { x: 0.57, y: 0.81 },
      { x: 0.62, y: 0.83 },
      { x: 0.62, y: 0.91 },
      { x: 0.38, y: 0.91 },
      { x: 0.38, y: 0.83 },
      { x: 0.43, y: 0.81 },
      { x: 0.43, y: 0.48 },
      { x: 0.23, y: 0.47 },
    ],
  },
  sneaker: {
    id: 'sneaker',
    name: 'Retro Sneaker',
    shortName: 'Retro',
    category: 'Style',
    tags: ['Style'],
    edgeColorHex: '#3b78f0',
    suggestStand: true,
    difficulty: 'Medium',
    estMinutes: 18,
    heightCm: 16,
    depthCm: 3.2,
    moldStyle: 'block',
    buildTip: 'Stuff a pinch of cotton inside the toe area before sealing the back for a cool 3D squishy feel!',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420">
      <rect x="54" y="248" width="314" height="52" rx="20" fill="#f8fafc" stroke="#17201d" stroke-width="7"/>
      <rect x="62" y="282" width="298" height="14" rx="5" fill="#ef4444"/>
      <path d="M64,250 L64,146 Q118,128 158,162 L246,194 Q356,204 360,250 Z" fill="#3b82f6" stroke="#17201d" stroke-width="7" stroke-linejoin="round"/>
      <rect x="64" y="132" width="72" height="42" rx="14" fill="#facc15" stroke="#17201d" stroke-width="7"/>
      <polygon points="136,232 234,208 246,224 148,244" fill="#ffffff"/>
      <path d="M166,170 L186,160 M190,179 L210,169 M214,188 L234,178" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
    </svg>`,
    contour: [
      { x: 0.14, y: 0.31 },
      { x: 0.33, y: 0.31 },
      { x: 0.42, y: 0.39 },
      { x: 0.62, y: 0.46 },
      { x: 0.85, y: 0.51 },
      { x: 0.89, y: 0.61 },
      { x: 0.88, y: 0.72 },
      { x: 0.13, y: 0.72 },
      { x: 0.13, y: 0.60 },
    ],
  },
  fox: {
    id: 'fox',
    name: 'Fox Sticker',
    shortName: 'Fox',
    category: 'Animals',
    tags: ['Easy', 'Animals'],
    edgeColorHex: '#f97316',
    suggestStand: true,
    difficulty: 'Easy',
    estMinutes: 12,
    heightCm: 15,
    depthCm: 2.2,
    moldStyle: 'standee',
    buildTip: 'Fold the Side Strip cleanly around the pointy ears first so they stay sharp.',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420">
      <polygon points="106,185 86,66 186,130" fill="#f97316" stroke="#17201d" stroke-width="7" stroke-linejoin="round"/>
      <polygon points="314,185 334,66 234,130" fill="#f97316" stroke="#17201d" stroke-width="7" stroke-linejoin="round"/>
      <polygon points="114,158 104,96 160,134" fill="#fed7aa"/>
      <polygon points="306,158 316,96 260,134" fill="#fed7aa"/>
      <path d="M74,210 Q105,114 210,114 Q315,114 346,210 Q310,326 210,344 Q110,326 74,210 Z" fill="#f97316" stroke="#17201d" stroke-width="7"/>
      <path d="M82,222 Q148,224 210,336 Q126,318 82,222 Z" fill="#ffffff"/>
      <path d="M338,222 Q272,224 210,336 Q294,318 338,222 Z" fill="#ffffff"/>
      <circle cx="154" cy="216" r="15" fill="#17201d"/>
      <circle cx="266" cy="216" r="15" fill="#17201d"/>
      <circle cx="149" cy="211" r="5" fill="#ffffff"/>
      <circle cx="261" cy="211" r="5" fill="#ffffff"/>
      <ellipse cx="210" cy="296" rx="22" ry="15" fill="#17201d"/>
    </svg>`,
    contour: [
      { x: 0.20, y: 0.15 },
      { x: 0.44, y: 0.28 },
      { x: 0.56, y: 0.28 },
      { x: 0.80, y: 0.15 },
      { x: 0.83, y: 0.50 },
      { x: 0.72, y: 0.76 },
      { x: 0.50, y: 0.84 },
      { x: 0.28, y: 0.76 },
      { x: 0.17, y: 0.50 },
    ],
  },
  boba: {
    id: 'boba',
    name: 'Boba Tea Cup',
    shortName: 'Boba',
    category: 'Drinks',
    tags: ['Easy', 'Drinks'],
    edgeColorHex: '#d97706',
    suggestStand: true,
    difficulty: 'Easy',
    estMinutes: 13,
    heightCm: 16,
    depthCm: 2.8,
    moldStyle: 'block',
    buildTip: 'Match the numbered glue tabs around the straw first, then work down the cup sides.',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420">
      <rect x="194" y="42" width="32" height="110" rx="10" fill="#ec4899" stroke="#17201d" stroke-width="7"/>
      <path d="M118,154 A92,92 0 0,1 302,154 Z" fill="#e0f2fe" stroke="#17201d" stroke-width="7"/>
      <polygon points="116,154 304,154 274,366 146,366" fill="#f3d0a2" stroke="#17201d" stroke-width="7" stroke-linejoin="round"/>
      <rect x="102" y="142" width="216" height="24" rx="12" fill="#f4c430" stroke="#17201d" stroke-width="7"/>
      <circle cx="168" cy="342" r="12" fill="#291d18"/>
      <circle cx="196" cy="346" r="12" fill="#291d18"/>
      <circle cx="224" cy="342" r="12" fill="#291d18"/>
      <circle cx="250" cy="340" r="12" fill="#291d18"/>
      <circle cx="182" cy="318" r="12" fill="#291d18"/>
      <circle cx="212" cy="322" r="12" fill="#291d18"/>
      <circle cx="240" cy="318" r="12" fill="#291d18"/>
      <circle cx="178" cy="228" r="8" fill="#17201d"/>
      <circle cx="242" cy="228" r="8" fill="#17201d"/>
      <path d="M198,238 Q210,252 222,238" stroke="#17201d" stroke-width="5" stroke-linecap="round" fill="none"/>
      <ellipse cx="158" cy="242" rx="10" ry="6" fill="#fca5a5"/>
      <ellipse cx="262" cy="242" rx="10" ry="6" fill="#fca5a5"/>
    </svg>`,
    contour: [
      { x: 0.45, y: 0.09 },
      { x: 0.55, y: 0.09 },
      { x: 0.55, y: 0.20 },
      { x: 0.74, y: 0.33 },
      { x: 0.77, y: 0.39 },
      { x: 0.66, y: 0.88 },
      { x: 0.34, y: 0.88 },
      { x: 0.23, y: 0.39 },
      { x: 0.26, y: 0.33 },
      { x: 0.45, y: 0.20 },
    ],
  },
};

export function svgMarkupToDataUri(svgMarkup: string): string {
  // UTF-8 safe data URI for RN WebView & HTML/PDF rendering
  const encoded = encodeURIComponent(svgMarkup.replace(/\s+/g, ' ').trim());
  return `data:image/svg+xml;utf8,${encoded}`;
}
