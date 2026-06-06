# Architecture Research

**Domain:** Client-side mosaic QR code generator (browser, Canvas API)
**Researched:** 2026-06-06
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          UI Layer (React/Next.js)               │
├──────────────────┬──────────────────┬───────────────────────────┤
│  ImageUploader   │  ControlPanel    │  PreviewCanvas            │
│  (file input,    │  (dot style,     │  (live rendered output,   │
│   drag-drop,     │   colors, EC     │   download trigger)       │
│   URL source)    │   level, size)   │                           │
└────────┬─────────┴────────┬─────────┴──────────────────────────┘
         │                  │
         ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Orchestrator Hook                          │
│  useQRGenerator — debounced (300ms), coordinates pipeline,      │
│  holds output state (imageData | null), drives re-renders       │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼  (async pipeline, may run in Web Worker)
┌─────────────────────────────────────────────────────────────────┐
│                     Processing Pipeline                         │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  QR Engine   │   │ Image Pre-   │   │  Module          │    │
│  │              │   │ processor    │   │  Classifier      │    │
│  │ qrcodegen.ts │→  │              │→  │                  │    │
│  │ → boolean[][]│   │ → luma[][]   │   │ → ModuleMap      │    │
│  └──────────────┘   └──────────────┘   └────────┬─────────┘    │
│                                                  │              │
│                                                  ▼              │
│                                       ┌──────────────────┐     │
│                                       │  Halftone        │     │
│                                       │  Renderer        │     │
│                                       │                  │     │
│                                       │  → OffscreenCanvas│    │
│                                       │  → ImageBitmap   │     │
│                                       └──────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Output Layer                                       │
│  PreviewCanvas (drawImage from ImageBitmap, HiDPI-scaled)       │
│  DownloadButton (toBlob → PNG)                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| ImageUploader | Accept file/drag-drop, validate type/size, produce HTMLImageElement or ImageBitmap | React component, FileReader API |
| ControlPanel | All customization inputs: URL, EC level, dot style, colors, size | Controlled React form state |
| useQRGenerator | Debounce, coordinate pipeline stages, hold output, expose loading/error state | Custom hook with useEffect + useCallback |
| QR Engine | Encode URL to boolean QR matrix | Nayuki `qrcodegen` (TypeScript port) — zero dependencies, exposes raw matrix |
| Image Preprocessor | Scale image to QR module grid resolution, extract per-cell average luminance as float 0–1 | OffscreenCanvas + getImageData, bilinear sampling |
| Module Classifier | Walk QR matrix, tag each (x,y) as FINDER, TIMING, ALIGNMENT, FORMAT, DATA | Pure function over boolean[][] |
| Halftone Renderer | The core: draw each module as a sized dot scaled by image luminance; draw function/format modules at full size; composite to OffscreenCanvas | Canvas 2D API, arc/roundRect/custom path |
| PreviewCanvas | Display OffscreenCanvas result scaled to viewport, HiDPI aware (devicePixelRatio) | React ref + drawImage |
| DownloadButton | Convert canvas to Blob, trigger browser download | canvas.toBlob('image/png') |

## Recommended Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Root page, renders Generator
│   └── layout.tsx
├── components/
│   ├── Generator/              # Top-level generator composite
│   │   ├── index.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── ControlPanel.tsx
│   │   └── PreviewCanvas.tsx
│   └── ui/                     # Generic UI primitives (buttons, sliders)
├── lib/
│   ├── qr/
│   │   ├── encode.ts           # Wraps qrcodegen: URL → boolean[][]
│   │   ├── classify.ts         # boolean[][] → ModuleMap (type per cell)
│   │   └── types.ts            # ModuleType enum, QRMatrix type
│   ├── image/
│   │   ├── preprocess.ts       # HTMLImageElement → luma[][] at QR resolution
│   │   └── types.ts
│   └── render/
│       ├── pipeline.ts         # Orchestrates encode → classify → preprocess → render
│       ├── halftone.ts         # Core rendering algorithm
│       ├── dotShapes.ts        # circle, square, rounded, diamond path helpers
│       └── types.ts            # RenderOptions, DotStyle enum
├── hooks/
│   └── useQRGenerator.ts       # Debounced pipeline coordinator, async state
└── workers/
    └── render.worker.ts        # Optional: moves pipeline off main thread
