# Foldly — Photo-to-3D Paper Craft Studio
## Project Specification Document

> **Source prototype:** `reference/master_foldly_photo_to_3d_paper_craft_studio.html` (4 488 lines, single-file HTML/CSS/JS)
> **Date analysed:** 2026-11-24
> **Spec version:** 1.0

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [UI Shell & Layout](#2-ui-shell--layout)
3. [4-Tab Main Navigation](#3-4-tab-main-navigation)
4. [6-Stage Photo → 3D → Print Workflow](#4-6-stage-photo--3d--print-workflow)
   - [Stage 1 — Capture Object](#stage-1--capture-object)
   - [Stage 2 — Neural Subject Lift](#stage-2--neural-subject-lift)
   - [Stage 3 — Crisp 3D Paper Model](#stage-3--crisp-3d-paper-model)
   - [Stage 4 — Unfold 3D → 2D Animation](#stage-4--unfold-3d--2d-animation)
   - [Stage 5 — Printable Layout & PDF Export](#stage-5--printable-layout--pdf-export)
   - [Stage 6 — 7-Step Physical Assembly Guide](#stage-6--7-step-physical-assembly-guide)
5. [AI Calls (Gemini API)](#5-ai-calls-gemini-api)
6. [3D Geometry Logic (Three.js)](#6-3d-geometry-logic-threejs)
7. [Contour Extraction Pipeline](#7-contour-extraction-pipeline)
8. [PDF Export Behaviour (jsPDF)](#8-pdf-export-behaviour-jspdf)
9. [Persistence & State](#9-persistence--state)
10. [Gamification — Badges & Stats](#10-gamification--badges--stats)
11. [Onboarding Tour](#11-onboarding-tour)
12. [Engineering Flaws & Production Fixes](#12-engineering-flaws--production-fixes)

---

## 1. App Overview

**Foldly** is a mobile-first, single-page web application that lets users:

1. **Photograph or select** any real-world object (or choose a pre-drawn sample).
2. **Isolate the subject** using an in-browser neural matting engine cascade.
3. **Preview it as a crisp 3D paper-craft model** in a live Three.js scene.
4. **Animate the unfold** from 3D → flat paper pieces.
5. **Generate a print-ready PDF** with cut lines, fold lines, and glue tabs on A4 or Letter paper.
6. **Follow a 7-step guided assembly** to build the physical craft.

Target user: children, teenagers, and casual crafters. No sign-in required (all state in `localStorage`).

---

## 2. UI Shell & Layout

### Phone Frame
The entire app renders inside a `.phone` div styled to simulate a 380 × 760 px phone body (green cutting-mat grid background, rounded border). On screens narrower than 480 px, the frame becomes edge-to-edge (`border-radius: 0`).

### Design Tokens (CSS custom properties)
```css
--bg: #dce6e2        /* sage parchment background */
--ink: #17201d       /* near-black text */
--muted: #53655f
--mat: #1b3a31       /* dark green cutting-mat */
--paper: #fdfdfb     /* off-white paper */
--cut: #e63946       /* cut line red */
--fold: #3b78f0      /* fold line blue */
--ruler: #f4c430     /* ruler yellow (CTA colour) */
--teal: #2ec4b6      /* success / teal accent */
```
Dark-mode variant swaps `--bg`, `--ink`, and `--muted` via `@media (prefers-color-scheme: dark)`.

### Liquid Glass Utility Classes
`.liquid-glass` applies `backdrop-filter: blur(18px) saturate(180%)` with layered `box-shadow` to produce the iOS-style frosted-glass effect on the bottom nav, control bars, and floating overlays.

### Typography
- **Body/UI:** Bricolage Grotesque (variable, 400/600/800)
- **Handwritten accent:** Caveat 600 (used for section headers like "hello, maker!")
- Both loaded from Google Fonts CDN.

### Workflow Overlay
`.workflow` is `position: absolute; inset: 0; z-index: 60` — it slides up from below (`translateY(100%) → translateY(0)`) over the 4-tab shell when a craft is started.

---

## 3. 4-Tab Main Navigation

| Tab Index | Label | Page ID | Contents |
|---|---|---|---|
| 0 | Home | `#page-home` | Hero scan CTA, "Continue Building" banner, "How Foldly Works" 3-step strip, ready-made templates carousel, recent creations list |
| 1 | Explore | `#page-explore` | Category chip filter row (All / Easy / Signs / Style / Animals / Drinks), template card list |
| 2 | Creations | `#page-creations` | Full paginated list of saved crafts with Open / Delete actions |
| 3 | Profile | `#page-profile` | Avatar card, Maker Badges grid (4 badges), paper-size preference, replay-tour button |

### Navigation Mechanics
- **CSS sliding:** `tabTrack` is a `width: 400%` flexbox; active tab is set by `translateX(-currentTab * 25%)`.
- **Glass indicator pill** slides horizontally inside the bottom nav to highlight the active tab.
- **Touch swipe:** Detected on `touchstart/touchmove/touchend` with a 20% viewport-width threshold and `Math.abs(mx) > Math.abs(my) * 1.25` angle guard to prevent accidental horizontal swipe on vertical scroll.
- **`data-no-swipe="true"`** attribute on sliders, chip rows, and Three.js canvases blocks swipe interception.

---

## 4. 6-Stage Photo → 3D → Print Workflow

The workflow panel contains 6 `.wf-stage` sections, one visible at a time. Stage transitions are managed by `goStage(n)`, which updates stage dots, the title bar, and kicks off any async init for the new stage.

### Stage 1 — Capture Object

**UI elements:**
- `captureCanvas` (shows preview / drawn scene)
- `liveVideo` (hidden by default; shown during live camera)
- Corner-bracket overlay (`.corner` divs for viewfinder feel)
- Status pill, sample picker chip row, photo-tips info drawer

**Capture modes:**

| Mode | Trigger | Behaviour |
|---|---|---|
| Sample objects | Chip: 🚸 / 👟 / 🦊 / 🧋 | `renderSampleToCanvas(id, canvas, true)` draws a fully-programmatic scene using Canvas 2D paths |
| Upload photo | `<input type="file" accept="image/*">` | Reads via `URL.createObjectURL`, draws to canvas, sets `WF.isRealPhoto = true` |
| Live camera | "🎥 Live Cam" button | `getUserMedia({ video: { facingMode: 'environment' } })` → `<video>` stream |
| Shutter capture | Red shutter button | Copies live video frame to canvas via `drawImage(vid, ...)` |

After any capture, a Confirm / Retake pair is shown. Confirm calls `goStage(2)`.

**Built-in sample objects (fully programmatic Canvas 2D):**

| ID | Name | Category | Difficulty |
|---|---|---|---|
| `crossing` | Pedestrian Crossing Sign | Signs | Easy |
| `sneaker` | Retro Sneaker | Style | Medium |
| `fox` | Fox Sticker | Animals | Easy |
| `boba` | Boba Tea Cup | Drinks | Easy |

Each sample is rendered at 420 × 420 px with scene background (`withSceneBg = true`) for the capture preview and without background for the transparent cutout.

---

### Stage 2 — Neural Subject Lift

This is the most complex stage, with 4 sub-steps shown as a 2×2 processing checklist:

```
[🧠 Neural Subject Lift]  [📐 Solidity & Crop Check]
[🪄 Gemini Outpaint Polish] [✂️ Solid PNG Ready]
```

#### 2A. Neural Segmentation Cascade

Three-tier engine waterfall — each tier is attempted; on failure, the next is used:

**Tier 1 & 2 — Transformers.js RMBG-1.4** (dynamic `import()` from jsDelivr CDN)
```
briaai/RMBG-1.4  →  (fallback) kittypdf/RMBG-1.4-transformersjs
```
- Downloads ONNX weights via `progress_callback`; progress bar drives `neuralProgFill`.
- Output: `first.mask.toCanvas()` → alpha channel extracted into `Uint8ClampedArray`.

**Tier 3 — @imgly/background-removal ISNet FP16** (dynamic `import()` from jsDelivr)
```
model: 'isnet_fp16'
```
- Returns a `Blob`; alpha extracted from RGBA channel 3.

**Tier 4 — Smart Sobel Edge Fallback** (`runSmartSobelFallback`)
- Samples border pixel colours from all 4 edges to build a background colour cluster set.
- Computes Sobel gradient magnitude to prevent flood-fill crossing strong object edges.
- BFS flood-fill from all border pixels; stops at high-gradient pixels or non-background colours.

For built-in samples, no ML is run; `makeTransparentPngFromCanvas` flood-fills white background directly.

#### 2B. Alpha Mask Post-Processing (`composeFinalPngFromMask`)

1. **Connected-component denoising** (`denoiseConnectedComponents`): labels all foreground blobs; removes blobs smaller than `max(24, maxArea * 0.015)` px.
2. **Sigmoid alpha contrast curve**: `v = 1 / (1 + exp(-(alpha[i] - center) * slope))` where `center = (alphaCutoff / 100) * 255`. Produces binary-ish edges without hard threshold artefacts.
3. **Foreground colour decontamination**: For semi-transparent edge pixels (alpha 8–245), replaces RGB with the weighted average of fully-opaque neighbours within a 5×5 window. Removes sky/road colour halo.
4. **Tight bounding-box crop** with configurable padding (12 px normal, 18 px die-cut mode).

#### 2C. Solidity & Edge Inspector (`inspectSolidityAndCrops`)

| Metric | Calculation | Threshold |
|---|---|---|
| Solidity | `fgCount / convexHullArea × 100` (Andrew's monotone chain) | < 68% → "Polish Suggested" |
| Edge Crispness | `100 - (edgeSemi / edgeTotal × 260)` | < 75% → warn |
| Crop Check | Counts foreground pixels within 2 px of each edge; > 3% of that edge → side is "cropped" | Any cropped side → warn |

#### 2D. User Controls in Stage 2

| Control | Effect |
|---|---|
| **Alpha Cutoff** slider (10–85) | Re-runs `composeFinalPngFromMask` with new sigmoid centre |
| **Edge Feather** slider (0–3 px, step 0.5) | Controls sigmoid slope (`slope = 0.14 / featherPx`) |
| **Die-Cut Border** toggle | Adds 7-px radial shadow stamp of a white silhouette |
| **🧠 Neural** / **✨ Gemini** source toggle | Switches `WF.pngDataUrl` between `neuralCutoutUrl` and `geminiPolishUrl` |
| **⇄ Split** compare | Clips `.split-after` layer with `clip-path: inset(0 0 0 X%)` driven by a range input |
| **🖌️ Touch-Up Brush** | Opens `touchupCanvas` overlay; paints keep (255) or erase (0) circles into `WF.alphaMask`; supports 10-frame undo history |
| **✨ Gemini Polish** button | Calls `callGeminiDynamicPolish` → new RGB canvas → re-runs alpha pipeline |
| **⬇ Download PNG** | `<a download>` link to current `WF.pngDataUrl` |
| **✏️ Rename** | Inline text input; updates `WF.meta.name` |

**Subject Lift Glow animation:** On successful cutout, `playSubjectLiftGlow()` runs a `requestAnimationFrame` loop drawing a white/teal shimmer sweep across `liftGlowCanvas`, plus a CSS keyframe pop (`subjectLiftPop`) on the preview image.

---

### Stage 3 — Crisp 3D Paper Model

**Mold styles (segmented control):**

| Style | `moldStyle` | Extrusion depth | Use case |
|---|---|---|---|
| 🧊 Crisp 3D | `'block'` | `(depthCm / heightCm) * clampedH * 1.45` in scene units | Full 3D paper sculpture |
| 🪧 3D Standee | `'standee'` | Fixed `0.14` scene units (~1 mm real) | Thin display standee |

**Three.js scene setup (`initThreeScene`):**
- `WebGLRenderer` with `antialias: true`, `alpha: true`, pixel ratio clamped to 2×.
- `PerspectiveCamera(FOV=36°)` at `(0, 0.2, 6.2)`.
- 1 × `AmbientLight(0xffffff, 1.05)` + 2 × `DirectionalLight` (key + fill).
- Cutting-mat turntable `CylinderGeometry(1.75, 1.85, 0.12, 36)` as a base disc.

**Model construction (`buildThreeModel`):**
1. `extractCraftContour()` produces normalised `{x,y}` points clamped to `[0,1]×[0,1]`.
2. A `THREE.Shape` is built from the contour, mapping `x→[-modelW/2, modelW/2]` and `y→[-clampedH/2, clampedH/2]`.
3. `ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 })` produces the 3D solid.
4. Side faces → `MeshLambertMaterial({ color: edgeColorHex })`.
5. `EdgesGeometry` → `LineSegments` for fold-crease outlines (opacity 0.5).
6. Front face → `PlaneGeometry(modelW, clampedH)` with `MeshBasicMaterial({ map: frontTex, transparent: true, alphaTest: 0.2 })`, positioned at `z = depth/2 + 0.008`.
7. Back face → same geometry, `rotation.y = Math.PI`, mirrored PNG texture.
8. Optional stand → `BoxGeometry(standW, 0.06, depth + 0.55)` in off-white.

**Controls:** Spin toggle (auto-rotate `rotY += 0.008`), Front/Back flip (`rotY += π`), Reset camera. Manual drag-rotate via global `mousemove`/`touchmove` listeners.

**Height/Depth sliders:** Trigger full `buildThreeModel()` rebuild on every `input` event (geometry disposed and re-created). Paper GSM label: `>= 24 cm → 220gsm` else `180gsm`.

---

### Stage 4 — Unfold 3D → 2D Animation

A **second independent Three.js scene** (`UNFOLD_STATE`) renders four flat `PlaneGeometry` meshes representing the paper pieces:

| Mesh | Geometry | Texture / Colour |
|---|---|---|
| `frontM` | `PlaneGeometry(pw, ph)` | Front PNG |
| `backM` | `PlaneGeometry(pw, ph)` | Mirrored Back PNG |
| `stripM` | `PlaneGeometry(3.4, 0.42)` | Solid `edgeColorHex` |
| `standM` | `PlaneGeometry(1.1, 0.55)` | Solid off-white |

**Unfold interpolation** (`updateUnfoldProgress(pct)`):

```
t = pct / 100

frontM.position  = (-1.15t, +0.35t, (1-t)*0.35)
frontM.rotation.y = (1-t) * 0.35

backM.position   = (+1.15t, +0.35t, -(1-t)*0.35)
backM.rotation.y = π * (1-t)

stripM.position  = (0, -1.05t, 0)
stripM.rotation.x = (1-t) * π/2

standM.position  = (0, -1.62t, 0)
standM.rotation.x = (1-t) * π/2
```

Animation is an **ease-out cubic** (`1 - (1-t)^3`) over 1 400 ms. The scrub slider allows manual frame-by-frame control.

---

### Stage 5 — Printable Layout & PDF Export

#### Paper Dimensions
| Format | Width (mm) | Height (mm) |
|---|---|---|
| A4 | 210 | 297 |
| Letter | 215.9 | 279.4 |

#### Page 1 — Front & Back Artwork

Computed scaling:
```
maxW = (pageW - 32) / 2        // half the usable width
maxH = pageH - (includeStand ? 92 : 46)
scale = min(1, maxW/objW, maxH/objH)
dw = objW * scale,  dh = objH * scale
```

SVG content:
- `<image>` elements embedding `pngDataUrl` (front) and `mirroredPngUrl` (back) as inline base64.
- `<polygon>` cut outlines (solid red `#e63946`, stroke-width 0.7) derived from normalised contour points scaled to `dw × dh`.
- Up to 6 numbered **glue-pair circles** (`<circle r="3.4" fill="#3b78f0">`) at evenly-spaced contour vertices; clicking any circle highlights its matching pair on front, back, and side strip.
- **Fold-out desk stand:** centred `<rect>` (88 × 36 mm) with dashed blue centre-fold line.
- **50 mm scale-check ruler** (yellow rect with 10 mm tick marks) in the top-right corner.

#### Page 2 — Exact-Perimeter Side Depth Strip

```
perimeter = Σ |contour[i+1] - contour[i]| * [objW, objH]  (mm)
stripH = clamp(depthMm, 14, 44)
rows = ceil(perimeter / (pageW - 30)), capped at 4
```

Each row contains:
- Trapezoidal glue tabs (8 teeth, top + bottom) in light pink `#fde7e9`.
- Main coloured gusset body with `edgeColorHex` fill at 26% opacity, dashed blue `stroke-dasharray`.
- Vertical fold lines at tab intervals (dashed blue).
- Interactive numbered glue-pair circle in the centre.

#### Page 3 — Gemini AI Paper Cutout (optional)

Generated on demand by `callGeminiCutoutSheet`. Stored as `WF.geminiSheetUrl` (base64 PNG data-URL). Displayed as a full-page `<img>` in the preview and embedded in jsPDF as page 3.

#### Zoom Controls
Scale `paperSheetFrame` via CSS `transform: scale(WF.zoom)` between 0.75× and 2.2×.

#### PDF Export (`exportRealPdf`)

Uses `window.jspdf.jsPDF` (loaded from CDN). Creates a `jsPDF` instance (`unit: 'mm'`, correct format string). Adds images via `doc.addImage(dataUrl, 'PNG', x, y, w_mm, h_mm)` and draws primitives (`doc.rect`, `doc.line`, `doc.text`) to match the SVG layout. Saves as `foldly-<name>-<A4|Letter>.pdf`.

> **Known issue:** `doc.addImage` places images using the mm coordinates derived from the browser canvas's pixel dimensions, which are screen-DPI-dependent. See §12, Flaw #4.

#### Print Fallback
`window.print()` renders the hidden `#printOnlyArea` div (populated with SVG markup). `@media print` hides the phone frame and shows only this area.

---

### Stage 6 — 7-Step Physical Assembly Guide

| Step | Badge | Key Action | Special UI |
|---|---|---|---|
| 1 | Print | Print both sheets at 100% | Checkbox gate + warning re Fit-to-Page |
| 2 | Cut | Cut red outlines for Front, Back, Strips | — |
| 3 | Score | Score & fold blue dashed lines | Checkbox gate: "I pre-folded the glue tabs" |
| 4 | Match | Match numbered circles between pieces | — |
| 5 | Glue | Glue side strip tabs to Front face | 20-second countdown glue timer |
| 6 | Seal | Glue mirrored Back to remaining tabs | 20-second countdown glue timer |
| 7 | Finish! | Attach desk stand (if included) | Completion → saves status "Built" → `masterFolder` badge |

**Progress bar:** `width = ((step + 1) / 7) × 100%`.

**Tool tip chips:** 5 chips (Scissors, Ruler, Glue, Scoring Pen, 180gsm Paper) each display an inline HTML tip string.

**"Warn then allow" gate:** If a step has a `check` property and the checkbox is unchecked, tapping Next shows a warning. Tapping Next again bypasses it (`WF.warnedStep` tracks the last warned step to prevent double-warning).

**Completion:** Calls `persistActiveProject('Built')`, unlocks `masterFolder` badge, closes workflow, navigates to Creations tab.

---

## 5. AI Calls (Gemini API)

All calls share `fetchWithBackoff(url, options, maxRetries = 3)` with exponential delay (1 s → 2 s → 4 s) on HTTP 429 or 5xx.

### 5.1 `callGeminiMetadata(photoDataUrl)`

| Property | Value |
|---|---|
| Model | `gemini-3-flash-preview` |
| Endpoint | `v1beta/models/gemini-3-flash-preview:generateContent` |
| Input | Base64-encoded JPEG/PNG inline data part + text prompt |
| Output | JSON: `name`, `category`, `edgeColorHex`, `suggestStand`, `difficulty`, `estMinutes`, `buildTip` |
| `responseMimeType` | `application/json` |
| `temperature` | 0.25 |
| Fallback | Hard-coded defaults if call fails (offline / key missing) |

**Purpose:** Identify the real-world object and return craft metadata.

### 5.2 `callGeminiDynamicPolish(cutoutDataUrl, croppedSides[])`

| Property | Value |
|---|---|
| Model | `gemini-3.1-flash-image` |
| Endpoint | `v1beta/models/gemini-3.1-flash-image:generateContent` |
| Input | Padded PNG (cropped sides get 28% extra padding, clean sides get 16%) |
| Output | Inline image part (PNG) — object on pure white `#FFFFFF` background |
| `responseModalities` | `['IMAGE']` |
| Fallback | Toast "unavailable offline"; neural PNG remains active |

**Purpose:** Heal cropped edges via outpainting; remove background halo; make colours vibrant.

### 5.3 `callGeminiCutoutSheet(neuralPngDataUrl, objectName, paperSize)`

| Property | Value |
|---|---|
| Model | `gemini-3.1-flash-image` |
| Endpoint | `v1beta/models/gemini-3.1-flash-image:generateContent` |
| Input | Neural PNG + 20 px white margin; detailed prompt |
| Output | Inline PNG: flat papercraft template with red cut lines, blue fold lines, pink glue tabs |
| `responseModalities` | `['IMAGE']` |
| `imageConfig.aspectRatio` | `'3:4'` (portrait, matches A4) |
| Fallback | Toast "unavailable offline"; Pages 1 & 2 SVG blueprints remain |

**Purpose:** Let Gemini draw the entire flat cutout sheet on virtual printing paper, ready to embed in the PDF as page 3.

---

## 6. 3D Geometry Logic (Three.js)

### Silhouette Contour → Three.js Shape

```
extractCraftContour(pngDataUrl, smoothness)
  └── Rasterise PNG at 128 × 128
  └── Moore-Neighbour boundary tracing (max 1 400 steps)
  └── Douglas-Peucker simplification
        Easy:   ε = 0.032  → ~12-16 points
        Medium: ε = 0.020  → ~18-24 points
        Hard:   ε = 0.011  → ~26-34 points
  └── (Medium/Hard) Chaikin 1-pass smoothing → re-simplify at ε × 0.85
  └── Fallback: hexagonal 6-point shape if < 6 points remain
```

Output is a `contourNorm[]` array of `{x,y}` in `[0,1]×[0,1]` normalised space.

### Physical → Scene Unit Mapping

```
modelH = 2.6 × (heightCm / 18)        // scene units; 18 cm → 2.6 u
clampedH = clamp(modelH, 1.5, 3.0)
modelW = clampedH × (pngW / pngH)
depth = (depthCm / heightCm) × clampedH × 1.45   // block mode
```

### ExtrudeGeometry Parameters

```js
{
  depth,
  bevelEnabled: false,   // crisp cardstock edges
  curveSegments: 8
}
```
Translated by `−depth/2` on Z so the extrusion straddles the XY plane symmetrically.

---

## 7. Contour Extraction Pipeline

```
Input: pngDataUrl
  │
  ├─ Load image → 128×128 canvas
  ├─ Threshold alpha > 60 → binary grid
  ├─ Compute centroid (cx, cy)
  ├─ Find first boundary pixel (top-left scan)
  ├─ Moore-Neighbour 8-directional BFS trace
  │    max 1 400 steps; stops on return to start
  │    each point normalised: { x: px/128, y: py/128 }
  ├─ Douglas-Peucker(pts, ε)   ← recursive perpendicular distance
  ├─ [if Medium/Hard] Chaikin 2-pass smoothing (halves segments)
  └─ Douglas-Peucker(pts, ε × 0.85)   ← re-simplify after smoothing
```

Fallback rectangle `[{0.1,0.1}, {0.9,0.1}, {0.9,0.9}, {0.1,0.9}]` is used when:
- Fewer than 20 foreground pixels are found.
- Fewer than 6 points remain after simplification.

---

## 8. PDF Export Behaviour (jsPDF)

Library: **jsPDF 2.5.1** loaded from cdnjs CDN (`window.jspdf.jsPDF`).

### Page Layout Mapping (SVG → jsPDF)

| SVG attribute | jsPDF call | Notes |
|---|---|---|
| `<image href x y width height>` | `doc.addImage(dataUrl, 'PNG', x, y, w, h)` | w, h in mm from layout computation |
| `<rect>` cut outline | `doc.setDrawColor(230,57,70); doc.rect(x,y,w,h)` | No `fill` parameter → stroke only |
| `<line>` fold | `doc.setDrawColor(59,120,240); doc.line(x1,y1,x2,y2)` | Dashed blue fold lines |
| `<text>` | `doc.setFontSize(n); doc.text(str, x, y, {align})` | Font: `helvetica bold` |

### Page Count

| Condition | Pages |
|---|---|
| Always | Page 1 (front/back/stand) + Page 2 (side strips) |
| `WF.geminiSheetUrl` set | + Page 3 (Gemini cutout image) |

### File Name
`foldly-<sanitised-name>-<A4|Letter>.pdf`
(`name.toLowerCase().replace(/[^a-z0-9]+/g, '-')`)

### Triggers
- **"⬇ Download Print PDF"** → `exportRealPdf()`
- **"🖨️ Print Sheet"** → `printCurrentLayout()` → `window.print()`
- Both unlock the `printer` badge.

---

## 9. Persistence & State

### localStorage Schema (`master_foldly_v4_neural`)

```jsonc
{
  "onboardingDone": false,
  "paperSize": "A4",           // "A4" | "Letter"
  "objectsScanned": 0,
  "badges": {
    "firstCutout": false,
    "puff3d": false,
    "printer": false,
    "masterFolder": false
  },
  "creations": [               // max 12 entries; newest-first
    {
      "id": "proj_<timestamp>",
      "name": "Pedestrian Crossing Sign",
      "category": "Signs",
      "thumb": "data:image/png;base64,...",  // full PNG data-URL
      "status": "Ready|Building|Built",
      "buildStep": 0,
      "totalSteps": 7,
      "moldStyle": "block|standee",
      "heightCm": 18,
      "depthCm": 2.5,
      "sampleId": "crossing",   // null for real photos
      "updatedAt": 1700000000000
    }
  ]
}
```

### Active Workflow State (`WF` object)

Runtime-only (not persisted). Key fields:

| Field | Type | Description |
|---|---|---|
| `open` | bool | Whether workflow overlay is visible |
| `stage` | 1-6 | Current active stage |
| `isRealPhoto` | bool | True if user uploaded/captured, false for sample |
| `rawPhotoUrl` | string | JPEG data-URL of original photo |
| `neuralCutoutUrl` | string | PNG data-URL of neural-only cutout |
| `geminiPolishUrl` | string | PNG data-URL of Gemini-polished cutout |
| `pngDataUrl` | string | Current active cutout (neural or Gemini) |
| `mirroredPngUrl` | string | Horizontally-flipped version for back face |
| `alphaMask` | Uint8ClampedArray | Per-pixel alpha values at mask resolution |
| `baseRgbCanvas` | HTMLCanvasElement | RGB source canvas for mask composition |
| `contourNorm` | {x,y}[] | Normalised silhouette contour points |
| `meta` | object | `{ name, category, edgeColorHex, difficulty, estMinutes, buildTip }` |
| `layoutData` | object | `{ pageW, pageH, objW, objH, depthMm, segs, perim, pts }` |
| `geminiSheetUrl` | string | PNG data-URL of Gemini cutout sheet |
| `buildSteps` | object[] | 7-element assembly guide step objects |
| `glueTimer` | intervalId | Reference to active glue countdown timer |

---

## 10. Gamification — Badges & Stats

| Badge key | Emoji | Title | Unlock trigger |
|---|---|---|---|
| `firstCutout` | ✂️ | Subject Lifter | Completion of Stage 2 (neural PNG ready) |
| `puff3d` | 🧊 | 3D Crafter | Entering Stage 3 (`buildThreeModel` runs) |
| `printer` | 🖨️ | Print Master | Downloading PDF or triggering `window.print()` |
| `masterFolder` | 🏆 | Master Folder | Completing all 7 build steps |

Stats shown on Profile tab:
- **Scanned:** `STORE.objectsScanned` (incremented on Stage 2 completion)
- **Built:** `STORE.creations.filter(c => c.status === 'Built').length`

---

## 11. Onboarding Tour

4-slide modal (`#onboardingModal`) auto-shown 400 ms after first load (when `!STORE.onboardingDone`).

| Slide | Emoji | Title |
|---|---|---|
| 0 | 📸 | Snap ANY Real Object |
| 1 | 🧠 | Neural Lift + Gemini Polish |
| 2 | 🧊 | Build Crisp 3D Paper Models |
| 3 | 🖨️ | AI Cutout on Printing Paper |

Dot indicators, Skip button, Next/Let's Craft button. Completion sets `STORE.onboardingDone = true`. Replayable from Profile tab.

---

## 12. Engineering Flaws & Production Fixes

> Legend: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

### Flaw 1 — Browser-Side ML Causes RAM Crashes on Android 🔴

**Prototype behaviour:**
`runNeuralSegmentation` dynamically imports the full Transformers.js library and downloads RMBG-1.4 ONNX weights (~100 MB) or ISNet FP16 (~80 MB) into the mobile browser's JavaScript heap. Chrome Android on mid-range phones (≤ 4 GB RAM) is killed by the OS, and the app dies silently with no error shown to the user. The download also takes 30–90 seconds on a mobile connection.

**Production fix:**
Move all segmentation to the **FastAPI backend**:
```
Mobile app → POST /api/segment  { image: multipart JPEG }
FastAPI    → rembg (ONNX Runtime, runs on server CPU/GPU)
           → returns trimmed transparent PNG (≤ 512 px)
Mobile app → displays result instantly
```
The mobile app sends a compressed JPEG (< 1 MB), receives a small PNG. No ML weight downloads on device.

---

### Flaw 2 — Gemini API Key Exposed in Client-Side JavaScript 🔴

**Prototype behaviour:**
`const apiKey = ""` — in the Gemini Canvas runtime the key is injected as a plain string into the JavaScript source. Any user who opens DevTools can read the key and make unlimited Gemini API calls billed to the developer's account.

**Production fix:**
- API key lives **only** in `.env` on the server (`GEMINI_API_KEY=...`) or in GCP Secret Manager.
- FastAPI exposes three proxy endpoints: `POST /api/metadata`, `POST /api/polish`, `POST /api/cutout-sheet`.
- The mobile app authenticates to the backend (Firebase Auth JWT), never to Google directly.
- Key rotation does not require an app update.

---

### Flaw 3 — Base64 PNG Thumbnails Blow Up localStorage 🔴

**Prototype behaviour:**
Each creation stores its full transparent PNG cutout as a base64 data-URL in `STORE.creations[n].thumb`. A single 512 × 512 px transparent PNG can be 200 KB – 1.5 MB as base64. After 3–5 high-resolution crafts the 5 MB `localStorage` quota is silently hit; `JSON.parse` fails on the next load; `loadStore()` returns the default empty store, **losing all saved creations**.

**Production fix:**
- Backend saves PNG files to object storage (GCS / S3); returns a UUID and a signed URL.
- SQLite / PostgreSQL stores `{ project_id, user_id, png_url, metadata_json, status, updated_at }`.
- Mobile app stores only UUID + small 48 × 48 px JPEG thumbnail (< 3 KB) in local SQLite.
- `localStorage` / AsyncStorage used only for auth tokens and preferences.

---

### Flaw 4 — Inaccurate Screen-Pixel PDF Scaling 🟠

**Prototype behaviour:**
`buildLayoutData()` computes `objW = heightCm * 10` (mm) and `objH = objW / aspect`. These mm values are passed directly to `jsPDF.addImage(dataUrl, 'PNG', x, y, objW_mm, objH_mm)`. However, the PNG itself was captured from a browser canvas whose pixel dimensions depend on `devicePixelRatio` and CSS pixel size. The PDF viewer scales the PNG to fill those mm — so the printed physical size varies with device DPI and PDF viewer settings, breaking the "5 cm scale check ruler" guarantee.

**Production fix:**
- Server generates PDF using **ReportLab** + **Pillow** (Python):
  - PNG is embedded at a fixed 300 DPI.
  - Physical placement: `x_pt = x_mm * (72 / 25.4)` (ReportLab uses points).
  - Scale-check ruler verified programmatically before saving.
- The scale-check ruler QR code links to a printable calibration card so users can verify on physical paper.

---

### Flaw 5 — Canvas Size / Memory Limits on Low-End Android 🟠

**Prototype behaviour:**
`captureCanvas`, `baseRgbCanvas`, scratch canvases for Gemini images, and the Three.js renderers are all created in-browser. On Samsung Galaxy A-series and similar ≤ 3 GB RAM devices:
- `canvas.getContext('2d')` returns `null` for canvases larger than the GPU texture limit (often 4096 × 4096 px).
- `canvas.toDataURL()` silently returns a blank 1 × 1 px image if the browser runs out of memory.
- Two simultaneous Three.js WebGL contexts (`THREE_STATE` and `UNFOLD_STATE`) can exhaust the WebGL context limit (usually 16 on Chrome Android).

**Production fix:**
- Mobile app sends a device-compressed JPEG (Expo `ImageManipulator`, max 1024 × 1024, quality 0.85).
- Server returns a 512 × 512 px trimmed preview PNG and an original-resolution print PNG.
- Three.js is rendered only in the React Native Expo GL view (single context); unfold uses a separate but managed context that is released after stage 4.

---

### Flaw 6 — No Error Recovery in the Multi-Stage AI Pipeline 🟠

**Prototype behaviour:**
If `runNeuralSegmentation` throws after the UI has entered the "scanning" state (laser bar visible, buttons disabled, process checklist active), there is no reset path. The user is stuck in a broken half-rendered Stage 2 with no way to recover except refreshing the page (losing the current photo).

**Production fix:**
- Every `async` stage function wrapped in `try/catch` with an explicit `resetStageUI(n)` call in the `finally` block.
- Each stage shows a "⚠️ Something went wrong. [Retry]" card when the pipeline fails.
- `AbortController` with 60-second timeout on all API fetch calls.
- The "Retry" button re-runs only the failed step (not the whole stage).

---

### Flaw 7 — Network Failure UX is Missing 🟡

**Prototype behaviour:**
`fetchWithBackoff` retries on HTTP 429/5xx but not on `TypeError: Failed to fetch` (device offline, CORS block, DNS failure). The `catch` in `runGeminiPolishAction` calls `showToast()` with a 2.8-second toast and continues as if everything is fine — the user has no indication the AI call never ran.

**Production fix:**
- Distinguish error types: `err instanceof TypeError` → offline; `err.message.includes('429')` → rate limited; else → server error.
- Offline: queue the request in IndexedDB (`pending_ai_jobs` table); show persistent banner "AI polish will run when you're back online."
- Rate limited: show countdown until next retry.
- Server error: show actionable error card with Retry button.

---

### Flaw 8 — Global Event Listener Leaks on Workflow Open/Close 🟡

**Prototype behaviour:**
`initTouchupBrush()` is called once at boot and attaches `window.addEventListener('mousemove', onMove)` and `window.addEventListener('mouseup', onUp)`. These are never removed. If `initTouchupBrush` were called multiple times (e.g., after a hot-reload or if the function is restructured), duplicate listeners accumulate, causing phantom brush strokes on the next workflow session.

Additionally, the Three.js drag-rotate listeners (`window.addEventListener('mousemove', moveDrag)`) are added in `initThreeScene()` which also runs only once — but the closures capture stale `THREE_STATE`, causing issues if the scene is ever re-initialised.

**Production fix:**
- Use `AbortController` / `signal` options for all `window.addEventListener` calls; abort the controller in `closeWorkflow()`.
- In React Native Expo, use `PanResponder` or `react-native-gesture-handler` instead of raw DOM events.

---

### Flaw 9 — Inline Base64 SVG Causes Main-Thread Jank on Mobile 🟡

**Prototype behaviour:**
`renderPrintablePageSvg()` builds a multi-kilobyte SVG string via string concatenation and assigns it to `svg.innerHTML`. The SVG contains full base64 `<image href="...">` elements (front PNG + back PNG), making the string 3–8 MB. Parsing and rendering this string blocks the main thread for 200–800 ms on a mobile browser, causing a noticeable freeze when switching to Stage 5.

**Production fix:**
- In the mobile app, PDF is generated server-side (ReportLab); the preview shown in-app uses `<Image source={{ uri: blob_url }}>` React Native components, not an SVG with inline base64.
- For the web prototype, replace `<image href="data:...">` with `<image href="blob:">` object URLs (`URL.createObjectURL(blob)`) to avoid base64 overhead in the DOM string.

---

### Flaw 10 — Contour Loss at 128 × 128 Resolution 🟡

**Prototype behaviour:**
`extractCraftContour` downsamples every PNG to 128 × 128 before tracing the Moore-Neighbour boundary. At this resolution, one pixel represents 0.78% of the object's width. Fine geometric details — sneaker laces, fox ear tips, the pedestrian figure's limbs — collapse to single pixels and are lost from the contour, producing a crude approximation of the actual silhouette.

**Production fix:**
- Server-side contour extraction using **OpenCV** `cv2.findContours` + `cv2.approxPolyDP` at 512 × 512 resolution.
- Returns normalised `{x,y}[]` JSON array; mobile app uses it directly for Three.js extrusion.
- Optionally offers a "Detail" vs "Easy Cut" toggle that changes `approxPolyDP` epsilon.

---

### Flaw 11 — No User Identity or Cross-Device Sync 🟡

**Prototype behaviour:**
All state is stored in anonymous `localStorage`. Clearing browser data or switching to another device (phone → tablet) loses all saved creations. There is no account system.

**Production fix:**
- **Firebase Auth** (Google Sign-In) on the mobile app.
- Creations synced to the FastAPI backend under the user's UID.
- Offline-first: local SQLite (Expo SQLite) is source of truth; background sync reconciles with the backend.

---

### Flaw 12 — Creations Silently Deleted After 12 Entries 🟢

**Prototype behaviour:**
`if (STORE.creations.length > 12) STORE.creations = STORE.creations.slice(0, 12);` — the 13th creation silently drops the oldest without any notification to the user.

**Production fix:**
- Backend pagination: `GET /api/creations?page=1&limit=20`.
- Local cache holds the 20 most recent; "Load more" fetches older entries.
- No silent deletion.

---

### Flaw 13 — `window.print()` Is Unreliable on Mobile 🟢

**Prototype behaviour:**
Chrome Android and Safari iOS handle `@media print` inconsistently: Chrome Android may print the entire page ignoring `display: none`; Safari iOS may not trigger the print dialog at all in PWA mode.

**Production fix:**
- Mobile app uses server-generated PDF (ReportLab); native `expo-print` or `expo-sharing` to open the system PDF viewer / share sheet.
- `window.print()` kept only as a web fallback with a prominent warning: "For best results, download the PDF and print from your computer."

---

### Flaw 14 — Unversioned CDN Dependencies (Supply-Chain Risk) 🟢

**Prototype behaviour:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js">
```
No Subresource Integrity (SRI) hash. If the CDN is compromised, malicious code runs with full access to the user's canvas data, API keys, and localStorage. Also: `THREE.sRGBEncoding` is deprecated in Three.js r152+; upgrading the CDN URL without auditing would break colour rendering silently.

**Production fix:**
- Add `integrity="sha384-..."` and `crossorigin="anonymous"` to all CDN `<script>` tags in the reference prototype (documentation only — do not modify the prototype itself).
- In the Expo mobile app, install `three` and `jspdf` via npm with pinned semantic versions; subject to `npm audit` in CI.

---

*End of Project Specification — Foldly v1.0*
