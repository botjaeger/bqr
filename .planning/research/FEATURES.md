# Feature Research

**Domain:** Mosaic / artistic QR code generator (halftone image-embedding technique)
**Researched:** 2026-06-06
**Confidence:** HIGH (MosaicQR UI confirmed via site; halftone algorithm confirmed via academic sources + open-source implementations; competitor features confirmed via direct site analysis)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any QR code generator. Missing them = product feels broken or incomplete before they even evaluate the artistic output.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| URL input as QR content | Core purpose — encode a destination | LOW | Validate URL format client-side; malformed URLs produce scannable-but-broken codes |
| Image upload (logo/favicon) | MosaicQR's core mechanic — no upload = no mosaic | LOW | PNG/JPG/WEBP; max ~2MB practical limit; must handle transparent PNGs |
| Real-time preview | Every competing tool offers instant feedback; absent = product feels sluggish and unfinished | MEDIUM | Canvas re-render on every param change; debounce heavy params (≥300ms) |
| Download as PNG | The output artifact — users came to get a file | LOW | Canvas `toDataURL()` or `toBlob()`; should offer 2x/4x scale options for print |
| Error correction level selection | Power users know H-level is needed for logo overlay; experts will notice if absent | LOW | Default to H (30% recovery); expose L/M/Q/H or just "Standard / High" |
| Scannable output | Non-negotiable — a QR that fails to scan is 100% broken | HIGH | This is the core algorithm challenge: halftone dot sizing must preserve center-pixel constraint |
| Finder pattern (eye) preservation | Scanners locate codes via the three corner markers; obscuring them = broken | MEDIUM | Must never render image data over the three 7x7 finder squares + separators |
| Quiet zone / white border | ISO 18004 requires ≥4 modules of margin; scanners fail without it | LOW | Enforce minimum; let user add extra padding |
| Mobile-responsive UI | Users scan QR codes on phones; they'll generate on phones too | LOW | Next.js + Tailwind handles this; layout priority: upload → preview → download |

### Differentiators (Competitive Advantage)

Features that separate BQR from plain QR generators or low-quality mosaic attempts. These are where quality wins.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| High-quality halftone image embedding | The core thesis: image is *recognizable* within the QR dot pattern, not just overlaid in center | HIGH | Critical algorithm: each QR module → dot whose size is proportional to image brightness at that cell; center pixel of each dot cluster preserves required QR bit value; see algorithm notes below |
| Multiple dot styles | Circles, squares, rounded squares, diamonds — visual variety without sacrificing scannability | MEDIUM | qr-code-styling documents 6 styles (square, dots, rounded, classy, classy-rounded, extra-rounded); each style interacts differently with the halftone sizing algorithm |
| Eye / corner pattern style customization | Finder patterns are the most visually distinctive part; custom eye shapes (rounded, dot, extra-rounded) dramatically change the aesthetic | MEDIUM | Risk: aggressive shape changes break scanning; subtle rounding is safe; must test across devices |
| Color themes and custom palettes | Brand-aligned QR codes; dark dots on light background is default but users want brand colors | MEDIUM | Gradient warning: if gradient transitions too light, modules lose contrast; enforce ≥3:1 contrast ratio or show warning |
| Linear and radial gradient fills | Adds polish; popular in high-end QR designs | MEDIUM | Apply to dot color only (not reducing module contrast); background gradient is safer |
| Background customization (solid color, gradient, custom image) | Enables full branded output — not just dots but the whole card | MEDIUM | Background image must be low-contrast so dot pattern stays readable; recommend desaturation/darken layer |
| Adjustable image influence strength | Controls how aggressively the source image modulates dot sizes vs. uniform dot size | HIGH | Slider: 0% = standard uniform QR; 100% = maximum image visibility; intermediate = tunable quality/scan tradeoff |
| Client-side privacy (no server upload) | Images never leave the browser — meaningful differentiator for logos/brand assets | LOW | Architecture decision already made; surface this to users explicitly ("Your image never leaves your device") |
| Instant generation speed | Canvas API in-browser — no round-trip latency | LOW | Side-effect of client-side architecture; frame it as a feature |
| High-resolution export (2x, 4x) | Print use cases: business cards, banners need 300+ DPI equivalent | LOW | Canvas scale multiplier before `toDataURL()`; 4x on a 400px preview = 1600px output |
| Showcase / example gallery | MosaicQR uses a showcase to demonstrate quality before users commit; reduces bounce | LOW | Static examples embedded in page; 6-8 examples across different image types (face, logo, icon, text) |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| AI-generated QR art (Stable Diffusion / ControlNet) | Trendy; produces spectacular results in demos | Requires server-side GPU inference, completely different tech stack, slow, expensive, often produces unscannable codes, destroys client-side privacy | Halftone algorithm: deterministic, instant, always scannable if implemented correctly |
| Dynamic QR codes (editable destination after print) | Convenient for print campaigns | Requires server-side redirect infrastructure, user accounts, ongoing hosting cost; contradicts stateless/no-backend constraint | Static QR with clear UX: "re-generate if URL changes" |
| User accounts / saved designs | "Save my work" feels useful | Adds backend, auth, database, storage costs; destroys the simplicity that makes free tools attractive | Browser localStorage for "last used settings"; no server-side persistence |
| SVG export (v1) | Technically superior for print | Canvas-to-SVG for halftone dot grids requires significant additional complexity (each dot = SVG circle element); not needed for PNG-first MVP | Defer to v2; PNG at 4x scale is sufficient for most print at typical QR code sizes |
| Batch generation | Power users want to process multiple URLs | Adds UI complexity, memory pressure, download management; distraction from quality of single output | One-at-a-time; fast enough that sequential generation is acceptable |
| QR code type variety (WiFi, vCard, SMS, etc.) | Feature parity with enterprise generators | Dilutes focus; encoding type doesn't change the visual algorithm; can be added as input mode later | URL-only v1; the halftone algorithm works the same regardless of content |
| Analytics / scan tracking | Useful for marketing | Requires server infrastructure; contradicts stateless, free, no-backend constraints | Out of scope; competitors charge for this; it's not the value prop here |
| White-on-dark (inverted) QR codes | Users want "dark mode" QR codes | Many older scanners cannot read inverted QR codes reliably — known compatibility failure mode; tempting but breaks the product's core promise | Dark-dots-on-light-background only; optionally allow dark background if dots stay dark relative to background via sufficient contrast |
| Logo-center overlay (separate from halftone) | Simple implementation; common in basic generators | Defeats the mosaic concept; produces a plain QR with a logo stamp, not an image-embedded mosaic | Halftone embedding makes the entire image present, not just a center logo; much higher quality output |

