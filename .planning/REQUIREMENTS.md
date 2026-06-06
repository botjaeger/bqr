# Requirements: BQR — Mosaic QR Code Generator

**Defined:** 2026-06-06
**Core Value:** Generated QR codes must scan reliably AND look visually clean — the logo/image must be clearly recognizable within the QR pattern.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### QR Generation

- [ ] **QR-01**: User can enter a URL and generate a QR code
- [ ] **QR-02**: QR code uses error correction level H (30% recovery)
- [ ] **QR-03**: Finder patterns, timing patterns, and alignment patterns render as solid full-size squares
- [ ] **QR-04**: Quiet zone (4-module minimum border) enforced per ISO 18004

### Image Embedding

- [ ] **IMG-01**: User can upload an image via drag-and-drop or file picker (PNG/JPG/WEBP)
- [ ] **IMG-02**: Image embedded via halftone dot-sizing (dot radius varies with image brightness)
- [ ] **IMG-03**: User can adjust image influence strength via slider
- [ ] **IMG-04**: Generated QR code validated as scannable (in-app scan check)
- [ ] **IMG-05**: All image processing happens client-side (image never leaves browser)

### Visual Customization

- [ ] **VIS-01**: User can switch between dot styles (circle, square, rounded square, diamond)
- [ ] **VIS-02**: User can set custom foreground and background colors
- [ ] **VIS-03**: User can customize eye/corner pattern styles separately from body dots

### Output

- [ ] **OUT-01**: Real-time canvas preview updates as user changes settings
- [ ] **OUT-02**: User can download PNG at high resolution (2x/4x)

### Polish

- [ ] **POL-01**: Showcase gallery with example QR codes demonstrating quality

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Output

- **OUT-03**: SVG export
- **OUT-04**: PDF export with print marks

### Customization

- **VIS-04**: Gradient fills on dots with contrast enforcement
- **VIS-05**: Color theme presets
- **VIS-06**: Background customization (gradients, patterns, images)

### Features

- **FEAT-01**: QR content types beyond URL (WiFi, vCard, SMS)
- **FEAT-02**: Module-resolution image preview before generation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Center logo overlay | Defeats the mosaic concept — the image should be embedded in the dot pattern, not stamped on top |
| Inverted/light-on-dark QR | Scanner failures on many iOS/Android devices |
| AI art mode | Wrong stack entirely — requires diffusion models, GPU, different product category |
| Dynamic QR codes | Requires server infrastructure, contradicts stateless/free constraint |
| User accounts/persistence | Stateless product by design — no backend storage |
| Server-side generation | Privacy constraint (image never leaves browser) + zero server cost |
| Mobile native app | Web-only, responsive design sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| QR-01 | — | Pending |
| QR-02 | — | Pending |
| QR-03 | — | Pending |
| QR-04 | — | Pending |
| IMG-01 | — | Pending |
| IMG-02 | — | Pending |
| IMG-03 | — | Pending |
| IMG-04 | — | Pending |
| IMG-05 | — | Pending |
| VIS-01 | — | Pending |
| VIS-02 | — | Pending |
| VIS-03 | — | Pending |
| OUT-01 | — | Pending |
| OUT-02 | — | Pending |
| POL-01 | — | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15 ⚠️

---
*Requirements defined: 2026-06-06*
*Last updated: 2026-06-06 after initial definition*
