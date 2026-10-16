import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const publicDirectory = new URL("../public/", import.meta.url);

await mkdir(publicDirectory, { recursive: true });
await copyFile(
  require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs"),
  new URL("maplibre-gl-worker.mjs", publicDirectory),
);
