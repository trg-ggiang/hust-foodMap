import { mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const directory = fileURLToPath(new URL("../public/images/", import.meta.url));
const output = `${directory}/optimized`;
await mkdir(output, { recursive: true });
await Promise.all(
  (await readdir(directory))
    .filter((name) => name.endsWith(".jpg"))
    .map(async (name) => {
      await Promise.all(
        [128, 256, 512, 768].map((width) =>
          sharp(`${directory}/${name}`)
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 78 })
            .toFile(`${output}/${name.replace(/\.jpg$/, "")}-${width}.webp`),
        ),
      );
    }),
);
