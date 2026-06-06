# Research Summary: BQR — Mosaic QR Code Generator

**Date:** 2026-06-06
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

## Executive Summary

BQR generates MosaicQR-quality artistic QR codes by embedding images via **halftone dot-sizing** — varying dot radius per module proportional to image brightness while never changing which modules are dark vs light. This is fundamentally different from the prior BrandQR approach (module flipping, sub-pixel dithering, codeword manipulation), which failed because it treated modules as flippable pixels.

The stack is deliberately minimal: Next.js 15 + React 19 + TypeScript + Tailwind v4 + shadcn/ui for UI, `node-qrcode` for raw QR matrix access, and native Canvas API for all rendering. No server, no image-processing library.

## Stack Consensus

| Component | Choice | Why |
|-----------|--------|-----|
| Framework | Next.js 15.5 + React 19 | Static export, Vercel deploy, zero server cost |
| QR Library | node-qrcode 1.5.4 | Only npm package exposing raw BitMatrix via `QRCode.create()` |
| Rendering | Native Canvas API | 4 API calls handle all image processing; no library needed |
| State | Zustand 5.x | Minimal, no Provider, no re-render cascade |
| Styling | Tailwind v4 + shadcn/ui | Accessible primitives for real-time controls |
| Upload | react-dropzone 14.x | Hook-based drag-and-drop |

**Critical exclusion:** `qr-code-styling` does NOT expose module matrix — incompatible with halftone rendering.

## Core Algorithm

The halftone technique:
1. Generate QR matrix via `QRCode.create()`
2. Classify every module: FINDER, TIMING, ALIGNMENT, FORMAT_INFO, or DATA
3. Protected zones (finder, timing, alignment) → render as solid full-size squares
4. DATA modules → dot radius scales with image luminance at that position
   - Dark modules: radius `lerp(0.35, 1.0, 1 - luma) * cellHalf` (min ~40%)
   - Light modules: radius `lerp(0, 0.3, 1 - luma) * cellHalf` (skip if < 1px)
5. Error correction H (30%) is mandatory — absorbs the visual "damage"

**Why this works:** Scanner reads whether ink falls in center region. Center is never disturbed — only dot size changes. QR data is 100% preserved.

**Why BrandQR failed:** All 3 modes changed module dark/light values (flipping, dithering, codeword manipulation). This corrupts QR data and fights error correction instead of working with it.

## Feature Priorities

**Table stakes (v1 launch blockers):**
- URL input + QR generation
- Image upload (client-side only)
- Halftone embedding algorithm
- Real-time preview (~300ms debounce)
- Error correction H enforced
- Finder pattern + quiet zone preservation
- PNG download at 2x/4x
- Circle + square dot styles
- Foreground/background color pickers

**Differentiators (v1.x):**
- Eye/corner pattern customization
- Image influence strength slider
- Gradient fills with contrast enforcement
- Additional dot styles (rounded, diamond)
- Color theme presets
- Background customization
- Showcase gallery
- In-app scan validation

**Anti-features:**
- Center logo overlay (defeats mosaic concept)
- Inverted/light-on-dark (scanner failures)
- AI art mode (wrong stack)
- Dynamic QR (requires server)

## Architecture

Linear pipeline: `encode → classify → preprocess → halftone → render`

All pure functions in `lib/`, no React dependencies. Single `useQRGenerator` hook orchestrates. Canvas batching: accumulate all dot paths → one `fill()` call (2 fills total vs N² naive).

**Build order:**
1. `lib/qr/encode.ts` — QR matrix generation
2. `lib/qr/classify.ts` — module type classification
3. `lib/render/dotShapes.ts` — Canvas path helpers
4. `lib/image/preprocess.ts` — image → luminance grid
5. `lib/render/halftone.ts` — core renderer
6. `lib/render/pipeline.ts` — orchestrator
7. `useQRGenerator` hook — React adapter
8. UI components — thin controlled adapters

## Critical Pitfalls

| # | Pitfall | Prevention | Phase |
|---|---------|------------|-------|
| 1 | Module flipping (BrandQR's fatal error) | Never change dark/light value; only change radius | 1 |
| 2 | Corrupting finder/timing/alignment | Build ModuleType[][] mask before any rendering | 1 |
| 3 | Quiet zone omission | 4-module minimum border (ISO 18004) | 1 |
| 4 | Canvas anti-aliasing / HiDPI artifacts | devicePixelRatio from day 1; integer coordinates | 1 |
| 5 | Over-engineering adaptive profiles | Prove basic dot-sizing works first | All |
| 6 | Muddy logos from naive downscale | Lanczos/bicubic + sharpening; simple logos work best | 2 |

## Open Questions

- Exact min dot radius calibration needs empirical scan testing (start at 40% cellSize)
- `@types/qrcode` doesn't export BitMatrix — needs manual type declaration
- Eye/corner rounding scannability thresholds — empirical testing needed before exposing in UI
- Light-module dot rendering (show dark image in light areas?) — test if it confuses scanners

## Confidence

| Area | Level |
|------|-------|
| Stack selection | HIGH |
| Core algorithm | HIGH |
| Architecture | HIGH |
| Pitfall analysis | HIGH |
| Dot radius calibration | MEDIUM (needs empirical tuning) |

---
*Research completed: 2026-06-06*
