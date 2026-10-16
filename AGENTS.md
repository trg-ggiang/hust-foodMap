# HUST FoodMap

- npm workspace monorepo: Next.js App Router + React in `apps/web`, NestJS in `apps/api`.
- Keep route layouts/pages as Server Components; interactive discovery belongs behind the client feature boundary. Browser-only maps load dynamically.
- Initial catalog fetching lives in `src/lib/server`; the browser uses the typed API client and same-origin `/api` proxy. Never expose private backend URLs through `NEXT_PUBLIC_*`.
- Shared API types belong in `packages/contracts`; restaurant sample fixtures belong to the API.
- Preserve the desktop-only dark map, photo markers and side-by-side sidebar/map layout that fits the available browser viewport; do not add mobile navigation or bottom sheets.
- Keep sample data and local trial functionality clearly labeled.
- Run `npm run typecheck`, `npm run build`, `npm test` for architecture/API changes.
- Use Playwright CLI to inspect affected user interactions.
