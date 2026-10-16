# HUST FoodMap architecture analysis

A food discovery application for HUST students, with an independent Next.js and React frontend and NestJS backend in an npm workspace sharing TypeScript data types. The frontend provides search, filters, a sidebar, and an interactive map. Note: this project has over 100 source files; consider scoping analysis to a subdirectory for faster results.

Analyzed 2026-10-13T13:56:35.201Z. All 115 scanned files represented.
File categories — config: 21, code: 88, docs: 4, markup: 2.
Nodes — file: 90, function: 39, class: 5, config: 21, document: 4.
Relationships — contains: 64, exports: 41, imports: 34, calls: 24, depends_on: 18, documents: 3, configures: 13, tested_by: 7, routes: 1, triggers: 2, writes_to: 25, reads_from: 24, related: 1.

## Architectural layers

- **Next.js Routes And Catalog Loading** (8 files): Next.js document and route states coordinate initial server catalog loading and recoverable client retries.
- **Discovery And Client Map** (13 files): React discovery components, query and geolocation hooks, map rendering and styles support filtering, selection and local trial planning.
- **NestJS Sample Catalog API** (8 files): NestJS bootstrap, validation, controllers, services and fixtures expose health and restaurant discovery backed by illustrative sample records.
- **Shared Restaurant Contracts** (4 files): Workspace declarations and food-group matching define the restaurant envelopes and shared category semantics used by the API and frontend.
- **Project Tooling And Documentation** (18 files): Workspace manifests, environment and compiler configuration, build preparation and project guides support development and analysis.
- **Generated Runtime Assets** (28 files): Responsive food images and the copied MapLibre worker are public runtime assets; generated declarations and compiler caches support builds.
- **Verification And Historical Artifacts** (36 files): API tests, browser regression and diagnostic scripts, Lighthouse reports, snapshots and one-off transformation scripts record validation and migration work.

## Guided tour (12 steps)

1. **Project Purpose And Boundaries** — Start with the workspace overview to understand campus restaurant discovery and the Next.js frontend plus NestJS API architecture. The guidelines establish server and client responsibilities, desktop map expectations, and the requirement to label sample data and local trial features.
2. **Server Rendered Catalog Entry** — The discovery page requests its initial catalog from the server loader before handing the result to the interactive client boundary. The cached loader keeps the backend origin private, uses a request timeout, and returns a recoverable null result when the API is unavailable.
3. **Recoverable Browser Catalog** — CatalogClient turns the server result into ready, loading or error states and supports an abortable retry. The shared status shell and route loading or error components give the page consistent feedback before the restaurant discovery interface mounts.
4. **Retry Through The Proxy** — Follow the retry into the browser API client, which validates the response envelope and combines cancellation with a timeout. Next.js rewrites the same-origin API path to the private backend, while environment examples distinguish server settings from public map configuration.
5. **Discovery Interaction Coordinator** — Once a catalog is ready, FoodMap coordinates the sidebar, search, filters, selected restaurant, saved places and local trial meal plans. Its navigation and reusable cards expose those interactions, while responsive food images support both cards and map markers. Saved and planning state use local storage; these trial interactions do not imply implemented booking or account services.
6. **Validated Shareable Query State** — The query hook connects the discovery controls to browser history without refetching server components. The model validates restored URL values, omits defaults when serializing, and filters or sorts restaurants by search, budget, meal duration and viewport. Walking estimates are straight-line or sample-based estimates rather than routed itineraries.
7. **Map And User Position** — The discovery map loads behind the browser-only feature boundary and manages the MapLibre lifecycle, photo markers, clustering and viewport filtering. The map provider chooses configured, public or illustrative offline styles, while the geolocation hook supports retry and stale callback protection. Coordinates remain in memory instead of being written to shared URLs or saved state.
8. **Shared Domain Contracts** — The contracts workspace supplies the restaurant and data-envelope vocabulary used on both sides of the catalog boundary. Its food-group implementation keeps category matching consistent between API and browser filtering. Visit-plan, realtime and service declarations describe future contracts and do not establish implemented endpoints.
9. **NestJS Application Bootstrap** — Now follow the backend dependency chain from main into application creation and module composition. Startup establishes the listener, API prefix, CORS policy, transforming validation and shutdown hooks; the application module connects the restaurant feature and health response. This is the service reached by the server loader and browser proxy.
10. **Validated Sample Restaurant API** — The restaurant controller exposes collection and identifier routes, and the DTO validates query values before the service handles them. The service filters the fixture catalog using shared food groups, normalized search, budget and open status, and reports missing identifiers. The six fixture listings, prices and ratings are illustrative records rather than verified live restaurant data.
11. **Workspace And Runtime Preparation** — The root manifest coordinates development, builds, typechecking and tests across the workspaces. Frontend preparation produces responsive images and copies the MapLibre worker before serving or building. These build assets support the photographs and browser map encountered earlier in the tour.
12. **Verification And Integration Limits** — Finish with the HTTP restaurant tests and the recorded verification guide to connect architectural decisions with evidence. Browser scripts exercise layout, map and discovery interactions, while the guide distinguishes current checks from historical migration evidence and remaining integration limits. These artifacts help a newcomer choose relevant checks before changing the catalog or discovery experience.

## Validation and limitations

- Full inventory coverage, unique IDs, valid edge/layer/tour references, and installed KnowledgeGraphSchema validation passed.
- No Git repository was present. Commit hashes are empty; commit-based incremental update provenance is unavailable.
- Ignore suggestions were retained as confirmed. Browser snapshots, generated WebP assets, vendor worker, historical verification scripts, reports, and compiler caches are included.
- Structural parsing skipped 24 images, both stylesheets, two compiler caches, and the ignore file. All remain represented as file nodes with accurate role summaries.
- The bundled vendor worker is represented as an asset; its 832 extracted minified functions were omitted.
- Unavailable Swift/Kotlin/Scala/Dart grammars do not affect this project.
- The cache-wrapped catalog loader was recovered from source during review. Workspace and dynamic-import relationships missed by the import parser are represented with source-backed semantic links.
- 42 isolated nodes remain; these primarily describe standalone configuration, generated assets, and historical artifacts.
- No application code changed. Application test/build suites were not run for this analysis-only task.
- Prebuilt dashboard download failed with network EACCES; the installed local Vite dashboard launched successfully and served the validated graph (HTTP 200).