---

## The Core Algorithm: What Makes MosaicQR Work

This section captures the key technical understanding that separates quality halftone QR from prior failed approaches (BrandQR).

**What MosaicQR does (inferred from visual output + academic sources):**

MosaicQR uses **dot-size-proportional halftone embedding**, not module flipping or center overlay:
1. Generate the QR code matrix at the required version/size
2. Convert the source image to grayscale, resize to match QR module grid
3. For each QR module: compute the image brightness at that position
4. Render each module as a circle (or square) whose **size is proportional to image brightness** — bright image areas = small dots, dark image areas = large dots
5. Critical constraint: the center pixel of each dot cluster must preserve the required QR bit value (dark/light). This ensures scanners read the correct value even with size variation
6. Never modify or cover finder patterns (three corner squares), format info strips, or timing patterns
7. The QR standard's error correction absorbs the distortion introduced by dot sizing variation

**What the prior BrandQR attempts did wrong:**
- Sub-module dithering: placed image pixels at sub-module level, confusing scanners about module boundaries
- Module flipping: changed dark→light or light→dark based on image, destroying encoded data
- Codeword-aware manipulation: complex optimization that still couldn't match visual clarity because it treated modules as binary rather than using continuous dot sizing

**Key quality parameters (expose to user):**
- `imageInfluence` (0–100%): how strongly image brightness modulates dot size vs. uniform size
- `dotStyle`: circle (most natural halftone look), square, rounded, etc.
- `errorCorrection`: always H for halftone (needs the 30% redundancy budget)
- `eyeStyle`: customizable separately from body dots (safer for scannability)

---

## Feature Dependencies