```

### Structure Rationale

- **lib/qr/**: QR encoding and module classification are pure functions with no React dependency — isolated for testability and potential worker use
- **lib/image/**: Image preprocessing is also pure — a Canvas side-effect that produces a plain array
- **lib/render/**: The halftone algorithm is the most complex piece; isolated so it can be unit-tested against known matrices
- **workers/**: Render pipeline can be moved to a Web Worker without touching component code

## Architectural Patterns

### Pattern 1: Module Classification Before Rendering

**What:** Walk the raw boolean matrix once after QR encoding and tag every (x, y) position with its module type (FINDER, TIMING, ALIGNMENT, FORMAT_INFO, DATA). Store this as a typed map. The renderer consults this map to decide how to draw each module — function/format modules always draw at full size in their correct color; only DATA modules get halftone dot sizing applied.

**When to use:** Always. This is the fundamental insight the prior BrandQR attempt missed — treating all modules as equal candidates for image manipulation is why outputs looked "trashy." Scanners rely on exact rendering of function patterns.

**Trade-offs:** Small upfront cost (one pass over n² matrix) in exchange for complete control at render time.

```typescript
enum ModuleType {
  DATA,
  FINDER,
  SEPARATOR,
  TIMING,
  ALIGNMENT,
  FORMAT_INFO,
  VERSION_INFO,
  QUIET_ZONE,
}

type ModuleMap = ModuleType[][];

function classifyModules(matrix: boolean[][], version: number): ModuleMap {
  // Mark finder patterns at known positions, timing patterns on row/col 6,
  // alignment patterns from version-dependent lookup table,
  // format info at known reserved positions.
  // Everything else = DATA.
}
```

### Pattern 2: Luminance-Driven Dot Sizing

**What:** For each DATA module, sample the average luminance of the corresponding image region. Map luminance to dot radius: dark image areas → dots near full module size; light areas → dots near zero size. Draw the dot at that radius. The QR scanner reads the module as dark (1) if any ink falls in the center region — the center pixel or central 1/3 of the module must preserve the correct QR value, so constrain: dark modules get radius clipped to [MIN_RADIUS, MAX_RADIUS] where MIN_RADIUS is enough to register; light modules get radius 0 or very small.

**When to use:** The core halftone algorithm. This is "clean dot sizing" — the approach that works versus sub-pixel dithering or module flipping that doesn't.

**Trade-offs:** Simple to implement; quality depends entirely on MIN/MAX_RADIUS tuning. MIN too large → image washed out. MAX too small → doesn't scan in dim conditions.

```typescript
function luminanceToDotRadius(
  luma: number,          // 0 (dark) to 1 (bright)
  moduleIsDark: boolean, // QR data value
  cellSize: number,      // pixels per module
  config: DotSizeConfig
): number {
  const halfCell = cellSize / 2;
  if (moduleIsDark) {
    // Dark module: large dot in dark image areas, but min ensures it registers
    const radius = halfCell * (1 - luma * (1 - config.minDarkFraction));
    return Math.max(halfCell * config.minDarkFraction, radius);
  } else {
    // Light module: small dot (or none) — show light image texture without
    // creating false darks that fool the scanner
    return halfCell * luma * config.maxLightFraction;
  }
}
```

### Pattern 3: Two-Layer Render Composition

**What:** Render in two passes on a single OffscreenCanvas. Pass 1 draws the background image (or color) scaled to fill the QR region. Pass 2 draws dots on top. For each DATA module, dots are drawn with a fill color (dark modules use foreground color, light modules use background color or are skipped). Function/format modules are drawn as solid filled squares.

**When to use:** Whenever a background image is present. This gives image visibility without alpha compositing complexity.

**Trade-offs:** Simple blending. If you want the image to show through dot gaps rather than behind solid dot fill, skip filling light modules entirely and let the background show through.

```typescript
function renderHalftone(
  ctx: OffscreenCanvasRenderingContext2D,
  matrix: boolean[][],
  moduleMap: ModuleMap,
  lumaGrid: number[][],
  options: RenderOptions
): void {
  const { cellSize, dotStyle, colors, bgImage } = options;

  // Pass 1: background
  if (bgImage) {
    ctx.drawImage(bgImage, quietZoneOffset, quietZoneOffset, qrPx, qrPx);
  } else {
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Pass 2: modules
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      const type = moduleMap[row][col];
      const isDark = matrix[row][col];
      const luma = lumaGrid[row][col];

      if (type !== ModuleType.DATA) {
        drawSolidModule(ctx, col, row, cellSize, isDark, colors);
      } else {
        const radius = luminanceToDotRadius(luma, isDark, cellSize, options.dotSize);
        if (radius > 0.5) {
          drawDot(ctx, col, row, cellSize, radius, isDark, dotStyle, colors);
        }
      }
    }
  }
}
```

## Data Flow

### Primary Render Flow

```
[User uploads image]         [User types URL]        [User tweaks controls]
        │                          │                          │
        └──────────────────────────┴──────────────────────────┘
                                   │
                          [useQRGenerator hook]
                          [debounce 300ms]
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
            [QR Engine]                  [Image Preprocessor]
            encode(url, ecLevel)         scaleToGrid(image, qrSize)
            → boolean[][]               → luma[][]
                    │                             │
                    ▼                             │
            [Module Classifier]                   │
            classify(matrix, version)             │
            → ModuleMap                           │
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                          [Halftone Renderer]
                          renderHalftone(ctx, matrix,
                            moduleMap, lumaGrid, options)
                          → OffscreenCanvas
                                   │
                          [ImageBitmap transfer]
                                   │
                          [PreviewCanvas.drawImage]
                          → visible output
                                   │
                    (on download click)
                          [canvas.toBlob → PNG]
