<!-- GSD:project-start source:PROJECT.md -->
## Project

**BQR — Mosaic QR Code Generator**

A web-based mosaic QR code generator that embeds logos and images into QR codes using halftone dot-sizing techniques. Users upload an image and URL, and get a QR code where the image is visible through variable dot sizes — scannable and visually recognizable. Think MosaicQR.com but with more customization: color themes, multiple dot styles, and background options.

**Core Value:** Generated QR codes must scan reliably AND look visually clean — the logo/image must be clearly recognizable within the QR pattern, not trashy or muddy.

### Constraints

- **Tech stack**: TypeScript + Next.js, client-side Canvas API rendering
- **Deployment**: Vercel (free tier compatible)
- **Performance**: Real-time preview — generation must be fast enough for interactive use
- **Quality bar**: Must match or exceed MosaicQR's output quality (scannability + visual clarity)
- **Privacy**: All image processing client-side — no server uploads
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.5 | App framework, routing, static export | Vercel-native, App Router, static export for zero-cost hosting; "use client" boundary keeps Canvas out of SSR |
| React | 19.x | UI layer | Ships with Next.js 15; concurrent rendering prevents UI freeze during generation |
| TypeScript | 5.x | Type safety | First-class Next.js support; critical for QR matrix indexing (off-by-one bugs are silent without types) |
| Tailwind CSS | v4 | Styling | CSS-first config (@theme directive), 70% smaller output than v3, no tailwind.config.js needed |
| shadcn/ui | latest | UI components | Copy-paste components on Radix UI primitives; accessible sliders/inputs critical for real-time controls |
### QR Encoding
| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| qrcode (node-qrcode) | 1.5.4 | QR matrix generation | `QRCode.create(text, opts)` returns a QRCode object with a `modules` BitMatrix; `modules.get(row, col)` reads each module as dark (1) or light (0). This is the critical API for custom halftone rendering. Browser-compatible via bundler. |
### Image Processing (Browser)
| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Native Canvas API | Browser built-in | Image decode, resize, pixel read | `drawImage()` + `getImageData()` is sufficient for downsampling an uploaded image to QR-grid dimensions. No library needed. |
| (none for dithering) | — | Floyd-Steinberg dithering | Implement inline in ~50 lines of TypeScript. All published packages (floyd-steinberg npm) are unmaintained; the algorithm is trivial and benefits from being colocated with your QR rendering logic. |
### State Management
| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Zustand | 5.x | Generator settings state | Minimal API, no Provider, 41% React ecosystem adoption in 2024. Holds URL, uploaded image, error correction level, dot style, color theme, and triggers re-renders only for changed slices. Avoids prop-drilling across the upload → settings → canvas → download component chain. |
### File Upload
| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-dropzone | 14.x | Image file ingress | Simplest hook-based API (`useDropzone`), drag-and-drop + click-to-select, MIME type filtering out of the box |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| Vercel CLI | Local dev + deploy | `vercel dev` mirrors prod environment exactly |
| ESLint + `@typescript-eslint` | Lint | Next.js includes this; enforce strict no-any for QR matrix code |
| Prettier | Format | Consistent formatting, no config needed |
## Installation
# Create project
# QR encoding
# State
# File upload
# UI components (shadcn/ui — copies components into your project)
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `qrcode` (node-qrcode) | nayuki/QR-Code-generator | Use nayuki if you need the absolute best spec-compliance and control. The TypeScript source ships directly from the repo (not on npm with a stable package); `qrcode` is easier to install and exposes the BitMatrix API sufficient for halftone. |
| `qrcode` (node-qrcode) | `qr-code-styling` v1.9.2 | Use qr-code-styling only if you want its predefined dot shapes (rounded, classy, etc.) without writing a custom renderer. It does NOT expose the module matrix — the extension API is SVG-level only. Incompatible with custom halftone dot-sizing. |
| Native Canvas API | Fabric.js / Konva | Use Fabric/Konva only if building a full interactive design canvas (drag handles, layers). For a single generated output canvas, they are heavyweight overkill. |
| Zustand | React Context / Redux | Context causes full subtree re-renders on any setting change — kills real-time preview performance. Redux is unnecessary complexity for a single-page tool with no server sync. |
| Tailwind v4 + shadcn | CSS Modules | Use CSS Modules if your team strongly prefers it. Tailwind v4 + shadcn is the current default in the Next.js ecosystem and needs no additional configuration. |
| Floyd-Steinberg (inline) | `floyd-steinberg` npm package | The npm package (`noopkat/floyd-steinberg`) hasn't been updated since 2016 and returns a Buffer, not ImageData. Write inline — 50 lines, full control over error diffusion matrix weights. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `qr-code-styling` for halftone | Its API stops at SVG extensions — no matrix access | `qrcode.create()` + manual Canvas 2D renderer |
| `QRCode.toCanvas()` / `toDataURL()` | Renders pixels immediately, discards matrix; no hook for custom dot shapes | `QRCode.create()` then custom render loop |
| Server-side QR generation (API route) | Violates privacy requirement; adds latency; Vercel free-tier function limits | Client-side Canvas only |
| sharp (npm) | Node.js native binary, cannot run in browser | Canvas API `drawImage()` + `getImageData()` |
| `html5-qrcode` | QR scanner library, not a generator | `qrcode` (node-qrcode) |
| qrcode.js (davidshimjs) | Last commit 2019, archived; renders to DOM table or opaque canvas | `qrcode` (node-qrcode) |
| WebGL for QR rendering | Overkill; no benefit over Canvas 2D at QR code resolutions (≤177×177 modules) | Canvas 2D API |
| p5.js for canvas | 5MB library for functionality covered by 10 lines of Canvas 2D API calls | Native Canvas 2D |
## Stack Patterns by Variant
- Move `QRCode.create()` + pixel loop into a Web Worker via `OffscreenCanvas`
- OffscreenCanvas is baseline-supported in all modern browsers (Chrome 69+, Firefox 105+, Safari 16.4+)
- Transfer `ImageBitmap` from worker back to main thread via `postMessage`
- Do NOT do this in v1 — profile first, it's likely fast enough for interactive use at typical QR sizes
- Always default to error correction level `H` (30% recovery capacity) — required for any logo/image overlay
- Use `M` only for pure-URL QR codes with no image embedding
- Never use `L` or `Q` when images are embedded
- Implement as Canvas 2D path operations: `arc()` for circles, `roundRect()` for rounded squares, `moveTo/lineTo` for diamonds
- Each dot shape is 5–15 lines of Canvas 2D code, no library needed
## QR Matrix Access — Key API (node-qrcode)
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@15.5 | react@19, react-dom@19 | Bundled together, no separate install needed |
| qrcode@1.5.4 | Node 12+ / modern browsers | TypeScript types in `@types/qrcode@1.5.5`; types are loose (no matrix type export), use `as any` cast if needed on BitMatrix |
| zustand@5.x | React 19 | Zustand 5 dropped React 16/17 support; React 19 compat confirmed |
| tailwindcss@4.x | next@15 | No `tailwind.config.js` needed; `@tailwind` directives replaced by `@import "tailwindcss"` |
| shadcn/ui | tailwind@4, next@15 | shadcn supports Tailwind v4 as of early 2025; use `npx shadcn@latest init` |
## Sources
- `/soldair/node-qrcode` (Context7) — `create()` return structure, BitMatrix API (`get`, `set`, `isReserved`)
- `https://github.com/soldair/node-qrcode/blob/master/lib/core/bit-matrix.js` — confirmed `get(row, col)` method exists, no `dark()` method
- `https://www.nayuki.io/page/qr-code-generator-library` — confirmed `getModule(x, y)` API as alternative; TypeScript source requires manual bundling (not on npm as stable package)
- `https://github.com/kozakdenys/qr-code-styling` — confirmed v1.9.2 does NOT expose matrix; SVG-extension only
- `https://nextjs.org/blog/next-15-5` — Next.js 15.5 confirmed stable (August 2025)
- `https://react.dev/blog/2024/12/05/react-19` — React 19 stable December 2024
- `https://ui.shadcn.com/docs/tailwind-v4` — Tailwind v4 + shadcn confirmed compatible
- `https://2024.stateofreact.com/en-US/libraries/state-management/` — Zustand 41% adoption, leading state manager in React ecosystem
- `https://backdrifting.net/post/016_halftone_qr` — halftone algorithm reference (3×3 module expansion, Floyd-Steinberg for luminance mapping)
- `https://github.com/ychalier/halftone-qrcode` — JavaScript reference implementation of UCL halftone QR paper
- `https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas` — OffscreenCanvas browser support confirmed (Chrome 69+, Firefox 105+, Safari 16.4+)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
