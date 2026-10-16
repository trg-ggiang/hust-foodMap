# Frontend verification

Latest verification: 12 October 2026 (Asia/Saigon). Earlier sections below are historical and describe the stack used at that time.

## Menu-based food group fallback

- Frontend and NestJS now share `packages/contracts/food-groups.js`. Filters match explicit groups or whole dish-name phrases, including either term in a combined group such as Bún & phở. Addresses cannot assign food groups; Combo does not falsely match Cơm.
- Added an API regression that removes Bếp Xanh's secondary categories and still expects both rice restaurants. Five API tests and production build/TypeScript passed; browser search/category comparison still returns the same two restaurants.

## Food-group consistency and hidden scrollbars (latest)

- A restaurant can belong to multiple food groups while retaining its primary display label. Bếp Xanh serves rice and noodles, so it now appears under Cơm and Bún & phở as well as Ăn chay. API and client selectors use the same membership semantics.
- Regression verified: searching cơm and selecting Cơm both return Cơm nhà Bách Khoa and Bếp Xanh sinh viên, with two corresponding map pins. The API tests also cover combined search/category and budget narrowing.
- Scrollbars are visually hidden in controls, restaurant results and detail dialogs; overflow scrolling remains enabled. Playwright confirmed PageDown scrolls the list and details open correctly. Evidence: `output/playwright/rice-filter-check.js`, `rice-filter-consistent.png`, `rice-detail-no-scrollbar.png`.
- All four API tests and the production build (including TypeScript) passed. Browser check reported no page errors.

## Sidebar space and map pointer update (latest)

- Restaurant results reserve 50% of sidebar height and scroll independently. The compact controls can scroll separately on short laptop viewports.
- Removed the location text block and slash hint in search. Live location remains active; the map location control uses a crosshair icon and exposes status in its tooltip. Map panning uses a crosshair cursor with grabbing feedback during drag.
- Playwright verified the 50% result-area ratio, no horizontal overflow, no removed UI remnants, list scrolling, selecting restaurants and opening filters at 1366×650, 1280×640, 1093×550, 1024×600 and 1536×760. No page errors in these runs. Evidence: `output/playwright/sidebar-half.js` and `sidebar-half-1366.png`.
- Fixed a development Fast Refresh race: restaurant sources are only attached after the current MapLibre instance has emitted its own load event, rather than trusting a retained React ready status.

## Laptop viewport overflow fix (latest)

- Removed the hard 1024px application minimum width. Desktop header and sidebar adapt to available width; short viewports scroll the whole sidebar so filters cannot collapse the restaurant list.
- Moved the meal-time control into the sidebar to prevent overlap with selected map cards. Filter dialogs stay within viewport height with reachable actions.
- Playwright verified 1366×650, 1280×640, 1093×550, 1024×600, 900×500 and 1536×760 in an isolated browser context: no document overflow, header fits, all restaurant cards reachable, active pins and dialogs inside viewport, no page errors. Production build and TypeScript passed.
- Evidence: `output/playwright/laptop-fit.js` and `laptop-1366x650.png`. This supersedes the earlier fixed minimum-width decision.

## Desktop-only scope update

### Latest filter and live-origin update

- Budget range and URL parsing now support 20k–100k. Added presets, applied filter counts, unrestricted walking/meal-time options and a live result-count preview. Clear control beside Open removes filters/category/map bounds while retaining search text.
- Geolocation watch drives the origin marker and estimated outbound walking times. Coordinates stay in memory; permission errors are visible with retry and no fabricated origin marker.
- Playwright with emulated geolocation verified position changes, budget persistence, clear behavior, permission denial/retry, default unlimited options, preview counts and laptop filter-row fit. Axe reported no violations in the tested desktop state; no page errors. Scripts: `output/playwright/filter-location-checks.js`, `filter-edge-checks.js`.
- Walking estimates use straight-line distance, not a routing service. Return-to-campus times and restaurant data remain samples. Actual device GPS was not independently tested.

- Removed mobile navigation, bottom-sheet state/drag handlers, mobile CSS blocks, and mobile map camera/padding branches at the user's request.
- One desktop sidebar/map layout remains, with a 1024px minimum application width and horizontal scrolling for narrower windows. Laptop sizing and reduced-motion support remain.
- Typecheck and production build passed. Playwright confirmed side-by-side layout at three window sizes, no mobile elements, working category filtering/selected cards, and no page errors. Screenshot: `output/playwright/desktop-only.png`.
- Mobile verification below is historical; the mobile interface is no longer supported.

## Next.js + React redesign (current architecture)

