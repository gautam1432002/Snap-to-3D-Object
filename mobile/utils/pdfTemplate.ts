/**
 * mobile/utils/pdfTemplate.ts
 * ───────────────────────────
 * Generates millimeter-accurate printable HTML for expo-print (`printAsync` / `printToFileAsync`).
 * Matches Stage 5 SVG vector layout from master_foldly_photo_to_3d_paper_craft_studio.html:
 * - Strict @page millimeter sizing (210mm × 297mm A4 or 215.9mm × 279.4mm Letter)
 * - Page 1: 50mm ruler, inline base64 Front + Mirrored Back + traced red contour polygon + 6 glue pins + Desk Stand
 * - Page 2: Exact-perimeter Side Depth Strips with trapezoidal pink glue tabs + dashed blue fold lines
 * - Optional Page 3: Gemini AI Paper Cutout Sheet (inline base64) when generated
 */

import { ContourPoint } from './sampleTemplates';

export interface PdfTemplateOptions {
  modelName: string;
  category: string;
  paperSize: 'A4' | 'Letter';
  heightCm: number;
  depthCm: number;
  moldStyle?: 'block' | 'standee';
  includeStand: boolean;
  edgeColorHex?: string;
  perimeterMm?: number;
  contour?: ContourPoint[];
  artworkUri?: string | null;
  aiSheetBase64?: string | null;
}

export function buildBlueprintGeometry(opts: PdfTemplateOptions) {
  const isLetter = opts.paperSize === 'Letter';
  const pageW = isLetter ? 215.9 : 210;
  const pageH = isLetter ? 279.4 : 297;
  const objH = Math.max(80, opts.heightCm * 10);
  const objW = objH * 0.85;
  const depthMm = opts.moldStyle === 'standee' ? 10 : opts.depthCm * 10;

  const pts =
    opts.contour && opts.contour.length >= 3
      ? opts.contour
      : [
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 },
      ];

  let computedPerim = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    computedPerim += Math.hypot((b.x - a.x) * objW, (b.y - a.y) * objH);
  }
  const perim = opts.perimeterMm && opts.perimeterMm > 40 ? opts.perimeterMm : computedPerim;

  return { pageW, pageH, objW, objH, depthMm, pts, perim };
}

