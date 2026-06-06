# Pitfalls Research

**Domain:** Mosaic QR code generator (halftone image embedding)
**Researched:** 2026-06-06
**Confidence:** HIGH (QR spec) / MEDIUM (algorithmic trade-offs) / HIGH (prior failure analysis)

---

## Critical Pitfalls

### Pitfall 1: Module Flipping / Codeword-Aware Manipulation

**What goes wrong:**
Attempting to encode an image by selectively flipping QR modules to match image brightness — or using codeword-aware analysis to choose which data modules can be flipped — produces outputs that look "trashy." Modules are binary (on/off); you cannot encode continuous image tones through them. The result reads as noise rather than a recognizable image. This is exactly what BrandQR's v1 (sub-module dithering) and v3 (codeword-aware flipping with adaptive profiling) attempts did.

**Why it happens:**
The intuitively appealing idea is "each module is a pixel — change the pixel to match the image." But a QR scanner reads modules at their grid position using a binary threshold. Any module that's flipped from its required value is "damage." Error correction repairs some damage but cannot repair systematic damage spread across an image-shaped region. Modules still look like random QR noise even when they happen to match image luminance, because there's no spatial coherence or dot-size gradient to convey the image.

**How to avoid:**
Use pure halftone dot-sizing: render each module as a filled circle (or shape) whose radius scales linearly with the image's grayscale brightness at that module's position. Dark image region = large dot filling most of the module cell. Light image region = small dot. The QR data remains encoded in the dot-center being present/absent — scanners threshold the dot and read it correctly. Never flip a module's required value; only vary its rendered size.

**Warning signs:**
- Output looks like random pepper noise with occasional image hints
- Logo is recognizable only when squinting or at distance
- Scanner struggles, especially in lower light
- Multiple "adaptive profiles" are needed just to control how noisy it looks

**Phase to address:** Core algorithm phase (Phase 1 / foundation). This is the foundational decision. Getting it wrong means a complete rewrite.

---

### Pitfall 2: Corrupting Finder Patterns, Timing Patterns, or Alignment Patterns

**What goes wrong:**
Applying the image overlay to the entire QR grid including structural zones causes scan failures that no amount of error correction can fix. Finder patterns (three corner squares with 7:1:3:1:7 ratio), timing patterns (alternating row/column), and alignment patterns are how the scanner locates, orients, and calibrates the code. If their geometry is distorted, scanners cannot even begin decoding.

**Why it happens:**
It's tempting to run the image overlay uniformly across all modules for visual consistency. These functional zones are not intuitively obvious — developers applying halftone uniformly corrupt them.

**How to avoid:**
Build a "protected zone" mask before any rendering. The mask must cover:
- Three 9x9 finder pattern regions (including their separators) at corners TL, TR, BL
- Timing patterns: row 6 and column 6 (0-indexed) spanning between finder patterns
- Alignment patterns (position depends on QR version — consult ISO 18004 Table E.1)
- Format information modules
- Version information modules (version 7+)

Protected zones render at full standard size (solid black or white), never scaled by image brightness. Only data modules get the halftone dot-sizing treatment.

**Warning signs:**
- Code scans only occasionally even at high error correction
- Some scanner apps handle it, others fail completely
- Finder pattern squares look "textured" or partially transparent in output

**Phase to address:** Phase 1 (QR grid rendering). Must be baked in from day one; retrofitting this mask is painful.

---

### Pitfall 3: Sub-pixel Dithering / Noisy Grid Approach

**What goes wrong:**
Dividing each module into a 3x3 sub-pixel grid and filling those sub-pixels with image-derived values produces an output that is too noisy. Eight of the nine sub-pixels carry image data; the center pixel enforces the module's required QR value. The problem: this approach optimizes for embedding image data, not for producing a clean, recognizable halftone. The output looks like a dithered black-and-white photo that happens to be a QR code — not like an image visible through clean dot patterns.

**Why it happens:**
The academic halftone QR code (SIGGRAPH 2013, Chu et al.) uses exactly this 3x3 approach. It's well-documented and seems like the reference implementation. But it optimizes for "image embedded in QR code" at sub-module resolution. The BrandQR v1 attempt confirmed this produces noisy, hard-to-recognize logos when viewed as a mosaic.