- Frontend now uses Next.js App Router; NestJS remains the API. Server routes load the catalog, client discovery components own interaction, and MapLibre is dynamically loaded with its worker served locally.
- Extracted discovery query parsing, validation, serialization and restaurant selection into the feature model. The React hook handles URL updates and Back/Forward while preserving Next router metadata. Removed duplicated query state from the page.
- Redesigned the contained desktop header, six visible category controls, restaurant cards, typography and subdued navy map. Fixed the inactive open-only chip and selected-card clipping across desktop/mobile resize. Map padding follows the actual bottom-sheet height.
- `npm run typecheck`, `npm run build` and all three API tests passed. Playwright CLI on localhost:5173 passed 16 interaction/responsive assertions: map/list filtering, selected URL, Back/Forward, deep links, empty search, clustering and widths 1920/1440/1024/768/390. No browser page errors.
- Production smoke test on localhost:3001 passed: HTTP 200, same-origin API proxy returned all six sample restaurants, category filtering and selected map card worked without page errors. Evidence: `output/playwright/next-production.js` and `next-production.png`.
- Additional browser checks passed Escape dismissal of filters and selected mobile-card bounds. Axe WCAG 2 A/AA and 2.1 AA scans reported zero violations in the tested desktop and expanded mobile states. These automated scans do not replace screen-reader or real-device testing.
- Visually inspected desktop, tablet and mobile screenshots. Evidence: `output/playwright/next-checks.js`, `next-accessibility.js`, `next-desktop-final.png`, `next-selected-390.png`, `next-selected-768.png`.
- OpenFreeMap remains the working fallback because no authorized VIETMAP style is configured. A nonblocking provider warning about a missing decorative wood-pattern image remains; map tiles and interactions render. Catalog facts and realtime activity remain sample data.


## Zoom-out map coverage fix

- Reproduced the reported blank map: the default offline illustration only covered a small campus rectangle. At zoom 13, five matching restaurants were correctly clustered but the surrounding basemap was empty.
- Default fallback now uses OpenFreeMap's native Dark street map. Configured VIETMAP styles retain priority; the limited offline illustration is explicitly opt-in via `VITE_MAP_OFFLINE=true`. Real map zoom range extends to zoom 3. Provider attribution uses MapLibre's attribution control without the overlapping custom label.
- Playwright CLI on `localhost:5173`: inspected 1440×1000 desktop and 390×844 mobile, zoomed out to Hanoi and the wider region, and expanded the five-restaurant cluster back to five photo pins. 54 successful map requests, no page errors or map-error overlay. A provider warning reports a missing decorative `wood-pattern` image; road-map coverage rendered successfully.
- TypeScript and production build passed. Screenshots: `output/playwright/zoom-out-after.png`, `zoom-out-city.png`, `real-map-desktop.png`, `real-map-mobile.png`; interaction script: `output/playwright/zoom-verify.js`.

## Subtle 3D food-pin refinement

- Added a shared photo surface to compact/active pins: a restrained static reflection, top/side edge highlights, a narrow lower edge and soft layered shadows. The selected image is inset in its card with a stronger lift shadow.
- Hover lift is 3px; the selected card enters over 180ms with a small scale change. Reduced-motion preferences disable the transition/entry animation. Decorative light layers do not receive pointer events; MapLibre's positioning transform stays on its original host.
- Reused the 17 map interaction/accessibility/responsive assertions on React development at `localhost:5173`, with normal motion enabled. All passed; the desktop Axe WCAG audit returned no violations.
- Inspected desktop and mobile screenshots, including `output/playwright/semi-3d-default.png`, `semi-3d-selected.png` and `semi-3d-mobile.png`. Frontend build includes the TypeScript check. No backend/API behavior was changed.

## Earlier NestJS + React/Vite migration

- Replaced Next.js with an npm workspace monorepo: `apps/web` (React/Vite), `apps/api` (NestJS), `packages/contracts` (shared TypeScript declarations).
- `npm run typecheck` passed for both applications. `npm test` passed three HTTP integration tests covering the catalog, Vietnamese search/filter validation, detail envelopes and 404 responses.
- The migrated production frontend passed 27 existing regression assertions, 17 dark-map assertions and six new migration assertions. These verify API-driven restaurant data, API outage/retry, responsive WebP images and that replacing API records changes the rendered catalog.
- Axe returned zero automated WCAG 2 A/AA and 2.1 AA violations in tested light/dark desktop, mobile and filter-dialog states. Rendered inspection covers retained photo pins, active details, sidebar and mobile bottom sheet.
- `npm run dev` starts React on 5173 and NestJS on 3000 with file watching. Vite development and preview proxy `/api` to NestJS. The static build needs a reverse proxy or `VITE_API_URL` in deployment.
- The image dependency was updated to patched sharp 0.35.5; the install audit returned zero known vulnerabilities.
- Frontend fixtures moved into the read-only NestJS restaurant service. Authentication, favorites, ratings and visit plans remain local trial functionality. Database, routing and realtime have not been added. API catalog data remains explicitly labeled sample data.
- Current screenshot: `output/playwright/react-nest-desktop.png`. Migration checks: `output/playwright/migration-checks.js`. The older sections below describe the previous Next.js implementation; their Lighthouse figures are historical, not measurements of the Vite migration.