export function generatePrintHtml(options: PdfTemplateOptions): string {
  const {
    modelName,
    category,
    paperSize,
    edgeColorHex = '#2ec4b6',
    artworkUri,
    aiSheetBase64,
    includeStand,
  } = options;

  const L = buildBlueprintGeometry(options);
  const totalPages = aiSheetBase64 ? 3 : 2;
  const edgeColor = edgeColorHex || '#2ec4b6';

  const maxW = (L.pageW - 32) / 2;
  const maxH = L.pageH - (includeStand ? 92 : 46);
  const scale = Math.min(1, maxW / Math.max(10, L.objW), maxH / Math.max(10, L.objH));
  const dw = L.objW * scale;
  const dh = L.objH * scale;
  const fx = 14;
  const bx = 18 + maxW;
  const fy = 30;

  const polyStr = (ox: number, oy: number, mirror = false) =>
    L.pts
      .map((p) => {
        const px = ox + (mirror ? 1 - p.x : p.x) * dw;
        const py = oy + p.y * dh;
        return `${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(' ');

  const nMarks = Math.min(6, L.pts.length);
  let pinsSvg = '';
  for (let m = 0; m < nMarks; m++) {
    const p = L.pts[Math.floor((m / nMarks) * L.pts.length)];
    const mx1 = fx + p.x * dw;
    const my1 = fy + p.y * dh;
    const mx2 = bx + (1 - p.x) * dw;
    const my2 = fy + p.y * dh;
    pinsSvg += `
      <circle cx="${mx1.toFixed(1)}" cy="${my1.toFixed(1)}" r="3.4" fill="#3b78f0" stroke="#fff" stroke-width="0.5"/>
      <text x="${mx1.toFixed(1)}" y="${(my1 + 1.2).toFixed(1)}" text-anchor="middle" font-size="3.2" font-weight="800" fill="#fff">${m + 1}</text>
      <circle cx="${mx2.toFixed(1)}" cy="${my2.toFixed(1)}" r="3.4" fill="#3b78f0" stroke="#fff" stroke-width="0.5"/>
      <text x="${mx2.toFixed(1)}" y="${(my2 + 1.2).toFixed(1)}" text-anchor="middle" font-size="3.2" font-weight="800" fill="#fff">${m + 1}</text>
    `;
  }

  const artSvg = (x: number, y: number, w: number, h: number, mirror: boolean) => {
    if (!artworkUri) {
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f1f5f9"/>`;
    }
    if (mirror) {
      const cx = x + w / 2;
      return `<g transform="translate(${2 * cx}, 0) scale(-1, 1)"><image href="${artworkUri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/></g>`;
    }
    return `<image href="${artworkUri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  };

  const standSvg = includeStand
    ? `
      <rect x="${(L.pageW - 88) / 2}" y="${L.pageH - 58}" width="88" height="36" fill="#f8fafc" stroke="#e63946" stroke-width="0.7"/>
      <line x1="${(L.pageW - 88) / 2}" y1="${L.pageH - 40}" x2="${(L.pageW + 88) / 2}" y2="${L.pageH - 40}" stroke="#3b78f0" stroke-width="0.7" stroke-dasharray="2.5 1.8"/>
      <text x="${L.pageW / 2}" y="${L.pageH - 47}" text-anchor="middle" font-size="4" font-weight="800" fill="#17201d">FOLD-OUT DESK STAND (GLUE TO BASE)</text>
      <text x="${L.pageW / 2}" y="${L.pageH - 30}" text-anchor="middle" font-size="3.4" fill="#53655f">Score dashed blue line &amp; fold 90°</text>
    `
    : '';

  const headerSvg = (pg: number) => `
    <rect x="0" y="0" width="${L.pageW}" height="${L.pageH}" fill="#ffffff"/>
    <rect x="8" y="8" width="${L.pageW - 16}" height="${L.pageH - 16}" fill="none" stroke="#cbd5e1" stroke-width="0.4" stroke-dasharray="3 2"/>
    <text x="12" y="15" font-size="4.6" font-weight="800" fill="#17201d">FOLDLY • ${modelName.toUpperCase()} (${paperSize} • Page ${pg}/${totalPages})</text>
    <text x="12" y="20" font-size="3.2" fill="#53655f">${category} • Height ${options.heightCm}cm • Depth ${options.depthCm}cm</text>
    <rect x="${L.pageW - 64}" y="11" width="50" height="4.2" fill="#f4c430" stroke="#17201d" stroke-width="0.4"/>
    ${[0, 10, 20, 30, 40, 50]
      .map(
        (mm) =>
          `<line x1="${L.pageW - 64 + mm}" y1="11" x2="${L.pageW - 64 + mm}" y2="15.2" stroke="#17201d" stroke-width="0.4"/>`
      )
      .join('')}
    <text x="${L.pageW - 39}" y="19" text-anchor="middle" font-size="3.2" font-weight="700" fill="#17201d">Scale Check: 5 cm (100% print)</text>
  `;

  const legendSvg = `
    <line x1="14" y1="${L.pageH - 13}" x2="26" y2="${L.pageH - 13}" stroke="#e63946" stroke-width="1"/>
    <text x="28" y="${L.pageH - 11.7}" font-size="3.5" font-weight="700" fill="#17201d">Solid Red = Cut</text>
    <line x1="66" y1="${L.pageH - 13}" x2="78" y2="${L.pageH - 13}" stroke="#3b78f0" stroke-width="1" stroke-dasharray="2.5 1.5"/>
    <text x="80" y="${L.pageH - 11.7}" font-size="3.5" font-weight="700" fill="#17201d">Dashed Blue = Fold</text>
  `;

  const page1Svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.pageW} ${L.pageH}" style="width:${L.pageW}mm;height:${L.pageH}mm;display:block">
      ${headerSvg(1)}
      ${artSvg(fx, fy, dw, dh, false)}
      <polygon points="${polyStr(fx, fy, false)}" fill="none" stroke="#e63946" stroke-width="0.7"/>
      <text x="${fx + dw / 2}" y="${fy + dh + 6}" text-anchor="middle" font-size="4.2" font-weight="800" fill="#17201d">FRONT ARTWORK</text>
      ${artSvg(bx, fy, dw, dh, true)}
      <polygon points="${polyStr(bx, fy, true)}" fill="none" stroke="#e63946" stroke-width="0.7"/>
      <text x="${bx + dw / 2}" y="${fy + dh + 6}" text-anchor="middle" font-size="4.2" font-weight="800" fill="#17201d">BACK ARTWORK (MIRRORED)</text>
      ${pinsSvg}
      ${standSvg}
      ${legendSvg}
    </svg>
  `;

  // Page 2: Side Depth Strips
  const stripH = Math.max(14, Math.min(44, L.depthMm));
  const tabH = 6.5;
  const maxRowW = L.pageW - 30;
  const totalW = Math.max(120, L.perim);
  const rows = Math.min(4, Math.max(1, Math.ceil(totalW / maxRowW)));
  const rowLen = totalW / rows;
  const scaleX = Math.min(1, maxRowW / rowLen);
  const drawW = rowLen * scaleX;

  let stripsSvg = `<text x="14" y="27" font-size="4" font-weight="700" fill="#4b5a55">Total Exact Perimeter: ${(L.perim / 10).toFixed(1)} cm • Depth: ${(L.depthMm / 10).toFixed(1)} cm • Red = Cut, Blue = Fold</text>`;
  for (let r = 0; r < rows; r++) {
    const x0 = 15;
    const y0 = 38 + r * (stripH + tabH * 2 + 18);
    if (y0 + stripH + tabH > L.pageH - 14) break;
    const teeth = 8;
    const tw = drawW / teeth;
    for (let t = 0; t < teeth; t++) {
      const tx = x0 + t * tw;
      stripsSvg += `<polygon points="${tx},${y0} ${tx + 2},${y0 - tabH} ${tx + tw - 2},${y0 - tabH} ${tx + tw},${y0}" fill="#fde7e9" stroke="#e63946" stroke-width="0.5"/>`;
      stripsSvg += `<polygon points="${tx},${y0 + stripH} ${tx + 2},${y0 + stripH + tabH} ${tx + tw - 2},${y0 + stripH + tabH} ${tx + tw},${y0 + stripH}" fill="#fde7e9" stroke="#e63946" stroke-width="0.5"/>`;
    }
    stripsSvg += `<rect x="${x0}" y="${y0}" width="${drawW}" height="${stripH}" fill="${edgeColor}" fill-opacity="0.26" stroke="#3b78f0" stroke-width="0.65" stroke-dasharray="2.5 1.8"/>`;
    stripsSvg += `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + stripH}" stroke="#e63946" stroke-width="0.7"/>`;
    stripsSvg += `<line x1="${x0 + drawW}" y1="${y0}" x2="${x0 + drawW}" y2="${y0 + stripH}" stroke="#e63946" stroke-width="0.7"/>`;
    for (let t = 1; t < teeth; t++) {
      const fxLine = x0 + t * tw;
      stripsSvg += `<line x1="${fxLine}" y1="${y0}" x2="${fxLine}" y2="${y0 + stripH}" stroke="#3b78f0" stroke-width="0.45" stroke-dasharray="2 1.5"/>`;
    }
    const badgeNum = (r % 6) + 1;
    stripsSvg += `<circle cx="${x0 + drawW / 2}" cy="${y0 + stripH / 2}" r="4.2" fill="#3b78f0" stroke="#fff" stroke-width="0.5"/>`;
    stripsSvg += `<text x="${x0 + drawW / 2}" y="${y0 + stripH / 2 + 1.4}" text-anchor="middle" font-size="3.6" font-weight="800" fill="#fff">${badgeNum}</text>`;
    stripsSvg += `<text x="${x0 + 3}" y="${y0 + stripH / 2 + 1.2}" font-size="3.5" font-weight="800" fill="#17201d">STRIP ${r + 1}/${rows}</text>`;
  }

  const page2Svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.pageW} ${L.pageH}" style="width:${L.pageW}mm;height:${L.pageH}mm;display:block">
      ${headerSvg(2)}
      ${stripsSvg}
      ${legendSvg}
    </svg>
  `;

  const page3Html = aiSheetBase64
    ? `
      <div class="page">
        <div style="padding:10mm;display:flex;flex-direction:column;height:100%;box-sizing:border-box">
          <div style="font-weight:800;font-size:11pt;margin-bottom:4mm;border-bottom:1.5px solid #17201d;padding-bottom:2mm">
            FOLDLY • ${modelName.toUpperCase()} (${paperSize} • Page 3/3 — Gemini AI Cutout)
          </div>
          <div style="flex:1;display:flex;align-items:center;justify-content:center">
            <img src="${aiSheetBase64}" style="max-width:100%;max-height:255mm;object-fit:contain"/>
          </div>
        </div>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Foldly - ${modelName}</title>
<style>
  @page {
    size: ${L.pageW}mm ${L.pageH}mm;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: ${L.pageW}mm;
    height: ${L.pageH}mm;
    page-break-after: always;
    overflow: hidden;
  }
  .page:last-child {
    page-break-after: auto;
  }
</style>
</head>
<body>
  <div class="page">${page1Svg}</div>
  <div class="page">${page2Svg}</div>
  ${page3Html}
</body>
</html>`;
}
