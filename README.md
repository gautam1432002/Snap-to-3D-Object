# Foldly ✂️ 📐 — Photo-to-3D Papercraft Studio

> Turn any real-world photo into a printable, foldable 3D papercraft silhouette with AI background lifting, exact-scale blueprints, and step-by-step assembly guides.

---

## 🌟 Overview

**Foldly** is a full-stack physical crafting studio combining:
- **FastAPI Python Backend**: Gemini Flash AI subject segmentation, sub-pixel alpha matting, Douglas-Peucker contour polygon extraction, and SQLite project persistence.
- **Expo / React Native Android App**: Dark-mode Bento grid UI, floating Liquid Glass navigation bar, 6-stage interactive workflow with 360° pan-rotation 3D preview, animated unfold slider, and native 300-DPI exact-scale PDF blueprint generation.

---

## 🏗️ Architecture & Features

### 1. Six-Stage Interactive Workflow
1. **📸 Capture**: Take a photo with Android camera or pick from gallery, auto-compressed to 1600px.
2. **✨ Lift**: Background removal via Gemini AI + edge polishing and physical metric selection (Height 8–30 cm, Depth 2–8 cm, Wall Edge Color).
3. **🧊 3D Preview**: Interactive 3D extruded silhouette slab with continuous 360° rotation gesture controls and realistic paper drop shadow.
4. **📐 Unfold**: Interactive 3D-to-2D unfold scrubber animating the front face, mirrored back, perimeter side strip segments, and fold-out desk stand.
5. **🖨️ Print**: Exact-scale A4 / US Letter blueprint sheet with a 50 mm physical calibration ruler and one-tap Android PDF printing/sharing.
6. **✂️ Build**: 7-step maker checklist with integrated 20-second glue countdown timer, vibration haptics, and celebratory badge unlock.

### 2. Design System
- **Theme**: Dark aesthetic (`#0A0B10`) with craft cutting-mat jade accents (`#10B981`), amber glue indicators (`#F59E0B`), and vibrant purple badges (`#8B5CF6`).
- **Floating Liquid Glass Tab Bar**: 4 main tabs (`Studio`, `Creations`, `Badges`, `Guide`) with frosted glass blur.
- **Bento Card Layouts**: Fluid cards with subtle micro-borders and soft ambient glows.

---

## 📁 Repository Structure

```text
foldly-app/
├── backend/                  # FastAPI Python Backend
│   ├── app/
│   │   ├── api/routes.py     # REST API (upload, jobs, polish, cutout-sheet)
│   │   ├── core/config.py    # Environment settings & CORS
│   │   ├── db/database.py    # SQLite engine & database schema
│   │   ├── models/schemas.py # Pydantic schemas & enums
│   │   ├── services/         # Gemini AI, segmentation & contour extraction
│   │   └── main.py           # Application entrypoint
│   ├── tests/                # Pytest test suite (100% passing)
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend configuration template
│
├── mobile/                   # Expo React Native App (SDK 52)
│   ├── app/
│   │   ├── (tabs)/           # Studio, Creations, Badges, Guide
│   │   ├── _layout.tsx       # Root layout & modal navigation
│   │   └── workflow.tsx      # Full 6-stage crafting workflow
│   ├── components/           # GlassTabBar, BentoCard, FeedbackBanner
│   ├── constants/theme.ts    # Centralized design tokens & typography
│   ├── services/             # API client & AsyncStorage persistent storage
│   ├── package.json          # Mobile dependencies
│   └── .env.example          # Mobile API URL template
│
└── docs/
    └── PROJECT_SPEC.md       # Comprehensive system specification
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend

# Create and activate Python virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY (optional for mock mode)

# Run tests
pytest

# Start development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your PC's IP (e.g. http://192.168.1.5:8000)

# Start Expo bundler
npx expo start -c
```

- Press **`w`** in the terminal to preview in your web browser (`http://localhost:8081`).
- Or scan the terminal QR code using **Expo Go** on your Android device.

---

## 📜 License
MIT License. Built with ❤️ for makers and crafters.
