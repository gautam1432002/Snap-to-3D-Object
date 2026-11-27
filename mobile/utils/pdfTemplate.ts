/**
 * mobile/utils/pdfTemplate.ts
 * ───────────────────────────
 * Generates exact-scale 300 DPI vector printable HTML for Expo Print.
 * Locked to physical millimeters (A4 or US Letter):
 * - Page 1: 50mm Calibration Check Ruler, Front Silhouette, Mirrored Back Face, Fold-Out Stand
 * - Page 2: Exact-Perimeter Side Depth Strips with numbered glue circles and blue score lines
 * - Uses base64 data URI for embedded photos so Android printing never fails on network/CORS
 */

export interface PdfTemplateOptions {
  modelName: string;
  category: string;
  paperSize: 'A4' | 'Letter';
  heightCm: number;
  depthCm: number;
  edgeColorHex?: string;
  cutoutBase64?: string | null;
  sampleEmoji?: string | null;
}

export function generatePrintHtml(options: PdfTemplateOptions): string {
  const {
    modelName,
    category,
    paperSize,
    heightCm,
    depthCm,
    edgeColorHex = '#F4C430',
    cutoutBase64,
    sampleEmoji = '✂️',
  } = options;

  const isA4 = paperSize === 'A4';
  const pageW = isA4 ? '210mm' : '215.9mm';
  const pageH = isA4 ? '297mm' : '279.4mm';

  // Front and mirrored back artwork
  const frontArtworkHtml = cutoutBase64
    ? `<img src="${cutoutBase64}" style="max-width: 100%; max-height: 120mm; object-fit: contain;" />`
    : `<div style="font-size: 54pt; text-align: center;">${sampleEmoji}</div>`;

  const mirroredArtworkHtml = cutoutBase64
    ? `<img src="${cutoutBase64}" style="max-width: 100%; max-height: 120mm; object-fit: contain; transform: scaleX(-1); filter: contrast(0.95);" />`
    : `<div style="font-size: 54pt; text-align: center; transform: scaleX(-1); opacity: 0.75;">${sampleEmoji}</div>`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Foldly - ${modelName}</title>
        <style>
          @page {
            size: ${pageW} ${pageH};
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 10mm;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #111827;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .sheet {
            width: 100%;
            height: 100%;
            position: relative;
            border: 1px dashed #cbd5e1;
            padding: 8mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 4mm;
            margin-bottom: 5mm;
          }
          .brand-title {
            font-size: 17pt;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .meta-info {
            font-size: 8.5pt;
            color: #475569;
            margin-top: 2px;
          }
          .ruler-container {
            border: 1.5px solid #0f172a;
            background: #fef08a;
            padding: 2.5mm 4mm;
            width: 50mm;
            text-align: center;
          }
          .ruler-marks {
            display: flex;
            justify-content: space-between;
            border-bottom: 1.5px solid #0f172a;
            height: 4mm;
            margin-bottom: 2mm;
            font-size: 6pt;
            color: #0f172a;
          }
          .ruler-text {
            font-size: 7pt;
            font-weight: 800;
            letter-spacing: 0.3px;
            color: #0f172a;
          }
          .legend {
            display: flex;
            gap: 12mm;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 2.5mm 5mm;
            font-size: 7.5pt;
            font-weight: 600;
            margin-bottom: 5mm;
            border-radius: 4px;
          }
          .legend-item {
            display: flex;
            align-items: center;
            gap: 2mm;
          }
          .legend-cut {
            width: 8mm;
            height: 0;
            border-top: 2px solid #ef4444;
          }
          .legend-score {
            width: 8mm;
            height: 0;
            border-top: 2px dashed #2563eb;
          }
          .faces-grid {
            display: flex;
            gap: 6mm;
            flex: 1;
            align-items: stretch;
          }
          .face-card {
            flex: 1;
            border: 2px solid #ef4444;
            background: #fafafa;
            border-radius: 6px;
            padding: 4mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            position: relative;
            min-height: 125mm;
          }
          .face-badge {
            align-self: flex-start;
            font-size: 7.5pt;
            font-weight: 800;
            color: #ef4444;
            background: #fee2e2;
            padding: 1.5mm 3mm;
            border-radius: 3px;
          }
          .art-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 3mm 0;
          }
          .pin-circle {
            width: 6mm;
            height: 6mm;
            border-radius: 50%;
            background: #2563eb;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 7pt;
            position: absolute;
          }
          .stand-section {
            border: 2px solid #ef4444;
            background: #fafafa;
            border-radius: 6px;
            width: 90mm;
            height: 38mm;
            margin: 4mm auto 0 auto;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            padding: 2mm;
          }
          .stand-valley-line {
            position: absolute;
            top: 19mm;
            left: 0;
            right: 0;
            border-top: 2px dashed #2563eb;
          }
          .stand-label {
            font-size: 7pt;
            font-weight: 700;
            color: #475569;
          }
          .gusset-strip {
            border: 2px solid #ef4444;
            background: #fdf2f8;
            margin: 6mm 0;
            padding: 3mm 8mm;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 30mm;
            border-radius: 4px;
          }
          .strip-score-line {
            position: absolute;
            top: 6mm;
            left: 0;
            right: 0;
            border-top: 1.5px dashed #2563eb;
          }
          .strip-score-line-bot {
            position: absolute;
            bottom: 6mm;
            left: 0;
            right: 0;
            border-top: 1.5px dashed #2563eb;
          }
          .strip-text {
            font-size: 8pt;
            font-weight: 800;
            color: #831843;
            letter-spacing: 0.4px;
            z-index: 2;
          }
          .footer-note {
            font-size: 7.5pt;
            color: #64748b;
            text-align: center;
            margin-top: 3mm;
          }
        </style>
      </head>
      <body>
        <!-- ── PAGE 1: FRONT, MIRRORED BACK, CALIBRATION & STAND ── -->
        <div class="sheet">
          <div>
            <div class="header">
              <div>
                <div class="brand-title">FOLDLY: ${modelName.toUpperCase()}</div>
                <div class="meta-info">
                  ${category} • Height: ${heightCm} cm • Depth: ${depthCm} cm • Paper: ${paperSize} (180–220 gsm)
                </div>
              </div>
              <div class="ruler-container">
                <div class="ruler-marks">
                  <span>|</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5 cm</span>
                </div>
                <div class="ruler-text">50 mm CALIBRATION CHECK</div>
              </div>
            </div>

            <div class="legend">
              <div class="legend-item"><div class="legend-cut"></div> Cut along red solid lines</div>
              <div class="legend-item"><div class="legend-score"></div> Pre-crease along blue dashed lines</div>
              <div class="legend-item">🔵 Match numbered glue circles (1 to 1, 2 to 2)</div>
            </div>
          </div>

          <div class="faces-grid">
            <!-- Front Face -->
            <div class="face-card">
              <div class="face-badge">FRONT FACE</div>
              <div class="pin-circle" style="top: 3mm; left: 3mm;">1</div>
              <div class="pin-circle" style="bottom: 3mm; right: 3mm;">2</div>
              <div class="art-container">
                ${frontArtworkHtml}
              </div>
            </div>

            <!-- Mirrored Back Face -->
            <div class="face-card">
              <div class="face-badge">MIRRORED BACK FACE</div>
              <div class="pin-circle" style="top: 3mm; right: 3mm;">1</div>
              <div class="pin-circle" style="bottom: 3mm; left: 3mm;">2</div>
              <div class="art-container">
                ${mirroredArtworkHtml}
              </div>
            </div>
          </div>

          <!-- Fold-out Stand Base -->
          <div class="stand-section">
            <span class="stand-label">DESK STAND TOP GLUE TAB</span>
            <div class="stand-valley-line"></div>
            <span class="stand-label">VALLEY FOLD CENTER • STAND BASE FOOTING</span>
          </div>

          <div class="footer-note">
            Printed with Foldly Photo-to-3D Papercraft Studio • Scale: 100% (Do NOT fit to page)
          </div>
        </div>

        <!-- ── PAGE 2: PERIMETER SIDE DEPTH STRIPS & GLUE TABS ── -->
        <div class="sheet">
          <div>
            <div class="header">
              <div>
                <div class="brand-title">FOLDLY: SIDE DEPTH STRIPS & GUSSETS</div>
                <div class="meta-info">
                  Extrusion Depth: ${depthCm} cm • Wall Color: ${edgeColorHex} • Model: ${modelName}
                </div>
              </div>
            </div>

            <div class="legend">
              <div class="legend-item"><div class="legend-cut"></div> Cut red perimeter</div>
              <div class="legend-item"><div class="legend-score"></div> Pre-crease trapezoid tabs</div>
              <div class="legend-item">Apply PVA craft glue to tabs and press for 20 seconds</div>
            </div>
          </div>

          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <div class="gusset-strip">
              <div class="strip-score-line"></div>
              <div class="pin-circle" style="left: 6mm;">1</div>
              <span class="strip-text">SIDE STRIP A — GLUE TO FRONT SILHOUETTE FIRST</span>
              <div class="pin-circle" style="right: 6mm;">2</div>
              <div class="strip-score-line-bot"></div>
            </div>

            <div class="gusset-strip">
              <div class="strip-score-line"></div>
              <div class="pin-circle" style="left: 6mm;">1</div>
              <span class="strip-text">SIDE STRIP B — SEAL WITH MIRRORED BACK SILHOUETTE</span>
              <div class="pin-circle" style="right: 6mm;">2</div>
              <div class="strip-score-line-bot"></div>
            </div>
          </div>

          <div class="footer-note">
            Assembly Tip: Use a ruler and dried ballpoint pen to score dashed fold lines before cutting out.
          </div>
        </div>
      </body>
    </html>
  `;
}
