# Atelier Noir — Form in Motion

A cinematic menswear storefront exploring the relationship between architectural tailoring, movement, and digital interaction. An editorial shopping experience combines a scroll-driven garment study with a responsive product catalog.

**[Explore the live website](https://atelier-noir-motion.vercel.app/)** · **[Source code](https://github.com/SobanHaroon/Atelier-nior)**

![Atelier Noir homepage featuring the technical jacket and editorial typography](docs/preview.jpg)

## Overview

Atelier Noir is a frontend portfolio concept built with React and Vite. The opening experience moves through four visual chapters, shifting from a dark studio to ivory and crimson environments as the visitor scrolls. Oversized typography, restrained product layouts, and coordinated transitions carry the visual direction into the collection, campaign, and atelier sections.

The project adapts a supplied menswear design and cinematic video reference. Production uses the same detailed WebP jacket artwork on every device, with scroll-driven zooms and bounded perspective motion. It does not automatically replace that artwork based on WebGL support. The original reference model is not included; the earlier procedural Three.js reconstruction is retained in the source as an inactive prototype.

## Features

- **Cinematic scroll journey:** GSAP ScrollTrigger coordinates garment rotation, scale, position, chapter copy, background transitions, and campaign parallax.
- **Consistent garment presentation:** Detailed jacket artwork, subtle perspective tilts, cinematic close-ups, and Carbon, Chalk, and Crimson visual expressions across desktop and mobile.
- **Responsive collection:** Six concept products with category filters, price sorting, and text search.
- **Product discovery:** Product details, composition and care information, size selection, and saved pieces.
- **Shopping bag:** Size-specific items, quantity controls, calculated totals, and persistence through browser local storage.
- **Demo order review:** Downloadable text summary without submitting an order or collecting payment.
- **Accessible interactions:** Semantic controls, keyboard focus management, Escape-to-close dialogs, a skip link, and reduced-motion support.
- **Performance considerations:** Transform-based garment animation, local fonts, WebP imagery, and no continuous WebGL render loop or Three.js bundle in the production page.

## Technology

| Technology | Role |
| --- | --- |
| React 19 | Components, catalog state, dialogs, wishlist, and bag |
| Vite 7 | Development server and production bundling |
| GSAP 3 + ScrollTrigger | Scroll choreography and section reveals |
| Three.js | Inactive procedural prototype retained for future 3D asset work |
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
- A modern browser; WebGL is not required for the production presentation

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
| `src/GarmentScene.jsx` | Inactive Three.js prototype; not imported by the production app |
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

GSAP owns the scroll timeline and directly animates the jacket artwork’s position, scale, rotation, and bounded CSS perspective. This produces layered depth without replacing the detailed garment with approximate geometry. Framer Motion handles interface transitions, while Anime.js animates the brand mark.

The production page uses a single rendering path regardless of GPU or WebGL capability. The procedural Three.js component is intentionally not imported, so it cannot replace the jacket after loading and is excluded from the production bundle. Full 360-degree garment rotation is not part of this presentation.

When reduced motion is preferred, the extended scroll choreography and perspective transforms are disabled in favor of a static garment composition.

## Customization

- **Catalog and pricing:** Edit `src/products.js`. Keep product IDs stable to preserve saved browser state.
- **Scroll choreography:** Adjust the GSAP timeline and chapter content in `src/main.jsx`.
- **Garment appearance:** Replace `public/images/jacket.webp`; adjust expression filters in `src/style.css`. The procedural `src/GarmentScene.jsx` file is an inactive experiment, not the production renderer.
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

The production build completed successfully, and desktop and mobile layouts, navigation, search, product selection, wishlist, and bag interactions were manually checked. A subsequent jacket rendering fix removed the automatic WebGL model swap so the detailed artwork remains consistent across devices. No automated test suite is currently included.

This repository is a **storefront concept**, not a connected commerce backend. Product specifications, prices, availability, and brand narrative are illustrative. Wishlist and bag state are stored only in the visitor's browser under `noir-wishlist` and `noir-bag`.

Before accepting real orders, connect an authoritative catalog, inventory, payment provider, server-side order processing, merchant contact information, and fulfillment rules. Checkout currently creates a downloadable summary only: it does not process payments or place orders.

## Credits

Created for **DevOps Services**. Art direction draws on the supplied menswear layout and cinematic reference video. Editorial imagery comes from the supplied design; the jacket artwork and procedural scene were created for this implementation. Third-party packages and fonts retain their respective licenses.