```
Image Upload
    └──requires──> Canvas rendering engine
                       └──requires──> QR matrix generation (qr-code-styling or qrcode npm)

Halftone embedding
    └──requires──> QR matrix generation (bit values per module)
    └──requires──> Image preprocessing (grayscale, resize to module grid)

Real-time preview
    └──requires──> Canvas rendering engine
    └──requires──> Debounced re-render on param change

High-resolution export
    └──requires──> Canvas rendering engine (scale multiplier)

Dot style customization
    └──enhances──> Halftone embedding (style applied to variable-size dots)

Eye/corner style customization
    └──enhances──> Halftone embedding (eyes rendered separately from body dots)

Color themes / gradients
    └──enhances──> Canvas rendering engine
    └──conflicts──> Readability (low-contrast gradients must be warned against)

Background customization
    └──enhances──> Canvas rendering engine
    └──conflicts──> Halftone embedding (busy backgrounds compete with dot pattern)
```

### Dependency Notes

- **Halftone embedding requires QR matrix generation first:** The module-by-module brightness mapping only works if you have the QR bit matrix before rendering — you need `qrcode` npm or equivalent to expose the raw matrix, not just render a finished image.
- **Eye/corner customization should be implemented as a separate render pass from body dots:** Finder patterns have independent style rules and must never participate in brightness-modulated sizing.
- **Gradient fills conflict with scannability:** A gradient from dark to light means modules at the light end may fall below contrast threshold. Either enforce minimum contrast or show a real-time scannability warning.
- **Background images conflict with halftone embedding:** A busy background competes visually with the dot pattern. Desaturate / darken background images before compositing, or recommend solid/minimal backgrounds.

---

## MVP Definition

### Launch With (v1)

Minimum to validate core value proposition: can this algorithm produce MosaicQR-quality output?

- [ ] URL input → QR matrix generation — the encoded payload
- [ ] Image upload (PNG/JPG, client-side) — the mosaic source
- [ ] Halftone embedding algorithm — the core differentiator (this IS the product)
- [ ] Real-time Canvas preview — interactive feedback loop
- [ ] Error correction locked to H — correct default for the algorithm
- [ ] Download PNG at 2x and 4x — useful output
- [ ] Quiet zone enforcement — non-negotiable for scanners
- [ ] Finder pattern preservation — non-negotiable for scanners
- [ ] Dot style selector (circles + squares minimum) — immediate visual variety
- [ ] Foreground color picker — basic branding
- [ ] Background color picker — basic branding

### Add After Validation (v1.x)

Add once core algorithm quality is confirmed scannable and visually clean.

- [ ] Eye / corner pattern style customization — high visual impact, low scannability risk if done carefully
- [ ] Gradient fills on dots — popular aesthetic, test contrast enforcement
- [ ] Background customization (gradient, custom image) — full branded card output
- [ ] Image influence strength slider — power user control over quality tradeoff
- [ ] More dot styles (rounded, classy, diamond) — visual variety
- [ ] Showcase / example gallery — reduces bounce, demonstrates quality before upload
- [ ] Color theme presets — fast path to good-looking output

### Future Consideration (v2+)

- [ ] SVG export — significant complexity for dot-per-module vector output; PNG 4x is sufficient for v1
- [ ] QR content type variety (WiFi, vCard) — encoding doesn't change the visual algorithm; add when URL-only is validated
- [ ] Browser localStorage for last-used settings — quality-of-life, not essential
- [ ] Animated output (GIF/APNG) — research shows it's possible with halftone technique; extremely complex

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Halftone embedding algorithm | HIGH | HIGH | P1 — this is the product |
| URL input + QR generation | HIGH | LOW | P1 |
| Image upload (client-side) | HIGH | LOW | P1 |
| Real-time Canvas preview | HIGH | MEDIUM | P1 |
| PNG download (2x/4x) | HIGH | LOW | P1 |
| Finder pattern / quiet zone enforcement | HIGH | MEDIUM | P1 — safety |
| Dot style selector | MEDIUM | MEDIUM | P1 — immediate visible variety |
| Foreground / background color | MEDIUM | LOW | P1 |
| Eye / corner style | MEDIUM | MEDIUM | P2 |
| Gradient fills | MEDIUM | MEDIUM | P2 |
| Image influence strength slider | HIGH | MEDIUM | P2 — power user control |
| Color theme presets | LOW | LOW | P2 |
| Background image customization | MEDIUM | HIGH | P2 |
| Showcase gallery | MEDIUM | LOW | P2 — marketing |
| SVG export | LOW | HIGH | P3 |
| Dynamic QR | LOW | HIGH | P3 — out of scope |
| AI art mode | LOW | HIGH | P3 — wrong tool for this job |

**Priority key:** P1 = launch blocker, P2 = add when P1 is solid, P3 = future/never

---