## Desktop-first dark map revision

- Production build and TypeScript check passed after the photo-pin refactor.
- 17 additional Playwright assertions passed: default photo pins, sidebar brand, bidirectional hover, map selection, sidebar scrolling, expanded pin facts, detail opening, filtered/empty map results, spatial cluster expansion and responsive overflow checks.
- The existing 27 interaction/regression assertions also passed on the revised build. Axe returned zero WCAG 2 A/AA and 2.1 AA violations in desktop light/dark, mobile and filter-dialog states.
- Inspected rendered screenshots at 1440×1000, 1024×768 and 390×844. Fixed marker stacking above the mobile bottom sheet, floating-header text contrast in dark sidebar mode, and unwanted search-area prompts from automatic camera moves.
- Reusable compact/active markers render through React portals into persistent MapLibre marker hosts. Hover/selection preserve marker instances. Restaurant lookup uses an indexed map; clustering runs in the MapLibre GeoJSON worker and only viewport-bounded features receive DOM markers. Large live datasets were not benchmarked.
- Added `NEXT_PUBLIC_MAP_DARK_STYLE_URL` plus a restrained vector-layer theme adapter for configured VIETMAP styles. Without provider credentials the local illustrative map remains active. Live VIETMAP rendering remains untested.
- Screenshots: `output/playwright/dark-map-selected.png`, `dark-map-1024.png`, `dark-map-mobile.png`. New checks: `output/playwright/dark-map-checks.js`.

The Lighthouse figures below are the earlier baseline, before this photo-pin revision; they were not remeasured for the revision.

## Build and interaction checks

- `npm run typecheck`: passed.
- `npm run build`: passed; the discovery route is prerendered.
- Playwright CLI: 31 assertions passed in Chromium, including search across Vietnamese names/menus, empty results, walking/meal-time/amenity filters, sorting, list-map selection, authentication gating, favorites persistence, per-restaurant rating history, explicit visit-plan confirmation, overlap rejection, check-in, cancellation/undo, expiry and GPS-denial fallback.
- Mobile sheet expanded with click and drag, collapsed with keyboard, and retained scrolling. Radix dialogs trapped keyboard focus and closed with Escape.
- No horizontal page overflow at 375×812, 390×844, 768×1024, 844×390 and 1440×1000. Reduced-motion mode was exercised.
- Aborting the local map worker produced the map-error state while all five open sample restaurant results remained usable. GPS was requested only by clicking the location button.

The browser scripts are in `output/playwright/verify.js` and `output/playwright/edge-checks.js`. They use the Playwright CLI's `run-code --filename` workflow, not Playwright test specs. The scripts and screenshots are local verification artifacts, ignored by git.

## Accessibility and visual review

Axe checks for WCAG 2 A/AA and WCAG 2.1 AA returned zero automated violations in desktop light, desktop dark, phone and filter-dialog states. Manual rendered inspection covered the desktop sidebar, price markers, mobile sheet positions, dialog content and both themes. Automated checks do not establish full accessibility conformance or replace testing with assistive technology.

Reviewed against [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Fixed findings included an invalid label on the origin marker, marginal muted-text contrast, decorative icon semantics, missing main landmark, dialog description IDs, touch-control dimensions and drag/click conflicts. Interactive navigation exposes its pressed state. Filters, origin/return locations, search, sorting, selected restaurant and active view are reflected in the URL.

## Performance

Latest Lighthouse mobile-throttled production measurement:

| Metric | Result |
|---|---:|
| Performance | 87 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| LCP | 3.1 s |
| Total blocking time | 290 ms |
| CLS | 0.002 |
| Total transferred resources | 644 KiB |

The initial measurement scored 57, with LCP 6.8 s and 670 ms blocking time. Next Image thumbnails, eager priority for the first result, fewer self-hosted font weights and mounting the map engine after critical discovery content is ready improved loading. MapLibre remains in a separate dynamic chunk and uses a locally served worker. The offline map starts automatically; no interaction is required to load it.

LCP remains above the 2.5 s target under simulated mobile throttling. Further work should profile real devices and the configured map provider. This is a local lab measurement, not production field data; INP was not measured. The last visual refinement added dark offline-map paint colors, separately checked with the final build and Axe.

## Integration limits

No live VIETMAP credentials, production data backend, authentication service, routing service or WebSocket feed was available. These were not tested. Restaurant facts, visitor counts, crowd reports, map geometry and travel estimates remain explicitly labeled sample data. Frontend plan/rating behavior is a local trial and must be enforced by the authoritative backend before real deployment. Safari, Firefox, real touch devices and screen readers were not independently tested.