```

### State Management

All pipeline state lives in `useQRGenerator`. UI components are controlled (they receive state + callbacks). No global store needed — the app is single-page with no persistence.

```
useQRGenerator state:
  url: string
  image: HTMLImageElement | null
  options: RenderOptions
  output: ImageBitmap | null
  status: 'idle' | 'generating' | 'error'
  error: string | null
```

### Key Data Flows

1. **Image upload:** File → FileReader → `new Image()` → `img.onload` → stored in hook state → triggers pipeline
2. **QR matrix:** `qrcodegen.QrCode.encodeText(url, ecLevel)` → `getModule(x, y)` loop → `boolean[][]`
3. **Luminance grid:** OffscreenCanvas at module resolution → `drawImage(userImage)` → `getImageData()` → per-cell average RGB → luma formula (0.299R + 0.587G + 0.114B)
4. **Dot drawing:** For each module cell, compute center (x, y) on output canvas → `beginPath()` → shape path (arc, roundRect, or custom) → `fill()`
5. **Download:** `outputCanvas.toBlob('image/png')` → `URL.createObjectURL` → anchor click → `URL.revokeObjectURL`

## Rendering Pipeline: Critical Path Detail

This is the algorithm that determines output quality. The prior BrandQR failures came from not separating function modules from data modules, and from using dithering (binary, harsh) instead of analog dot sizing (smooth).

### Step 1 — QR Encoding

Use **nayuki/qr-code-generator** (TypeScript). It exposes a raw boolean matrix via `qr.getModule(x, y)`. No rendering, no DOM — just data.

```
Input:  url string + ErrorCorrectionLevel
Output: boolean[][], qr.size (integer), qr.version (integer)
```

Use error correction level **H** (30% recovery) when image covers significant area. Use **M** (15%) for small logos.

### Step 2 — Module Classification

Pure function. Walk the matrix, mark positions using the QR spec:

- **Finder patterns:** rows/cols 0–6 at corners (top-left, top-right, bottom-left)
- **Separators:** 1-module border around each finder
- **Timing patterns:** row 6 and col 6 between finders
- **Alignment patterns:** version-dependent positions (lookup table from spec, versions 2+)
- **Format info:** 2 reserved strips near finders
- **Version info:** 2 reserved blocks for version >= 7
- **Everything else:** DATA

```
Input:  boolean[][], version integer
Output: ModuleType[][]
```

### Step 3 — Image Preprocessing

Create a temporary OffscreenCanvas at exactly `qr.size × qr.size` pixels. Draw the user's image scaled to fill it. Call `getImageData(0, 0, qr.size, qr.size)`. For each pixel (which corresponds exactly to one QR module), compute luminance:

```
luma[row][col] = (0.299 * R + 0.587 * G + 0.114 * B) / 255
```

Result is a float grid where 0 = black, 1 = white, exactly aligned to the QR module grid.

```
Input:  HTMLImageElement, qr.size
Output: float[][] (0–1), dimensions [qr.size][qr.size]
```

### Step 4 — Halftone Render

Create the output OffscreenCanvas at `(qr.size + 2*quietZone) * cellSize` pixels.

**cellSize** is the pixels-per-module. Minimum 10px for clean dots; 20px+ for download quality.

**For each module (row, col):**

a. Compute pixel position: `px = (col + quietZone) * cellSize`, `py = (row + quietZone) * cellSize`

b. If moduleType is not DATA: draw a solid filled square at full cellSize × cellSize in the module's correct color (black for dark, white for light). This preserves finder patterns exactly.

c. If moduleType is DATA:
   - Get `luma = lumaGrid[row][col]`
   - Get `isDark = matrix[row][col]`
   - Compute dot radius using luminance mapping
   - If radius > threshold: draw dot shape centered at `(px + cellSize/2, py + cellSize/2)`

**Dot radius formula (recommended starting values):**

```
cellHalf = cellSize / 2

