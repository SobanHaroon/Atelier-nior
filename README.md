# Atelier Noir — Form in Motion

A cinematic menswear storefront exploring the relationship between architectural tailoring, movement, and digital interaction. An editorial shopping experience combines a scroll-driven garment study with a responsive product catalog.

**[Explore the live website](https://atelier-noir-motion.vercel.app/)** · **[Source code](https://github.com/SobanHaroon/Atelier-nior)**

![Atelier Noir homepage featuring the technical jacket and editorial typography](docs/preview.jpg)

## Overview

Atelier Noir is a frontend portfolio concept built with React and Vite. The opening experience moves through four visual chapters, shifting from a dark studio to ivory and crimson environments as the visitor scrolls. Oversized typography, restrained product layouts, and coordinated transitions carry the visual direction into the collection, campaign, and atelier sections.

The project adapts a supplied menswear design and cinematic video reference. The garment geometry is recreated procedurally in Three.js; the original reference model is not included. Browsers without WebGL2 display an animated WebP jacket image. The preview above shows that image presentation.

## Features

- **Cinematic scroll journey:** GSAP ScrollTrigger coordinates garment rotation, scale, position, chapter copy, background transitions, and campaign parallax.
- **Interactive 3D garment:** Procedural jacket geometry, textured fabric, studio lighting, pointer-drag rotation, and Carbon, Chalk, and Crimson material expressions.
- **Responsive collection:** Six concept products with category filters, price sorting, and text search.
- **Product discovery:** Product details, composition and care information, size selection, and saved pieces.
- **Shopping bag:** Size-specific items, quantity controls, calculated totals, and persistence through browser local storage.
- **Demo order review:** Downloadable text summary without submitting an order or collecting payment.
- **Accessible interactions:** Semantic controls, keyboard focus management, Escape-to-close dialogs, a skip link, and reduced-motion support.
- **Performance considerations:** Lazy-loaded Three.js scene, capped pixel density, rendering suspended outside the viewport or in hidden tabs, local fonts, and WebP imagery.

## Technology

| Technology | Role |
| --- | --- |
| React 19 | Components, catalog state, dialogs, wishlist, and bag |
| Vite 7 | Development server and production bundling |
| GSAP 3 + ScrollTrigger | Scroll choreography and section reveals |
| Three.js | Procedural garment, materials, lighting, and rendering |
| Anime.js 4 | Brand mark drawing animation |
| Framer Motion 12 | Product, overlay, drawer, and interface transitions |
| CSS | Responsive layouts, typography, and visual states |
| Fontsource | Locally bundled Bodoni Moda and Hanken Grotesk |
| Vercel | Production hosting |

Exact dependency versions are recorded in `package-lock.json`.

## Getting started

### Requirements

- Node.js **22.12+**, or Node.js **24**
- npm
- A modern browser; WebGL2 enables the interactive 3D presentation

### Install and run

```bash
git clone https://github.com/SobanHaroon/Atelier-nior.git
cd Atelier-nior
npm ci
npm run dev
```

Open the local URL printed by Vite. No environment variables or API keys are required for the current frontend.

### Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the dependencies recorded in the lockfile |
| `npm run dev` | Start the development server |
| `npm run build` | Generate the production site in `dist/` |
| `npm run preview` | Serve the existing production build locally |

To inspect the production build:

```bash
npm run build
npm run preview
```

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/main.jsx` | Application components, shopping interactions, and scroll timeline |
| `src/GarmentScene.jsx` | Three.js geometry, materials, lighting, and rendering lifecycle |
| `src/products.js` | Product catalog, scene expressions, and currency formatting |
| `src/style.css` | Visual system, responsive layouts, and image crops |
| `public/images/` | Jacket artwork and editorial collection imagery |
| `public/favicon.svg` | Site icon |
| `docs/preview.jpg` | Website preview for this README |
| `index.html` | Application entry and page metadata |
| `vite.config.js` | Vite configuration |
| `vercel.json` | Response headers for Vercel deployment |

Generated builds, dependencies, local environment files, and hosting metadata are excluded through `.gitignore`.

## Motion architecture

GSAP owns the scroll timeline and writes the current garment pose into a shared React ref. The Three.js animation loop reads that pose directly, avoiding a React render for every animation frame. Framer Motion handles interface transitions, while Anime.js animates the brand mark.

The 3D scene is loaded separately from the main application. Its rendering loop pauses when the scene leaves the viewport or the document becomes hidden. Geometry, materials, textures, observers, and event listeners are cleaned up when the scene unmounts.

When reduced motion is preferred, the extended scroll choreography and 3D rendering are disabled in favor of a simpler presentation. When WebGL2 is unavailable, the jacket artwork follows the scroll composition as an image fallback. Image and 3D presentations intentionally use different rendering techniques and are not visually identical.

## Customization

- **Catalog and pricing:** Edit `src/products.js`. Keep product IDs stable to preserve saved browser state.
- **Scroll choreography:** Adjust the GSAP timeline and chapter content in `src/main.jsx`.
- **Garment appearance:** Edit procedural geometry, lighting, and materials in `src/GarmentScene.jsx`.
- **Typography and layout:** Update `src/style.css` and the Fontsource imports in `src/main.jsx`.
- **Imagery:** Replace the files in `public/images/` and update image names and crop classes where needed.
- **Brand copy and metadata:** Edit the page content in `src/main.jsx` and metadata in `index.html`.

The scene expression selector changes the cinematic presentation. The Technical Shell in the catalog represents the Carbon edition.

## Deployment

The current production site is hosted at **https://atelier-noir-motion.vercel.app/**.

To deploy this repository on Vercel, import `SobanHaroon/Atelier-nior`, use the repository root as the project root, and apply these settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 22.12+ or 24 |
| Environment variables | None required |

The existing live site was deployed from source through Vercel. Pushing this repository alone does not configure a Git connection; connect it to the Vercel project to enable deployments from future commits.

For Netlify, use the same install and build commands, with `dist` as the publish directory.

## Validation and current scope

The production build completed successfully, and desktop and mobile layouts, navigation, search, product selection, wishlist, and bag interactions were manually checked. The deployed asset bundle was verified against the final local build. The browser used for validation displayed the image fallback; WebGL rendering should also be checked on target devices before a commercial release. No automated test suite is currently included.

This repository is a **storefront concept**, not a connected commerce backend. Product specifications, prices, availability, and brand narrative are illustrative. Wishlist and bag state are stored only in the visitor's browser under `noir-wishlist` and `noir-bag`.

Before accepting real orders, connect an authoritative catalog, inventory, payment provider, server-side order processing, merchant contact information, and fulfillment rules. Checkout currently creates a downloadable summary only: it does not process payments or place orders.

## Credits

Created for **DevOps Services**. Art direction draws on the supplied menswear layout and cinematic reference video. Editorial imagery comes from the supplied design; the jacket artwork and procedural scene were created for this implementation. Third-party packages and fonts retain their respective licenses.