**How to avoid:**
Use per-module dot-sizing instead. Each module is rendered as a single shape (circle, square, rounded square) whose size scales with the image brightness. This produces clean, uniform, recognizable halftone aesthetics — matching what MosaicQR.com outputs. The visual coherence comes from smooth dot-size gradients, not sub-pixel patterns. Simpler algorithm, cleaner result.

**Warning signs:**
- Output at 100% zoom looks like a dense noise field
- Logo only becomes apparent when the image is viewed small/from a distance (classic halftone dithering artifact)
- Individual module cells have complex internal patterns rather than clean uniform shapes

**Phase to address:** Phase 1 (algorithm selection). Choose dot-sizing explicitly; document the rationale to prevent future "improvement" attempts that re-introduce sub-pixel approaches.

---

### Pitfall 4: Quiet Zone Omission or Undersizing

**What goes wrong:**
The QR code renders right to the edge of the canvas, or the quiet zone is less than 4 modules wide. Scanners fail to find code boundaries; they may detect part of surrounding UI elements as part of the code.

**Why it happens:**
Quiet zones are invisible — they're just whitespace. Developers fill canvas efficiently, cropping margins. The 4-module minimum (ISO/IEC 18004 Section 6.3.6) feels arbitrary and wasteful at small preview sizes.

**How to avoid:**
Always add at minimum 4 module-widths of padding on all four sides. At export time, render to a larger canvas with explicit quiet zone. Consider 6 modules for robustness. This is cheap to implement and must be a hard constraint in the layout calculation, not an afterthought.

**Warning signs:**
- QR scans fine in the generator preview but fails when screenshot and scanned
- Scans fail when code is placed against any background other than white
- Some scanners work, others don't (scanner variance on quiet zone enforcement)

**Phase to address:** Phase 1 (canvas layout). One line of math; zero excuse to skip it.

---

### Pitfall 5: Inverted Color Scheme (Light Modules on Dark Background)

**What goes wrong:**
Using a dark background with light-colored dots looks premium and modern but breaks scanning on a significant portion of devices. ISO/IEC 18004 defines the reference decoding model as dark modules on light background. Many scanners (including some native iOS/Android camera apps) do not support inversion.

**Why it happens:**
Dark background QR codes look striking. Custom color themes naturally push toward dark palettes. Developers test on one device and their scanner handles inversion — assuming all do.

**How to avoid:**
Either enforce dark-on-light as the only output (simplest), or: if supporting dark-background variants, require users to acknowledge reduced scannability, test against at least 5 different scanners (iOS Camera, Android Camera, ZXing, QR & Barcode Scanner, Snapchat), and display a warning if inverted mode is selected. The safer alternative: keep modules dark, allow background to be a light tint rather than true dark.

**Warning signs:**
- Code scans on iPhone but not Android (or vice versa)
- Code scans in dedicated QR app but not native camera
- User reports: "works on my phone, not my colleague's"

**Phase to address:** Phase 1 (color system design). Establish color constraints before building the color picker UI.

---

### Pitfall 6: Error Correction Level Not Matched to Visual Damage Budget

**What goes wrong:**
Using Error Correction Level M or L while applying halftone dot-sizing across the entire data region causes scan failures because the visual treatment counts as damage to the QR decoder. Alternatively, using Level H always causes unnecessarily large, denser codes that are harder to render cleanly at small sizes.

**Why it happens:**
ECL is treated as a binary choice — "use H for logos, use M otherwise." But halftone dot-sizing is not a logo; it's a systematic visual treatment of all data modules. The effective "damage" depends on how aggressively dot sizes deviate from full/empty. Very small dots in bright regions may threshold as "empty" when the module should be "dark."

**How to avoid:**
- Use Error Correction Level H by default for all mosaic QR codes (30% recovery budget)
- But the real protection is ensuring dot-size thresholds are calibrated correctly: a dark module rendered as a dot must always be large enough (minimum radius = 40% of cell size) that scanners reliably threshold it as dark. A light module's dot must be small enough (maximum radius = 25% of cell size) to threshold as light.
- Test scan success rate at each dot-size extreme; calibrate minimum/maximum dot radius before shipping any customization options

**Warning signs:**
- Code scans perfectly in ideal conditions but fails in reduced lighting
- Scannability degrades as image contrast increases (image has more extreme bright/dark regions)
- Adding more image "detail" makes scanning worse

**Phase to address:** Phase 1 (algorithm calibration). Must be validated with scan tests before adding any UI.

---

