# BQR — Mosaic QR Code Generator

## What This Is

A web-based mosaic QR code generator that embeds logos and images into QR codes using halftone dot-sizing techniques. Users upload an image and URL, and get a QR code where the image is visible through variable dot sizes — scannable and visually recognizable. Think MosaicQR.com but with more customization: color themes, multiple dot styles, and background options.

## Core Value

Generated QR codes must scan reliably AND look visually clean — the logo/image must be clearly recognizable within the QR pattern, not trashy or muddy.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Upload image + URL → generate mosaic QR code
- [ ] QR codes scan reliably across devices and apps
- [ ] Logo/image clearly recognizable within QR pattern
- [ ] Color themes and custom palettes
- [ ] Multiple dot styles (circles, squares, rounded squares, diamonds)
- [ ] Background customization (gradients, patterns, custom images)
- [ ] Download as PNG
- [ ] Real-time preview during customization
- [ ] Client-side generation (image never leaves browser)

### Out of Scope

- SVG/PDF export — defer to v2
- Monetization/payments — fully free product
- User accounts/saved designs — stateless, no backend storage
- Batch generation — one-at-a-time for v1
- Mobile native app — web-only, responsive
- Server-side generation — all processing in browser

## Context

Prior attempt at ~/zzz/qr/ (BrandQR) tried 3 approaches in Python (sub-module dithering, halftone dots, codeword-aware module flipping). All produced results that looked trashy — hard to scan, logos not recognizable. The sophisticated v3 approach with adaptive profiling and render-time modulation still couldn't match MosaicQR's clean output.

MosaicQR (mosaicqr.com) is the quality benchmark. Their showcase demonstrates QR codes that are immediately recognizable and fast to scan. Their approach appears to use precise halftone dot sizing with clean, uniform styling — fundamentally different from module flipping or sub-pixel dithering.

Key lesson from prior failure: the algorithm matters more than the sophistication. Clean dot sizing with proper QR spec understanding likely beats complex module manipulation.

## Constraints

- **Tech stack**: TypeScript + Next.js, client-side Canvas API rendering
- **Deployment**: Vercel (free tier compatible)
- **Performance**: Real-time preview — generation must be fast enough for interactive use
- **Quality bar**: Must match or exceed MosaicQR's output quality (scannability + visual clarity)
- **Privacy**: All image processing client-side — no server uploads

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Clean slate over salvaging BrandQR | Prior codebase carried algorithmic assumptions that produced poor results | — Pending |
| Client-side Canvas over server-side | Privacy (no image uploads), zero server cost, instant preview | — Pending |
| TypeScript + Next.js over Python | Single language for full stack, natural Vercel deployment, Canvas API access | — Pending |
| PNG-only for v1 | Simplest output format, universally supported, defer SVG/PDF complexity | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-06 after initialization*
