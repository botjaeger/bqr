# Roadmap: BQR — Mosaic QR Code Generator

## Overview

BQR is built in ten phases that progress from raw canvas infrastructure through the halftone algorithm core, then layer on image upload, real-time preview, scan validation, visual customization, and finally a showcase gallery. Every phase delivers a verifiable end-to-end capability. The critical constraint throughout: dot radius varies, dark/light module values never change.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Project Scaffold** - Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui initialized and deploying to Vercel (completed 2026-06-06)
- [ ] **Phase 2: QR Matrix Engine** - Raw QR matrix generation with module classification and spec-compliant rendering
- [ ] **Phase 3: Halftone Renderer** - Core halftone dot-sizing algorithm on Canvas with protected zones
- [ ] **Phase 4: Image Upload & Pipeline** - Drag-drop image upload wired end-to-end through halftone to produce mosaic QR
- [ ] **Phase 5: Real-Time Preview** - Debounced live canvas preview updates as user changes any setting
- [ ] **Phase 6: Scan Validation** - In-app scan check confirming generated QR code is readable
- [ ] **Phase 7: Dot Style Customization** - Circle, square, rounded square, and diamond dot style switcher
- [ ] **Phase 8: Color Customization** - Foreground/background color pickers and separate eye/corner pattern styles
- [ ] **Phase 9: PNG Download** - High-resolution PNG export at 2x and 4x scale
- [ ] **Phase 10: Showcase Gallery** - Curated example gallery demonstrating mosaic QR quality

## Phase Details

### Phase 1: Project Scaffold
**Goal**: Next.js 15 project with TypeScript, Tailwind v4, and shadcn/ui is running locally and deployed on Vercel with a blank canvas page
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: (none — infrastructure foundation)
**Success Criteria** (what must be TRUE):
  1. Running `npm run dev` serves the app at localhost with no TypeScript errors
  2. Vercel deployment URL is live and loads the app from `main` branch push
  3. Tailwind v4 styles and at least one shadcn/ui component render correctly in the browser
  4. Canvas element is present on the page and drawable via the Canvas API
**Plans**: 2 plans
Plans:
- [x] 01-01-PLAN.md — Next.js 15 scaffold with Tailwind v4 and shadcn/ui Button
- [x] 01-02-PLAN.md — DrawingCanvas component at /canvas + Vercel deployment

### Phase 2: QR Matrix Engine
**Goal**: Users can enter a URL and see a spec-compliant QR code rendered on canvas with correct finder patterns, timing patterns, and quiet zone
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: QR-01, QR-02, QR-03, QR-04
**Success Criteria** (what must be TRUE):
  1. User enters a URL and a QR code appears on the canvas
  2. The QR code uses error correction level H (confirmed via library config)
  3. Finder patterns, timing patterns, and alignment patterns render as solid full-size squares — not dots
  4. A quiet zone of at least 4 modules surrounds the QR on all sides
  5. The generated QR code scans correctly in a phone camera app
**Plans**: TBD

### Phase 3: Halftone Renderer
**Goal**: QR data modules render as dots whose radius varies with image luminance — protected structural zones render as solid squares — using pure Canvas API with no module value changes
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: IMG-02, IMG-05
**Success Criteria** (what must be TRUE):
  1. Data module dots visibly vary in size across the QR grid (larger in dark image areas, smaller in light areas)
  2. Finder, timing, and alignment zones remain as solid full-size squares regardless of image content
  3. No image data is sent to any server — all luminance processing happens in the browser (verifiable via network tab: zero image upload requests)
  4. The halftone QR still scans correctly in a phone camera app after dot-size modulation
**Plans**: TBD

### Phase 4: Image Upload & Pipeline
**Goal**: User can upload an image via drag-and-drop or file picker and see it embedded into the QR dot pattern as a recognizable mosaic
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: IMG-01, IMG-03
**Success Criteria** (what must be TRUE):
  1. User can drag an image file (PNG, JPG, or WEBP) onto the upload zone and it is accepted
  2. User can click the upload zone to open a file picker and select an image
  3. After upload, the QR canvas updates to show the image embedded via halftone dot sizing
  4. User can move an influence strength slider and the dot-size modulation visibly increases or decreases in response
  5. A recognizable logo or photo is visually present within the QR pattern — not just a uniform grid
