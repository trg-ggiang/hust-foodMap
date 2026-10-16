import type {
  StyleSpecification,
  GeoJSONSourceSpecification,
} from "maplibre-gl";
import type { Feature as GeoFeature, Geometry } from "geojson";
// Provider boundary: UI does not depend on VIETMAP URLs. A future GrabMaps adapter can implement this contract.
export interface MapProvider {
  id: string;
  name: string;
  illustrative: boolean;
  getStyle(): StyleSpecification | string;
}
type Feature = GeoFeature<Geometry>;
const base: Feature[] = [];
const point = (x: number, y: number) => [
  105.842 + x * 0.013,
  20.999 + y * 0.011,
];
const polygon = (x: number, y: number, w: number, h: number, kind: string) => {
  const a = point(x, y),
    b = point(x + w, y + h);
  base.push({
    type: "Feature",
    properties: { kind },
    geometry: {
      type: "Polygon",
      coordinates: [[a, [b[0], a[1]], b, [a[0], b[1]], a]],
    },
  });
};
polygon(0.25, 0.39, 0.38, 0.51, "campus");
polygon(0.04, 0.7, 0.17, 0.28, "park");
polygon(0.09, 0.73, 0.08, 0.17, "water");
polygon(0.36, 0.63, 0.06, 0.12, "water");
for (let x = 0; x < 16; x++)
  for (let y = 0; y < 14; y++) {
    if (x > 3 && x < 10 && y > 4 && y < 13) continue;
    if (x < 3 && y > 9) continue;
    polygon(x / 16 + 0.012, y / 14 + 0.013, 0.033, 0.031, "building");
  }
for (const [x, y, w, h] of [
  [0.29, 0.76, 0.08, 0.045],
  [0.45, 0.76, 0.12, 0.05],
  [0.47, 0.59, 0.09, 0.045],
  [0.31, 0.53, 0.1, 0.04],
  [0.51, 0.44, 0.09, 0.04],
  [0.28, 0.86, 0.14, 0.028],
  [0.46, 0.85, 0.12, 0.033],
])
  polygon(x, y, w, h, "academic");
const roads: Feature[] = [];
const road = (coordinates: number[][], major = false) =>
  roads.push({
    type: "Feature",
    properties: { major },
    geometry: {
      type: "LineString",
      coordinates: coordinates.map(([x, y]) => point(x, y)),
    },
  });
road(
  [
    [0.2, 0],
    [0.23, 0.4],
    [0.22, 0.72],
    [0.24, 1],
  ],
  true,
);
road(
  [
    [0, 0.39],
    [0.45, 0.4],
    [1, 0.44],
  ],
  true,
);
road(
  [
    [0.65, 0],
    [0.65, 0.5],
    [0.64, 1],
  ],
  true,
);
road(
  [
    [0, 0.2],
    [0.6, 0.23],
    [1, 0.25],
  ],
  true,
);
road(
  [
    [0, 0.91],
    [1, 0.94],
  ],
  true,
);
for (const y of [0.1, 0.3, 0.55, 0.68, 0.81]) {
  road([
    [0, y],
    [0.21, y],
  ]);
  road([
    [0.66, y],
    [1, y + 0.02],
  ]);
}
for (const x of [0.07, 0.13, 0.79, 0.9])
  road([
    [x, 0],
    [x, 1],
  ]);
road([
  [0.24, 0.48],
  [0.59, 0.48],
  [0.59, 0.83],
  [0.27, 0.83],
  [0.27, 0.48],
]);
road([
  [0.43, 0.41],
  [0.43, 0.9],
]);
road([
  [0.24, 0.7],
  [0.64, 0.7],
]);
const source = (features: Feature[]): GeoJSONSourceSpecification => ({
  type: "geojson",
  data: { type: "FeatureCollection", features },
});
export const offlineProvider: MapProvider = {
  id: "offline-campus",
  name: "HUST FoodMap · Minh họa",
  illustrative: true,
  getStyle: () => ({
    version: 8,
    transition: { duration: 0, delay: 0 },
    sources: { places: source(base), roads: source(roads) },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#18242d" },
      },
      {
        id: "areas",
        type: "fill",
        source: "places",
        paint: {
          "fill-color": [
            "match",
            ["get", "kind"],
            "campus",
            "#24343b",
            "park",
            "#243a36",
            "water",
            "#203c4b",
            "academic",
            "#35434a",
            "#28353e",
          ],
          "fill-outline-color": [
            "match",
            ["get", "kind"],
            "water",
            "#314956",
            "campus",
            "#314249",
            "#334149",
          ],
        },
      },
      {
        id: "road-border",
        type: "line",
        source: "roads",
        paint: {
          "line-color": "#46515b",
          "line-width": ["case", ["get", "major"], 19, 8],
        },
      },
      {
        id: "roads",
        type: "line",
        source: "roads",
        paint: {
          "line-color": "#333f49",
          "line-width": ["case", ["get", "major"], 16, 5],
        },
      },
      {
        id: "center-lines",
        type: "line",
        source: "roads",
        filter: ["==", ["get", "major"], true],
        paint: { "line-color": "#69634f", "line-width": 2 },
      },
    ],
  }),
};
export function getMapProvider(): MapProvider {
  const url =
    process.env.NEXT_PUBLIC_MAP_DARK_STYLE_URL ||
    process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  if (url)
    return { id: "configured-provider", name: "VIETMAP", illustrative: false, getStyle: () => url };
  if (process.env.NEXT_PUBLIC_MAP_OFFLINE === "true") return offlineProvider;
  return {
    id: "openfreemap-dark",
    name: "OpenFreeMap",
    illustrative: false,
    getStyle: () => "https://tiles.openfreemap.org/styles/dark",
  };
}

// Prefer an authorized VIETMAP dark style. This restrained adapter supports a standard vector style too.
export function applyDarkMapTheme(map: import("maplibre-gl").Map) {
  if (getMapProvider().illustrative || process.env.NEXT_PUBLIC_MAP_DARK_STYLE_URL)
    return;
  for (const layer of map.getStyle().layers) {
    const id = layer.id.toLowerCase();
    const water = /water|lake|river/.test(id);
    if (layer.type === "background")
      map.setPaintProperty(layer.id, "background-color", "#18242d");
    if (layer.type === "fill") {
      map.setPaintProperty(
        layer.id,
        "fill-color",
        water
          ? "#152e3c"
          : /park|landuse|green/.test(id)
            ? "#203c36"
            : "#273640",
      );
      if (layer.paint?.["fill-pattern"])
        map.setPaintProperty(layer.id, "fill-pattern", undefined);
      if (layer.paint?.["fill-outline-color"])
        map.setPaintProperty(layer.id, "fill-outline-color", "#344550");
    }
    if (layer.type === "line")
      map.setPaintProperty(
        layer.id,
        "line-color",
        water ? "#2e4a58" : /casing|border/.test(id) ? "#21303a" : "#364751",
      );
    if (layer.type === "symbol" && layer.layout?.["text-field"]) {
      map.setPaintProperty(layer.id, "text-color", "#aebdc7");
      map.setPaintProperty(layer.id, "text-halo-color", "#18242d");
      if (getMapProvider().id === "openfreemap-dark" && !/housenumber|ref|shield/.test(id))
        map.setLayoutProperty(layer.id, "text-field", ["coalesce", ["get", "name:vi"], ["get", "name"], ["get", "name:en"]]);
    }
  }
}
