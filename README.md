# Car_insurance

A production-ready, static 3D website for **Gosnells Smash Repairs** — an insurance-approved panel-beating and respray workshop in Maddington, Western Australia.

The site pairs the client's approved copy (kept verbatim in `index.html`) with a scroll-driven car experience: a red Ferrari 458 greets the visitor on the right, drag/hold spins it a full 360°, and scrolling changes its finish, swaps in a BMW M4, moves the car to the left, and flips the two-column sections so the information sits on the right.

## Quick start

The page uses ES modules, so it must be served over HTTP (opening the file directly with `file://` will not load the 3D scene).

```bash
# from the project folder
python -m http.server 8080
```

Then open <http://localhost:8080/index.html>.

No build step, package install, or API key is required. Any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, or a plain web server) can serve the folder as-is.

## What is included

- **3D hero** — Three.js r170 with the official three.js Ferrari 458 GLB. Load indicator → car slides in from the left → rests on the right beside the hero copy.
- **360° interaction** — hold and drag the car to spin it without angle limits; release for momentum-based inertia. A gentle spin continues while the pointer is held.
- **Scroll choreography** — one fixed canvas layer for the whole document. Scroll position drives horizontal travel, rotation direction, paint finish, and the brand change.
- **Two cars** — Ferrari 458 Italia (red → bone → charcoal finishes) and a compressed BMW M4 Competition, lazy-loaded only after the visitor starts scrolling.
- **Responsive information flip** — once the BMW takes the left side, `.split`, `.band`, `.contact-grid`, services and process columns reverse so text sits on the right.
- **Liquid-glass UI** — frosted floating header and car control dock over an animated liquid-gradient backdrop; content panels stay clean and readable.
- **Full site** — hero, trust strip, services, about, process, gallery, insurance, contact form and footer, all using the exact text from the supplied `index.html`.
- **Accessibility** — labelled controls, keyboard-able buttons, visible focus, reduced-motion and reduced-transparency fallbacks, and WCAG AA contrast.

## Controls

| Action | Result |
| --- | --- |
| Hold + drag the car | Continuous 360° rotation, with inertia on release |
| Scroll down | Car travels across the viewport, changes finish, swaps brand, moves left and flips content columns |
| Colour swatches | Override the automatic finish (red / bone / charcoal) while the Ferrari is shown |
| `Auto` button | Return finish control to the scroll-driven sequence |
| `Escape` | Not bound — use `Auto` to reset the car controls |

## Project structure

```text
index.html                  Client-approved markup and all visible copy — do not edit the text
README.md                   This file
assets/
  brand/
    logo.svg                Header/footer wordmark
    favicon.svg             Tab icon
  css/
    styles.css              Tokens, layout, sections, liquid background, responsive rules
    hero.css                Hero typography and fixed 3D stage
    components.css          Buttons, form, preloader, floating car control dock
    animations.css          Scroll reveals and reduced-motion overrides
  js/
    hero-car.js             Three.js scene, GLB loading, scroll choreography, drag rotation
    animations.js           GSAP ScrollTrigger reveals and hero intro
    main.js                 Menu, year, preloader
  img/                      Seven AI-generated, colour-graded workshop photographs
  models/
    ferrari.glb             Ferrari 458 Italia (three.js example)
    ferrari_ao.png          Baked contact shadow for the Ferrari
    bmw_m4.glb              BMW M4 Competition, Draco-compressed for the web
    CREDITS.txt             Model sources and licences
  vendor/
    three.module.min.js     Three.js r170
    gsap.min.js             GSAP 3.12.5
    ScrollTrigger.min.js    GSAP ScrollTrigger 3.12.5
    addons/                 GLTFLoader, DRACOLoader, RoomEnvironment, BufferGeometryUtils
    draco/                  Local Draco decoder (no CDN dependency at runtime)
```

## How the 3D scene works

`assets/js/hero-car.js` injects the canvas into a fixed full-viewport layer and lets the rest of the page scroll normally above it. Key implementation details:

- Three.js, the loaders and the Draco decoder are loaded from local files, so there is no runtime third-party request.
- `GLTFLoader` + `DRACOLoader` load the Ferrari immediately; the BMW is requested only once document scroll passes 18%.
- `RoomEnvironment` supplies studio reflections without downloading an HDR image.
- Rendering is **on demand**: frames are drawn only when scroll, drag, loading or a control changes the scene, which keeps weak GPUs and battery life usable.
- The brand crossfade happens between 48% and 56% document scroll; the information flip activates at 62%.
- No WebGL, low-memory devices and reduced-motion users get a static SVG car poster and a fully usable page.

## Performance and quality checks

Measured with Lighthouse 13 against the local server:

| Metric | Result |
| --- | --- |
| Performance (desktop preset) | **98** |
| Largest Contentful Paint | **0.6 s** |
| Total Blocking Time | **120 ms** |
| Cumulative Layout Shift | **0.001** |
| Accessibility | **100** |
| Console errors | **0** |

The mobile headless score is lower only because headless Chrome renders WebGL on the CPU; on a real device the scene renders on the GPU.

## Editing guidance

- **Copy:** keep every visible string in `index.html` unchanged. The brief for this project is that the client's supplied information must be preserved exactly.
- **Colours:** edit the CSS custom properties at the top of `assets/css/styles.css` (`--ink`, `--bone`, `--amber`, `--amber-dk`, `--muted`).
- **Finishes:** edit the `FINISHES` array near the top of `assets/js/hero-car.js`.
- **Car paths and timing:** the `gltfLoader.load(...)` calls and the progress thresholds in `targetX()`, `scrollRotation()` and the brand crossfade are all in `hero-car.js`.
- **Images:** replace the files in `assets/img/` with the client's real workshop photography when available; keep the filenames so `index.html` needs no changes.

## Assets and attribution

See `assets/models/CREDITS.txt` for full model sources and licences.

- Ferrari 458 Italia from the three.js examples, model by vicent091036.
- BMW M4 Competition by SRT Performance, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), simplified and Draco-compressed for this site.
- Workshop photographs were AI-generated and colour-graded to match the site palette.
- Barlow Condensed and Inter are loaded from Google Fonts.

## Deployment

Copy the entire folder to any static host. Keep the directory structure intact — all paths in `index.html` and `hero-car.js` are relative. For GitHub Pages, publish the `main` branch at the repository root; the site works without a custom build command.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Car does not appear when opening the HTML file | ES modules need HTTP; run `python -m http.server 8080` |
| "Loading vehicle" stays visible | Check that `assets/models/ferrari.glb` and `assets/vendor/draco/` exist and are served |
| Car rotates only a small amount | Ensure you are dragging the canvas area, not a link or text control |
| Glass looks opaque | The browser or OS has Reduced Transparency enabled; this is an intentional fallback |