### Pitfall 7: Canvas Anti-Aliasing and Sub-Pixel Rendering Artifacts

**What goes wrong:**
Canvas 2D context renders circle/shape edges with anti-aliasing by default. For QR modules, anti-aliased dot edges create gray fringe pixels around each dot. These gray pixels can land on the wrong side of a scanner's threshold, effectively shrinking or expanding the perceived dot size. At small module sizes, this degrades scannability.

**Why it happens:**
Canvas arc/fill operations are designed for visual output, not binary-thresholded machine reading. Anti-aliasing is a feature for screens; it's a bug for QR code generation. This problem worsens on high-DPI displays where `window.devicePixelRatio` is 2 or 3, and developers fail to account for the physical pixel grid.

**How to avoid:**
- Render QR code to an offscreen canvas at 4x–8x final display size, then downscale with drawImage for display
- For PNG export: render at print resolution (minimum 4 pixels per module, typically 10–20px per module)
- Never use floating-point module sizes; compute `Math.floor(cellSize)` and position with integer coordinates
- Account for `devicePixelRatio`: `canvas.width = cssWidth * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio)`
- Test: download the PNG and scan it directly — blurry output module edges will cause failures at real print sizes

**Warning signs:**
- Code scans fine on screen but exported PNG fails
- Code scans fine on laptop screen but fails on phone (higher DPI)
- Thin "halo" rings visible around dots under magnification

**Phase to address:** Phase 1 (canvas rendering). Must be part of initial rendering architecture.

---

### Pitfall 8: Image Preprocessing Skipped — Logo Resolution Too Low for Module Grid

**What goes wrong:**
The user's uploaded image is resized naively to match the QR module grid (e.g., 25x25 pixels for a Version 3 QR). Fine image details collapse into flat gray blobs. The resulting halftone produces uniform dot sizes with no recognizable structure — the "muddy logo" failure from BrandQR's halftone approach.

**Why it happens:**
Image-to-module mapping requires the image to contain recognizable visual structure at very low resolution. A complex logo with fine lines, thin text, or subtle gradients does not survive downscaling to 25x25. The correct preprocessing must be chosen to preserve the most important image features at the target resolution.

**How to avoid:**
- Preprocess the image with high-quality downscaling (use Lanczos or bicubic — not bilinear/nearest neighbor)
- Apply a gentle sharpening pass after downscaling to recover edge contrast at module resolution
- Recommend users choose simple, high-contrast logos (2–3 colors, no fine text, no gradients)
- Preview the downscaled image at module resolution before applying halftone, so users can see what the algorithm "sees"
- Avoid photographs as source images; geometric logos and icons work best

**Warning signs:**
- Halftone output looks like a gradient field with no shapes
- Dot-size variation is smooth everywhere without clear structure
- Increasing QR version (more modules) doesn't improve logo recognizability

**Phase to address:** Phase 2 (image upload and preprocessing). Show users a preview of their image at module resolution before generation.

---

### Pitfall 9: Over-Engineering the Algorithm — Six Adaptive Profiles, Render-Time Modulation

**What goes wrong:**
Adding sophisticated adaptive systems (multiple rendering profiles selected per-region, render-time modulation based on local contrast, morphological cleanup passes) increases code complexity without improving output quality. BrandQR's v3 attempt built this exact system and still couldn't match MosaicQR's clean output. Over-engineering obscures what's actually wrong with the fundamental approach.

**Why it happens:**
When simple approaches produce poor output, the instinct is to add complexity to fix edge cases. Each complexity layer feels like progress. The real problem is usually the fundamental algorithm choice, not tuning.

**How to avoid:**
- Prove the basic dot-sizing algorithm produces acceptable output before adding ANY adaptive features
- The baseline test: grayscale photo → halftone QR → scans reliably → logo recognizable. If this fails, fix the algorithm; don't add profiles.
- Ship simplest possible version; add complexity only when a clear scan-test regression or user feedback demands it
- Reference implementation: kloet.net/usr/halftone uses a single pass with configurable dithering — no adaptive profiles

**Warning signs:**
- "Adaptive profile" count exceeds 2
- Algorithm has more than one feedback loop
- Code has morphological operations (erode, dilate, open, close) on module output