## Competitor Feature Analysis

| Feature | MosaicQR.com | QRCode Monkey | Halftone-QR (open source) | BQR (target) |
|---------|--------------|---------------|---------------------------|--------------|
| Halftone image embedding (full grid) | YES — patent-pending | NO — center logo only | YES — academic prototype | YES — primary differentiator |
| Dot style variety | Unknown (appears circles) | YES — 6+ shapes | NO | YES — 4+ styles |
| Eye/corner customization | Unknown | YES | NO | YES |
| Real-time preview | YES | YES | NO (generate button) | YES |
| Gradient fills | Unknown | YES | NO | YES |
| Background customization | YES (described) | YES | NO | YES |
| Client-side / no upload | Unknown | NO (server-side) | YES | YES — privacy feature |
| Error correction selector | Unknown | YES | YES | YES (default H, expose selector) |
| PNG download | YES | YES | YES | YES |
| SVG/PDF export | Unknown | YES | NO | NO (v1) |
| Free tier | YES (limited) | YES | YES | YES (fully free) |
| Account required | NO | NO | NO | NO |
| Image influence control | YES (implied) | NO | YES (quality slider) | YES |
| Color picker | YES | YES | NO | YES |
| Showcase gallery | YES | NO | NO | YES (v1.x) |

---

## Algorithm-Specific Feature Notes

**Why the prior BrandQR attempts failed** (from PROJECT.md context):

The three failed approaches all made the same category error: they treated QR modules as binary (on/off) and tried to manipulate which modules to flip rather than using continuous dot sizing that keeps all modules structurally correct.

**The correct approach for MosaicQR-quality output:**

1. Generate QR at highest error correction (H) to maximize damage budget
2. Expose the raw module matrix (not a rendered image)
3. Resize input image to exactly NxN (where N = QR module count)
4. Convert to grayscale
5. For each module (i, j): `dotRadius = baseRadius * (1 - brightness[i][j] * imageInfluence)`
   - Dark image pixel → large dot (close to full module size)
   - Bright image pixel → small dot (minimal presence)
   - This creates the halftone visual
6. All dots are rendered in the correct QR color (dark/light) — never flip module values
7. Finder patterns, format info, timing patterns: render at full, uniform size, no image influence
8. This preserves the QR's encodable data while creating the visual halftone effect through sizing alone

**Scannability guarantee:** Because module values are never flipped (only sizes vary), QR readers get the correct dark/light signal from even a small center area of each dot. Error correction handles edge cases where very small dots are ambiguous.

---

## Sources

- [MosaicQR.com](https://mosaicqr.com) — primary benchmark (live site)
- [MosaicQR Showcase](https://mosaicqr.com/showcase) — visual quality reference
- [Halftone QR Codes — Backdrifting](https://backdrifting.net/post/016_halftone_qr) — algorithm walkthrough (HIGH confidence)
- [Halftone QR Codes ACM paper](https://dl.acm.org/doi/10.1145/2508363.2508408) — academic source for core technique
- [NTHU Halftone QR research](https://cgv.cs.nthu.edu.tw/projects/Recreational_Graphics/Halftone_QRCodes) — pattern readability learning approach
- [GitHub: gentlecat/halftone-qr](https://github.com/gentlecat/halftone-qr) — open source implementation
- [GitHub: fangj/Halftone-QRCode-Generator](https://github.com/fangj/Halftone-QRCode-Generator) — Lachlan Arthur's implementation
- [Nythrox halftone QR demo](https://nythrox.github.io/halftone-qrcode/) — browser-based prototype with exposed params
- [GitHub: kozakdenys/qr-code-styling](https://github.com/kozakdenys/qr-code-styling) — dot/eye style reference for standard generator features
- [QRCode Monkey](https://www.qrcode-monkey.com/) — competitor feature baseline
- [Hovercode artistic QR codes](https://hovercode.com/blog/artistic-qr-codes/) — technique overview
- [QR code design best practices 2026](https://www.qr-insights.com/blog/2026-03-03-qr-code-design-best-practices) — scannability constraints
- [QR code error correction levels](https://qrmake.org/qr-code-error-correction/) — error correction limits (30% max for H level)
- [Scannable artistic QR codes](https://qrcodekit.com/guides/scannable-artistic-qr-code/) — artistic customization constraints

---
*Feature research for: Mosaic / artistic QR code generator*
*Researched: 2026-06-06*
