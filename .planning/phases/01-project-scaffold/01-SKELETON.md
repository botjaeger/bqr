# Walking Skeleton — BQR: Mosaic QR Code Generator

**Phase:** 1
**Generated:** 2026-06-06

## Capability Proven End-to-End

A visitor can open the app, navigate to the /canvas page, and draw freehand on a canvas element with their mouse — served by a Next.js 15 app deployed to Vercel via GitHub main branch push.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15.5 + App Router + React 19 | Vercel-native; static export for zero server cost; App Router "use client" boundary keeps Canvas API out of SSR cleanly |
| Data layer | None (client-side only) | BQR is a stateless tool — all QR generation and image processing happen in the browser; no DB, no API routes, no user accounts |
| Auth | None | No user state, no sessions; stateless by design |
| Styling | Tailwind CSS v4 (CSS-first) + shadcn/ui | Tailwind v4: @import "tailwindcss" is the entire config, no tailwind.config.js; shadcn/ui provides accessible Radix-based primitives for sliders, color pickers, and buttons used in Phases 5–8 |
| Canvas rendering | Native Canvas 2D API | All QR dot rendering, halftone sizing, and image processing use canvas.getContext('2d') — no WebGL, no Fabric.js, no p5.js; four Canvas API calls handle everything needed |
| State management | Zustand 5.x | Introduced in Phase 4+; not needed in Phase 1 but pre-decided to avoid re-litigating in Phase 5's real-time preview work |
| Deployment target | Vercel (free tier) | Automatic preview on every PR, production on main push; Next.js detection is native; zero config needed beyond linking the GitHub repo |
| Directory layout | App Router flat (app/, components/, lib/) | Next.js convention; no src/ wrapper (cleaner imports); lib/ for pure functions (QR encode, classify, halftone renderer — Phases 2–3); components/ for React UI components |
| TypeScript | Strict mode (strict: true) | Off-by-one bugs in QR matrix indexing are silent without strict null checks; all matrix access code (Phases 2–3) must be type-safe |

## Stack Touched in Phase 1

- [x] Project scaffold — Next.js 15.5, React 19, TypeScript 5.x strict, ESLint
- [x] Routing — two real routes: / (index) and /canvas
- [x] Database — N/A (no data layer in this project by design)
- [x] UI — shadcn/ui Button rendered on / ; DrawingCanvas component on /canvas with mouse interaction
- [x] Deployment — Vercel project linked to GitHub; main branch push triggers production deploy

## Key Contracts (Future Phases Must Honor)

- **Canvas coordinate system:** offsetX/offsetY relative to canvas element. devicePixelRatio scaling is deferred to Phase 3 (introduced with QR renderer to avoid coordinate drift).
- **"use client" boundary:** DrawingCanvas and all Canvas-touching components must be client components. Server components must not import canvas refs or mouse handlers.
- **Tailwind v4 convention:** No tailwind.config.js. Theme customizations go in @theme blocks inside globals.css. All shadcn/ui component installs use `npx shadcn@latest add <component>`.
- **Import alias:** @/ maps to project root (not src/). Use @/components, @/lib, @/app consistently.
- **No server-side rendering for canvas:** Canvas element must be inside a "use client" component or rendered conditionally with typeof window !== 'undefined'.

## Out of Scope (Deferred to Later Slices)

- QR matrix generation (Phase 2)
- Halftone dot-sizing algorithm (Phase 3)
- Image upload and drag-and-drop (Phase 4)
- Real-time debounced preview (Phase 5)
- In-app scan validation (Phase 6)
- Dot style customization (Phase 7)
- Color pickers (Phase 8)
- PNG download (Phase 9)
- Showcase gallery (Phase 10)
- devicePixelRatio / HiDPI canvas scaling (Phase 3 — introduced with QR renderer)
- Zustand state store (Phase 4 — introduced when settings state becomes multi-component)
- SVG/PDF export (v2 — explicitly deferred)
- User accounts, persistence, server-side generation (out of scope entirely)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: User enters a URL and sees a spec-compliant QR code rendered on the /canvas page
- Phase 3: QR data modules render as halftone dots sized by image luminance
- Phase 4: User uploads an image and sees it embedded in the QR dot pattern
- Phase 5: Every settings change reflects in the canvas within ~300ms (debounced preview)
- Phase 6: User can confirm the QR is scannable without leaving the app
- Phase 7: User switches between four dot shape styles
- Phase 8: User sets custom foreground/background colors and eye styles
- Phase 9: User downloads a high-resolution PNG
- Phase 10: Visitors see a curated gallery of mosaic QR examples on the landing page