if isDark:
  // range: [minDark * cellHalf, cellHalf]
  // dark pixels → big dot; light pixels → smaller dot but never disappears
  radius = cellHalf * lerp(minDark=0.35, 1.0, 1 - luma)

if not isDark:
  // light modules: only draw a dot if image is dark there
  // keeps the background showing through in light image areas
  radius = cellHalf * lerp(0, maxLight=0.3, 1 - luma)
  if radius < 1px: skip (don't draw)
```

**Dot shapes (dotShapes.ts):** Each shape gets `(ctx, cx, cy, radius)` and adds to the current path:
- `circle`: `ctx.arc(cx, cy, radius, 0, Math.PI * 2)`
- `square`: `ctx.rect(cx - radius, cy - radius, radius*2, radius*2)`
- `rounded`: `ctx.roundRect(cx - radius, cy - radius, radius*2, radius*2, radius * 0.4)`
- `diamond`: four-point polygon path

Batch all same-color dots: `ctx.beginPath()` → accumulate all dark module paths → `ctx.fillStyle = darkColor; ctx.fill()`. Then repeat for light. This batching is the key performance optimization.

### Step 5 — Output Transfer

`createImageBitmap(offscreenCanvas)` → transfer to React state → `drawImage` on the visible canvas ref.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Static Vercel deployment, all client-side — server bears zero load |
| 1k–100k users | Still zero server cost. Bundle size becomes concern: lazy-load QR lib and image processing behind dynamic import |
| 100k+ users | Consider CDN caching of the Next.js bundle. Still no server-side image processing needed |

### Scaling Priorities

1. **First bottleneck:** Bundle size. QR lib + canvas processing adds ~50–100KB. Use `next/dynamic` with `ssr: false`.
2. **Second bottleneck:** Main thread blocking on large output sizes. Move pipeline to Web Worker (wrap in `workers/render.worker.ts`, use `Comlink` for type-safe messaging).

## Anti-Patterns

### Anti-Pattern 1: Treating All Modules Equally

**What people do:** Apply the halftone luminance mapping to every module in the matrix, including finder patterns, timing, and alignment.

**Why it's wrong:** Finder patterns must be exact solid squares for scanners to locate and orient the code. Scaling them down by luminance makes them ambiguous. This was the core failure in BrandQR's outputs — "hard to scan, logos not recognizable."

**Do this instead:** Classify modules first. Only apply halftone logic to DATA modules. Render function patterns as solid filled squares at full size, no exceptions.

### Anti-Pattern 2: Binary Dithering Instead of Analog Dot Sizing

**What people do:** Convert the image to a pure black-and-white dithered bitmap, then use those pixel values to flip module colors (dark ↔ light).

**Why it's wrong:** Module flipping is destructive — it changes the actual QR data bits. Error correction can absorb some damage but not if you flip large contiguous regions. The result is either unscannable or has severe image artifacts.

**Do this instead:** Never change the color (dark/light) of any module. Only change the size of the dot drawn for that module. The QR data remains intact; only the visual weight changes.

### Anti-Pattern 3: Blocking the Main Thread

**What people do:** Run QR encoding + image preprocessing + canvas rendering synchronously in a React event handler or useEffect.

**Why it's wrong:** At high output resolutions (e.g., 2000×2000px download quality), this blocks the UI for 2–3 seconds, freezes animations, and makes the real-time preview feel broken.

**Do this instead:** Debounce inputs (300ms). For preview quality, generation is fast enough on main thread. For download-quality renders, use a Web Worker via `OffscreenCanvas`. Transfer the result back as an `ImageBitmap`.

### Anti-Pattern 4: Pixel-Level Loop Without Batching

**What people do:** For each module, call `beginPath → fill` individually — thousands of Canvas API round-trips.

**Why it's wrong:** Canvas fill calls are expensive. 1000 separate fill calls is orders of magnitude slower than one batched path.

**Do this instead:** Accumulate all dark-module paths in one `beginPath()`, then one `fill()`. Repeat for light modules. Two fill calls regardless of QR version.

### Anti-Pattern 5: Scaling the Image at Render Time Per Module

**What people do:** For each module, draw the full source image clipped to that module's region to sample its color.

**Why it's wrong:** Drawing the full image N² times (once per module) is catastrophically slow.

**Do this instead:** Pre-scale the image to a `qr.size × qr.size` thumbnail using OffscreenCanvas once. Then `getImageData()` gives you all pixel values in a flat array. Module lookups become array index operations.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Vercel | Static export or Next.js Edge runtime — no server compute needed | `output: 'export'` in next.config.ts is viable |
| None | No external APIs — fully offline-capable after page load | Service worker optional for PWA caching |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ Pipeline | useQRGenerator hook (React state + callbacks) | UI never calls lib functions directly |
| lib/qr ↔ lib/render | Plain typed objects: boolean[][], ModuleMap | No coupling, pipeline.ts wires them |
| Main thread ↔ Worker | Structured clone (ImageBitmap transfer) via Comlink | Fallback to main thread if workers unavailable |
| lib/image ↔ lib/render | float[][] (lumaGrid) | One-way: preprocess produces, renderer consumes |

## Suggested Build Order

Dependencies must be respected. Build in this order:

1. **QR Engine** (`lib/qr/encode.ts`) — pure function, no dependencies, testable immediately
2. **Module Classifier** (`lib/qr/classify.ts`) — depends only on QR matrix output from step 1
3. **Dot Shapes** (`lib/render/dotShapes.ts`) — pure Canvas path helpers, no dependencies
4. **Image Preprocessor** (`lib/image/preprocess.ts`) — depends on OffscreenCanvas (browser API only)
5. **Halftone Renderer** (`lib/render/halftone.ts`) — depends on steps 2, 3, 4
6. **Pipeline orchestrator** (`lib/render/pipeline.ts`) — wires steps 1–5
7. **useQRGenerator hook** — wraps pipeline with React lifecycle, debounce, state
8. **PreviewCanvas component** — depends on hook output
9. **ControlPanel + ImageUploader** — pure UI, depends on hook interface
10. **Download flow** — depends on canvas ref from PreviewCanvas
11. **Web Worker migration** (optional) — refactor pipeline.ts to run in worker, same interface

## Sources

- Nayuki QR Code generator TypeScript API: https://github.com/nayuki/QR-Code-generator
- Halftone QR Codes (SIGGRAPH Asia 2013 paper overview): http://vecg.cs.ucl.ac.uk/Projects/SmartGeometry/halftone_QR/halftoneQR_sigga13.html
- Halftone QR implementation walkthrough: https://backdrifting.net/post/016_halftone_qr
- Artistic QR code technical overview (Hovercode): https://hovercode.com/blog/artistic-qr-codes/
- QR module placement spec: https://www.thonky.com/qr-code-tutorial/module-placement-matrix
- Canvas performance optimization (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- Luminance formula: https://www.w3.org/WAI/GL/wiki/Relative_luminance
- Next.js QR generator performance patterns: https://medium.com/@javajia/building-a-professional-qr-code-generator-with-next-js-21b66bec67dc

---
*Architecture research for: client-side mosaic QR code generator*
*Researched: 2026-06-06*
