# Foldly ✂️ 📐 — Photo-to-3D Papercraft Studio

> Turn any real-world photo into a physical, foldable 3D papercraft silhouette with AI background lifting, exact-scale blueprints, and step-by-step assembly guides.

---

## 🌟 Overview

**Foldly** is a full-stack physical crafting studio combining:
- **FastAPI Python Backend**: Gemini Flash AI subject segmentation, sub-pixel alpha matting, Douglas-Peucker contour polygon extraction, and SQLite project persistence.
- **Expo / React Native Android App**: Dark-mode Bento grid UI, floating Liquid Glass navigation bar, 6-stage interactive workflow with 360° pan-rotation 3D preview, animated unfold slider, and native 300-DPI exact-scale PDF blueprint generation.

---

## 🏗️ Architecture & Features

### 1. Six-Stage Interactive Workflow
1. **📸 Capture**: Take a photo with Android camera or pick from gallery, auto-compressed to 1024px.
2. **✨ Lift**: Background removal via neural AI + edge polishing and physical metric selection (Height 12–26 cm, Depth 1–8 cm, Wall Edge Color).
3. **🧊 3D Preview**: Interactive 3D extruded silhouette slab with continuous 360° rotation gesture controls and realistic paper drop shadow.
4. **📐 Unfold**: Interactive 3D-to-2D unfold scrubber animating the front face, mirrored back, perimeter side strip segments, and fold-out desk stand.
5. **🖨️ Print**: Exact-scale A4 / US Letter blueprint sheet with a 50 mm physical calibration ruler and one-tap Android PDF printing/sharing embedding crisp Base64 artwork.
6. **✂️ Build**: 7-step maker checklist with integrated 20-second glue countdown timer, vibration haptics, and celebratory badge unlock.

### 2. Design System
- **Theme**: Dark aesthetic (`#0A0B10`) with craft cutting-mat jade accents (`#10B981`), amber glue indicators (`#F59E0B`), and vibrant purple badges (`#8B5CF6`).
- **Floating Liquid Glass Tab Bar**: 4 main tabs (`Studio`, `Creations`, `Badges`, `Guide`) with frosted glass blur.
- **Bento Card Layouts**: Fluid cards with subtle micro-borders and soft ambient glows.

---

## 📁 Repository Structure

```text
foldly-app/
├── backend/                       # FastAPI Python Backend
│   ├── app/
│   │   ├── api/routes.py          # REST API (upload, jobs, polish, cutout-sheet)
│   │   ├── core/config.py         # Environment settings & CORS
│   │   ├── db/database.py         # SQLite engine & database schema
│   │   ├── models/schemas.py      # Pydantic schemas & enums
│   │   ├── services/              # Gemini AI, segmentation & contour extraction
│   │   └── main.py                # Application entrypoint
│   ├── tests/                     # Pytest test suite (100% passing)
│   ├── requirements.txt           # Python dependencies
│   └── .env.example               # Backend configuration template
│
├── mobile/                        # Expo React Native App (SDK 58 / React Native 0.88 / React 19)
│   ├── app/
│   │   ├── (tabs)/                # Studio, Creations, Badges, Guide
│   │   ├── _layout.tsx            # Root layout & modal navigation
│   │   └── workflow.tsx           # State coordinator for 6-stage workflow
│   ├── components/
│   │   ├── workflow/              # Modular stage components (Stage 1 to 6)
│   │   ├── BentoCard.tsx          # Reusable dark Bento container
│   │   ├── FeedbackBanner.tsx     # Connection & status alerts
│   │   └── GlassTabBar.tsx        # Floating liquid glass tab bar
│   ├── utils/
│   │   └── pdfTemplate.ts         # 300-DPI exact-scale HTML-to-PDF template
│   ├── constants/theme.ts         # Centralized design tokens & typography
│   ├── services/
│   │   ├── api.ts                 # API client, 90s polling & base64 converter
│   │   └── storage.ts             # AsyncStorage persistent storage & badges
│   ├── eas.json                   # EAS build profiles (APK & App Bundle)
│   ├── package.json               # Mobile dependencies
│   └── .env.example               # Mobile API URL template
│
├── docs/
│   └── PROJECT_SPEC.md            # Comprehensive system specification
└── reference/
    └── master_foldly_photo_to_3d_paper_craft_studio.html # Reference design
```

---

## 🚀 Quick Start (Windows PowerShell)

### Step 1: Start the Backend Server

```powershell
# Navigate to backend directory
cd C:\Users\hp\Desktop\foldly-app\backend

# Activate the existing virtual environment
.\.venv\Scripts\Activate.ps1

# (Optional) Set your Gemini API key in .env if not already done:
# Set-Content -Path .env -Value "GEMINI_API_KEY=your_key_here"

# Run backend tests to verify health
python -m pytest tests -v

# Start FastAPI development server (accessible over your local Wi-Fi)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

### Step 2: Configure Mobile API Endpoint

Find your PC's local Wi-Fi IP address:
```powershell
ipconfig | Select-String "IPv4"
# Example output: 192.168.1.5
```

Set the IP inside `mobile/.env`:
```powershell
cd C:\Users\hp\Desktop\foldly-app\mobile
Set-Content -Path .env -Value "EXPO_PUBLIC_API_URL=http://192.168.1.5:8000"
```

---

### Step 3: Run Mobile on Android (Expo Go) or Web

```powershell
cd C:\Users\hp\Desktop\foldly-app\mobile

# 1. Clear any conflicting node options
Remove-Item env:NODE_OPTIONS -ErrorAction SilentlyContinue

# 2. Launch Expo Bundler with a clean cache
npx expo start -c
```

- **To run in your PC's Web Browser:** Press **`w`** (opens `http://localhost:8081`).
- **To run on your Android Phone:**
  1. Open the **Expo Go** app on your phone.
  2. Scan the QR code in the terminal.
  3. *Note:* If your phone and PC are on separate networks or your router has AP isolation, start Expo with tunneling:
     ```powershell
     npx expo start --tunnel -c
     ```

---

### Step 4: Build a Standalone Android `.apk` with EAS

To generate an installable Android APK that runs independently without Expo Go:

```powershell
cd C:\Users\hp\Desktop\foldly-app\mobile

# 1. Install EAS CLI globally (if not installed)
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Build standalone APK using the preview profile configured in eas.json
eas build --platform android --profile preview
```

---

## 🧪 Verification & Health Checks

| Check | Target | Command |
|---|---|---|
| **Backend Unit Tests** | 7 tests pass (0 warnings) | `cd backend && python -m pytest tests -v` |
| **Backend Health API** | HTTP 200 `{"status":"ok"}` | `curl http://localhost:8000/health` |
| **Mobile Config Doctor** | 18/18 checks pass | `cd mobile && npx expo-doctor` |
| **Mobile TypeScript** | 0 compile errors | `cd mobile && npx tsc --noEmit` |
| **Public Config Export**| Validated schema | `cd mobile && npx expo config --type public` |

---

## 📜 License
MIT License. Built with ❤️ for makers and crafters.