**Phase to address:** Every phase. This is a mindset pitfall that can emerge at any stage.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip protected-zone mask initially | Faster first demo | Corrupted finder/timing patterns require major refactor | Never |
| Use same canvas for preview and export | Less code | Preview is screen-resolution; export PNG fails scanning at print size | Never |
| Hard-code ECL to H everywhere | No ECL UI needed | Larger codes, harder to render cleanly at small sizes | MVP only |
| Skip devicePixelRatio accounting | Works on 1x displays | Blurry output on all retina/HiDPI devices | Never — add from day one |
| Use qrcode npm package default renderer | Fast start | No control over module positions for halftone overlay | Never — need raw module matrix |
| Nearest-neighbor downscale for image prep | Fastest | Muddy logos, flat gradients at module resolution | Never |
| Apply halftone uniformly to all modules | Simpler code | Corrupts structural zones, inconsistent scan results | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| QR generation library (qrcode, qrcodegen) | Using the library's built-in renderer (canvas/SVG draw call) | Extract raw module matrix only; write custom canvas renderer for halftone dots |
| Canvas 2D context | Drawing at CSS pixel dimensions | Scale by devicePixelRatio, use integer coordinates, render at 2x–4x and downscale |
| Image upload (FileReader / URL.createObjectURL) | Processing image before it fully loads | Always wait for HTMLImageElement `load` event; use Promise wrapper |
| PNG export (canvas.toBlob / toDataURL) | Exporting at display resolution | Render separately at high resolution (10–20px per module); never reuse display canvas |
| Web Workers for generation | Passing OffscreenCanvas to worker | Not all browsers support OffscreenCanvas; test compatibility or use ImageData transfer instead |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Redrawing full canvas on every slider input event | UI freezes on rapid slider drag | Debounce input events (16ms / rAF), or throttle to 60fps | Any slider with live preview |
| Re-generating QR matrix on every UI change | Redundant matrix computation | Cache QR matrix; only regenerate when URL or ECL changes | First complex customization UI |
| Drawing each dot with separate arc() + fill() calls | Slow canvas rendering for large QR versions | Batch with Path2D or use a single fillRect pass for square modules | Version 10+ QR (100x100 modules) |
| Allocating new ImageData on every preview frame | GC pressure, jank | Pre-allocate ImageData; mutate in place | Real-time preview with any animation |
| Blocking main thread with image downscaling | UI freeze during image upload | Use createImageBitmap() (async, browser-optimized) or process in Web Worker | Large uploaded images (>2MP) |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Passing user-supplied URL directly to QR library without validation | QR code could encode malicious payloads (javascript: URIs, data: URIs) that some QR scanning apps auto-execute | Validate URL format; warn if non-HTTPS; display the encoded URL before generation |
| Loading user-uploaded image with no size/type checks | Very large images cause memory exhaustion; malformed files may crash image decoder | Enforce max file size (5MB), accept only image/jpeg, image/png, image/webp, image/gif |
| Using canvas.toDataURL for download | Downloads as data URI — works but exposes full image data in memory | Use canvas.toBlob() with URL.createObjectURL for download; revoke URL after |
| No XSS sanitization on URL display in UI | URL shown in preview could contain HTML if rendered as innerHTML | Always use textContent, never innerHTML for user-supplied URL display |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No scan test feedback in-app | Users download and discover QR doesn't scan after the fact | Embed ZXing or jsQR decoder in-app; show green/red scan indicator on preview |
| Dot style options that break scanning | Users pick a style that looks cool but fails scanning | Pre-validate all dot styles at boundary radii before exposing them; grey-out or warn on low-reliability options |
| Image upload accepted but poor results silently delivered | Users think it worked when logo is unrecognizable | Show downscaled image preview at module resolution before generation, with guidance on what makes a good source image |
| Real-time preview on slow connection | Generated large PNG causes delay, users think it's broken | Show canvas-rendered preview immediately; only trigger download-quality generation on export |
| Color picker allows near-zero contrast | User makes invisible QR (light on light) | Enforce minimum contrast ratio 3:1 between module color and background; block or warn in real-time |

---

## "Looks Done But Isn't" Checklist

