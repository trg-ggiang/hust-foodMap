import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MapRestaurantMarker,
  ActiveMapRestaurantMarker,
  searchResultHighlightState,
} from "./restaurant-markers";
import {
  Map as LibreMap,
  Marker,
  setWorkerUrl,
  type LngLatBounds,
  type GeoJSONSource,
} from "maplibre-gl";
import {
  Plus,
  Minus,
  Crosshair,
  Stack,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { applyDarkMapTheme, getMapProvider } from "@/lib/map-provider";
import { type Restaurant } from "@/lib/data";

interface Props {
  restaurants: Restaurant[];
  selected: string | null;
  userCoordinate: [number, number] | null;
  onLocate: () => void;
  locationMessage: string;
  onSelect: (id: string) => void;
  onBounds: (bounds: LngLatBounds) => void;
  onResetBounds: () => void;
  notify: (message: string) => void;
  hovered: string | null;
  searching: boolean;
  onHover: (id: string | null) => void;
  onDetail: () => void;
  onClose: () => void;
}
const labels = [
  {
    text: "ĐẠI HỌC BÁCH KHOA HÀ NỘI",
    at: [105.8477, 21.0073],
    kind: "campus-label",
  },
  {
    text: "Thư viện Tạ Quang Bửu",
    at: [105.847, 21.0057],
    kind: "building-label",
  },
  { text: "D9", at: [105.849, 21.0055], kind: "building-label" },
  { text: "C1", at: [105.846, 21.008], kind: "building-label" },
  { text: "Hồ Tiền", at: [105.8471, 21.0067], kind: "water-label" },
  { text: "Công viên Thống Nhất", at: [105.8436, 21.0081], kind: "park-label" },
  { text: "Tạ Quang Bửu", at: [105.8446, 21.0032], kind: "street-label" },
  {
    text: "Trần Đại Nghĩa",
    at: [105.8505, 21.0081],
    kind: "street-label vertical",
  },
  { text: "Lê Thanh Nghị", at: [105.853, 21.0016], kind: "street-label" },
  {
    text: "Giải Phóng",
    at: [105.8448, 21.0059],
    kind: "street-label vertical",
  },
  { text: "BÁCH KHOA", at: [105.8527, 21.006], kind: "district-label" },
];
export default function DiscoveryMap({
  restaurants,
  selected,
  userCoordinate,
  onLocate,
  locationMessage,
  onSelect,
  onBounds,
  onResetBounds,
  notify,
  hovered,
  searching,
  onHover,
  onDetail,
  onClose,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<LibreMap | null>(null),
    loadedMap = useRef<LibreMap | null>(null),
    markers = useRef(
      new globalThis.Map<
        string,
        {
          marker: Marker;
          element: HTMLDivElement;
          id?: string;
          count?: number;
          clusterId?: number;
          coordinate: [number, number];
        }
      >(),
    ),
    originMarker = useRef<Marker | null>(null);
  const selectRef = useRef(onSelect),
    boundsRef = useRef(onBounds);
  selectRef.current = onSelect;
  boundsRef.current = onBounds;
  const [viewportKey, setViewportKey] = useState("");
  const [pins, setPins] = useState<
    Array<{
      key: string;
      element: HTMLDivElement;
      id?: string;
      count?: number;
      clusterId?: number;
      coordinate: [number, number];
    }>
  >([]);
  const restaurantById = useMemo(
    () => new globalThis.Map(restaurants.map((r) => [r.id, r])),
    [restaurants],
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
      "loading",
    ),
    [moved, setMoved] = useState(false),
    [layer, setLayer] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    const provider = getMapProvider();
    let m: LibreMap;
    setStatus("loading");
    setWorkerUrl("/maplibre-gl-worker.mjs");
    try {
      m = new LibreMap({
        container: container.current,
        style: provider.getStyle(),
        center: [105.8482, 21.0052],
        zoom: 15.9,
        minZoom: provider.illustrative ? 13 : 3,
        maxZoom: 18,
        attributionControl: provider.illustrative ? false : { compact: false },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      setStatus("error");
      return;
    }
    map.current = m;
    m.on("load", () => {
      applyDarkMapTheme(m);
      loadedMap.current = m;
      setStatus("ready");
      if (provider.illustrative)
        labels.forEach((l) => {
          const el = document.createElement("div");
          el.className = `map-label ${l.kind}`;
          el.textContent = l.text;
          new Marker({ element: el })
            .setLngLat(l.at as [number, number])
            .addTo(m);
        });
    });
    let hasLoaded = false;
    m.on("load", () => { hasLoaded = true; });
    m.on("error", () => {
      // Individual tile failures must not disable an already usable map.
      if (!hasLoaded) setStatus("error");
    });
    m.on("moveend", (event) => {
      if (event.originalEvent) setMoved(true);
    });
    const observer = new ResizeObserver(() => {
      m.resize();
      setViewportKey(`${container.current?.clientWidth}:${container.current?.clientHeight}`);
    });
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      m.remove();
      markers.current.clear();
      map.current = null;
      loadedMap.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    // Fast Refresh can preserve "ready" while replacing the map instance.
    // Only attach data to the instance whose own load event has completed.
    if (!m || status !== "ready" || loadedMap.current !== m) return;
    const data = {
      type: "FeatureCollection" as const,
      features: restaurants.map((r) => ({
        type: "Feature" as const,
        properties: { id: r.id },
        geometry: { type: "Point" as const, coordinates: r.coordinate },
      })),
    };
    const source = m.getSource("foodmap-restaurants") as
      GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      m.addSource("foodmap-restaurants", {
        type: "geojson",
        data,
        cluster: true,
        clusterRadius: 85,
        clusterMaxZoom: 14,
      });
      m.addLayer({
        id: "foodmap-points",
        type: "circle",
        source: "foodmap-restaurants",
        paint: { "circle-radius": 1, "circle-opacity": 0 },
      });
    }
    const reconcile = () => {
      if (!m.isSourceLoaded("foodmap-restaurants")) return;
      const wanted = new globalThis.Map<
        string,
        {
          id?: string;
          count?: number;
          clusterId?: number;
          coordinate: [number, number];
        }
      >();
      const eligible = new Set(restaurants.map((r) => r.id));
      for (const f of m.querySourceFeatures("foodmap-restaurants")) {
        if (f.geometry.type !== "Point") continue;
        const coordinate = f.geometry.coordinates as [number, number];
        if (!m.getBounds().contains(coordinate)) continue;
        const props = f.properties;
        if (props.cluster)
          wanted.set(`cluster-${props.cluster_id}`, {
            count: props.point_count,
            clusterId: props.cluster_id,
            coordinate,
          });
        else if (eligible.has(props.id))
          wanted.set(props.id, { id: props.id, coordinate });
      }
      for (const [key, entry] of markers.current) {
        if (!wanted.has(key)) {
          entry.marker.remove();
          markers.current.delete(key);
        }
      }
      for (const [key, entry] of wanted) {
        const existing = markers.current.get(key);
        if (existing) {
          existing.marker.setLngLat(entry.coordinate);
          Object.assign(existing, entry);
        } else {
          const element = document.createElement("div");
          element.className = "food-marker-host";
          const marker = new Marker({ element, anchor: "bottom" })
            .setLngLat(entry.coordinate)
            .addTo(m);
          markers.current.set(key, { ...entry, marker, element });
        }
      }
      setPins(
        Array.from(markers.current, ([key, entry]) => ({ key, ...entry })),
      );
    };
    m.on("idle", reconcile);
    m.on("moveend", reconcile);
    reconcile();
    return () => {
      m.off("idle", reconcile);
      m.off("moveend", reconcile);
    };
  }, [restaurants, status]);
  useEffect(() => {
    for (const [key, entry] of markers.current)
      entry.element.style.zIndex =
        key === selected ? "20" : key === hovered ? "15" : "5";
  }, [selected, hovered, pins]);
  useEffect(() => {
    const r = restaurants.find((r) => r.id === selected);
    const m = map.current;
    if (r && m && status === "ready") {
      setMoved(false);
      m.easeTo({
        center: r.coordinate,
        zoom: Math.max(m.getZoom(), 15.9),
        offset: [0, 110],
        duration: 0,
      });
    }
  }, [selected, status, viewportKey]);
  useEffect(() => {
    if (!map.current || status !== "ready") return;
    originMarker.current?.remove();
    if (!userCoordinate) return;
    const el = document.createElement("div");
    el.className = "origin-marker";
    el.setAttribute("role", "img");
    el.innerHTML = "<span></span>";
    el.setAttribute("aria-label", "Điểm xuất phát: Vị trí hiện tại của bạn");
    originMarker.current = new Marker({ element: el })
      .setLngLat(userCoordinate)
      .addTo(map.current);
  }, [userCoordinate, status]);
  function locate() {
    if (!userCoordinate) { onLocate(); return; }
    map.current?.easeTo({ center: userCoordinate, zoom: 16, duration: 0 });
  }
  return (
    <section className="map-region" aria-label="Bản đồ quán ăn quanh Bách khoa">
      <div ref={container} className="map-canvas" />
      {pins.map((pin) =>
        createPortal(
          pin.id ? (
            (() => {
              const r = restaurantById.get(pin.id);
              if (!r) return null;
              return selected === r.id ? (
                <ActiveMapRestaurantMarker
                  restaurant={r}
                  onDetail={onDetail}
                  onClose={onClose}
                />
              ) : (
                <MapRestaurantMarker
                  restaurant={r}
                  highlight={searchResultHighlightState(
                    r.id,
                    selected,
                    hovered,
                    searching,
                  )}
                  onSelect={() => selectRef.current(r.id)}
                  onHover={onHover}
                />
              );
            })()
          ) : (
            <button
              className="food-cluster"
              aria-label={`Phóng to nhóm ${pin.count} quán`}
              onClick={async () => {
                const source = map.current?.getSource("foodmap-restaurants") as
                  GeoJSONSource | undefined;
                if (!source || pin.clusterId === undefined) return;
                const zoom = await source.getClusterExpansionZoom(
                  pin.clusterId,
                );
                map.current?.easeTo({
                  center: pin.coordinate,
                  zoom,
                  duration: 0,
                });
              }}
            >
              <span className="cluster-photos">
                <img src="/images/rice.jpg" alt="" width="36" height="36" />
                <img src="/images/noodles.jpg" alt="" width="36" height="36" />
              </span>
              <strong>{pin.count} quán</strong>
              <span>Phóng to để khám phá</span>
            </button>
          ),
          pin.element,
          pin.key,
        ),
      )}
      {status === "loading" ? (
        <div className="map-loading" role="status">
          Đang tải bản đồ…
        </div>
      ) : null}
      {status === "error" ? (
        <div className="map-error" role="alert">
          <strong>Không tải được bản đồ</strong>
          <p>Bạn vẫn có thể tìm và chọn quán trong danh sách.</p>
          <button onClick={() => location.reload()}>
            <ArrowClockwise />
            Thử tải lại
          </button>
        </div>
      ) : null}
      <div className="map-topline">
        <span className="area-badge">
          <span className="area-dot" />
          Khu vực Bách khoa, Hà Nội
        </span>
        <span className="map-mode">
          {getMapProvider().illustrative
            ? "Bản đồ minh họa"
            : "Bản đồ đường phố"}
        </span>
      </div>
      {moved ? (
        <button
          className="search-area"
          onClick={() => {
            if (map.current) boundsRef.current(map.current.getBounds());
            setMoved(false);
          }}
        >
          <ArrowClockwise size={16} />
          Tìm trong khu vực này
        </button>
      ) : null}
      <div className="map-controls">
        <div className="zoom-group">
          <button
            aria-label="Phóng to bản đồ"
            onClick={() => {
              map.current?.zoomIn({ duration: 0 });
              setMoved(true);
            }}
          >
            <Plus />
          </button>
          <button
            aria-label="Thu nhỏ bản đồ"
            onClick={() => {
              map.current?.zoomOut({ duration: 0 });
              setMoved(true);
            }}
          >
            <Minus />
          </button>
        </div>
        <button aria-label="Vị trí của bạn" title={locationMessage} onClick={locate}>
          <Crosshair />
        </button>
        <button
          aria-label="Về khu vực Bách khoa"
          onClick={() => {
            onResetBounds();
            setMoved(false);
            map.current?.jumpTo({ center: [105.8482, 21.0052], zoom: 15.9 });
          }}
        >
          <ArrowClockwise />
        </button>
        <button
          aria-label="Thông tin lớp bản đồ"
          aria-expanded={layer}
          onClick={() => setLayer(!layer)}
        >
          <Stack />
        </button>
      </div>
      {layer ? (
        <div className="layer-info">
          <strong>Bản đồ khu vực HUST</strong>
          <p>
            {getMapProvider().illustrative
              ? "Bản đồ minh họa ngoại tuyến. Vị trí quán là dữ liệu mẫu, không dùng để dẫn đường."
              : "Bản đồ đường phố. Vị trí quán và thời gian đi bộ là dữ liệu mẫu."}
          </p>
        </div>
      ) : null}
      <div className="map-legend">
        <span className="legend-price">30k</span> Giá từ{" "}
        <span className="legend-origin" /> Điểm xuất phát
      </div>
      {getMapProvider().illustrative ? (
        <div className="map-attribution">MapLibre | {getMapProvider().name}</div>
      ) : null}
    </section>
  );
}