**Plans**: TBD
**UI hint**: yes

### Phase 5: Real-Time Preview
**Goal**: Every settings change instantly reflects in the canvas preview without full page reload or manual regeneration
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: OUT-01
**Success Criteria** (what must be TRUE):
  1. Changing the URL input updates the QR canvas within approximately 300ms (debounced)
  2. Moving the influence strength slider updates the canvas continuously as the slider moves
  3. No full page reload occurs during any settings interaction
  4. The preview canvas remains responsive and not frozen during rapid consecutive changes
**Plans**: TBD
**UI hint**: yes

### Phase 6: Scan Validation
**Goal**: User can confirm the generated mosaic QR code is scannable without leaving the app
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: IMG-04
**Success Criteria** (what must be TRUE):
  1. An in-app scan check button or indicator is visible in the UI
  2. Activating the scan check decodes the QR from the canvas and confirms whether it matches the entered URL
  3. If the QR is unreadable the user sees a clear error message indicating the scan failed
  4. If the QR is readable the user sees a confirmation that the code is valid and what URL it encodes
**Plans**: TBD
**UI hint**: yes

### Phase 7: Dot Style Customization
**Goal**: User can switch between four dot shape styles and see the QR canvas update immediately
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: VIS-01
**Success Criteria** (what must be TRUE):
  1. User sees four dot style options: circle, square, rounded square, and diamond
  2. Selecting any dot style updates the canvas to render data modules in that shape
  3. Protected zones (finder, timing, alignment) remain as solid squares regardless of selected dot style
  4. The QR code continues to scan correctly after switching dot styles
**Plans**: TBD
**UI hint**: yes

### Phase 8: Color Customization
**Goal**: User can set custom foreground and background colors and customize eye/corner pattern styles separately from body dots
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: VIS-02, VIS-03
**Success Criteria** (what must be TRUE):
  1. User can open a foreground color picker and the QR dots update to the chosen color
  2. User can open a background color picker and the canvas background updates to the chosen color
  3. User can select a different style for the eye/corner patterns (finder pattern outer/inner squares) independently of the body dot style
  4. Color and style combinations that would break scannability are either prevented or flagged to the user
**Plans**: TBD
**UI hint**: yes

### Phase 9: PNG Download
**Goal**: User can download the current QR canvas as a high-resolution PNG at their chosen scale
**Mode:** mvp
**Depends on**: Phase 8
**Requirements**: OUT-02
**Success Criteria** (what must be TRUE):
  1. A download button is visible and clickable in the UI
  2. Clicking download triggers a browser file download of a PNG file
  3. The downloaded PNG is available at 2x resolution (suitable for print and digital use)
  4. A 4x resolution option is also available and produces a larger, sharper PNG
  5. The downloaded PNG matches what is visible in the canvas preview at the moment of download
**Plans**: TBD
**UI hint**: yes

### Phase 10: Showcase Gallery
**Goal**: Visitors can see curated mosaic QR code examples that demonstrate visual quality and scannability before uploading their own image
**Mode:** mvp
**Depends on**: Phase 9
**Requirements**: POL-01
**Success Criteria** (what must be TRUE):
  1. A gallery section is visible on the page with at least four pre-generated mosaic QR code examples
  2. Each gallery item shows a different source image embedded via halftone (demonstrating variety)
  3. All gallery QR codes are scannable by a phone camera
  4. The gallery loads without any user interaction and is visible on first page load
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Scaffold | 2/2 | Complete   | 2026-06-06 |
| 2. QR Matrix Engine | 0/TBD | Not started | - |
| 3. Halftone Renderer | 0/TBD | Not started | - |
| 4. Image Upload & Pipeline | 0/TBD | Not started | - |
| 5. Real-Time Preview | 0/TBD | Not started | - |
| 6. Scan Validation | 0/TBD | Not started | - |
| 7. Dot Style Customization | 0/TBD | Not started | - |
| 8. Color Customization | 0/TBD | Not started | - |
| 9. PNG Download | 0/TBD | Not started | - |
| 10. Showcase Gallery | 0/TBD | Not started | - |