- [ ] **Quiet zone:** Appears to have whitespace but verify 4+ module widths on all sides — not just visual padding
- [ ] **Finder patterns:** Look intact visually but verify no halftone dot-sizing was applied to the 9x9 protected regions
- [ ] **Export resolution:** Preview scans but verify exported PNG scans too, at a phone distance of ~15cm
- [ ] **devicePixelRatio:** Looks sharp on developer's display but test on a 1x or 3x device
- [ ] **Error correction budget:** Scans in ideal lab conditions but test in dim lighting and at an angle
- [ ] **Image preprocessing:** Logo looks recognizable at full size but verify it's recognizable at module resolution preview
- [ ] **Color inversion:** Works in developer's QR app but test with iOS native camera and Android native camera
- [ ] **Module minimum size:** Dots visually present but verify minimum dot radius is large enough to threshold correctly (test with ZXing and jsQR)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Module flipping algorithm (wrong fundamental approach) | HIGH | Rewrite renderer from scratch; cannot salvage flipping logic |
| Corrupted finder/timing patterns | MEDIUM | Add protected-zone mask; all existing rendered outputs are invalid but code change is localized |
| Anti-aliasing artifacts in PNG export | LOW | Add separate high-res export canvas; doesn't affect preview rendering |
| Quiet zone omission | LOW | Add padding constant to layout calculation; trivial fix |
| Inverted color breaking scanning | LOW–MEDIUM | Add contrast check + warning; optionally force light background mode |
| Over-engineered algorithm | HIGH | Delete adaptive layers; regression test each deletion |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Module flipping / wrong algorithm | Phase 1: Core renderer | Scan generated code with 3 different apps; verify logo recognizable at arm's length |
| Finder/timing/alignment pattern corruption | Phase 1: Protected zone mask | Inspect rendered output: corner squares and row 6/col 6 must be solid, not dotted |
| Sub-pixel dithering / noisy grid | Phase 1: Algorithm selection | Side-by-side comparison with MosaicQR.com output |
| Quiet zone omission | Phase 1: Canvas layout | Measure white border in pixels; divide by module size; verify >= 4 |
| Inverted color scheme | Phase 1: Color system | Test against iOS Camera, Android Camera, ZXing with light-on-dark output |
| ECL not matched to visual damage | Phase 1: Algorithm calibration | Scan test at min/max dot radii in dim lighting |
| Canvas anti-aliasing / DPI | Phase 1: Rendering architecture | Download exported PNG; view at 100% zoom; scan from phone |
| Image preprocessing skipped | Phase 2: Upload flow | View downscaled image before generation; test with complex logo |
| Over-engineering | All phases | If adding third rendering profile or second feedback loop: stop and re-evaluate |

---

## Sources

- ISO/IEC 18004 QR code standard (quiet zone, module structure, error correction specifications)
- [QR Code Design Rules — QRLynx](https://qrlynx.com/blog/qr-code-design-best-practices) — quiet zone, contrast, finder pattern requirements
- [Halftone QR Codes — SIGGRAPH 2013 (Chu et al.)](https://dl.acm.org/doi/10.1145/2508363.2508408) — academic source for 3x3 submodule approach
- [Halftone QR Codes — backdrifting.net](https://backdrifting.net/post/016_halftone_qr) — practical walkthrough of center-pixel approach
- [Halftone QR Code Generator — kloet.net](https://kloet.net/usr/halftone/) — reference implementation, dithering methods
- [Halftone QR Codes — NTHU CGV Lab](https://cgv.cs.nthu.edu.tw/projects/Recreational_Graphics/Halftone_QRCodes) — pattern readability function approach
- [QR Code Error Correction Levels — QRLynx](https://qrlynx.com/blog/qr-code-error-correction-levels-explained) — ECL trade-offs
- [Inverted QR Codes — QR Designer](https://qrdesigner.com/blog/inverted-qr-codes-light-on-dark-why-you-should-avoid-them) — color inversion scanning failure analysis
- [Creating Artistic QR Codes — Hovercode](https://hovercode.com/blog/artistic-qr-codes/) — protect structural zones
- [High DPI Canvas — web.dev](https://web.dev/articles/canvas-hidipi) — devicePixelRatio rendering
- [Optimizing canvas — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) — Math.floor coordinates, anti-aliasing
- [QR Code Color Contrast — pageloot.com](https://pageloot.com/blog/qr-code-color-contrast-best-practices/) — minimum contrast ratios
- Prior BrandQR failure analysis (~/zzz/qr/) — confirmed: module flipping, sub-pixel dithering, and adaptive profiling all failed; MosaicQR.com pure halftone dot-sizing is the correct approach

---
*Pitfalls research for: mosaic QR code generator (halftone image embedding)*
*Researched: 2026-06-06*
