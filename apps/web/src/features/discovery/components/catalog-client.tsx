"use client";

import { useEffect, useRef, useState } from "react";
import type { Restaurant } from "@hust-foodmap/contracts";
import { FoodMap } from "@/features/discovery/components/food-map";
import { loadRestaurants } from "@/lib/api";
import { CatalogLoading, CatalogStatus } from "./catalog-status";

type CatalogState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; restaurants: Restaurant[] };

export function CatalogClient({
  initialRestaurants,
}: {
  initialRestaurants: Restaurant[] | null;
}) {
  const [state, setState] = useState<CatalogState>(() =>
    initialRestaurants
      ? { status: "ready", restaurants: initialRestaurants }
      : { status: "error" },
  );
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function retry() {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setState({ status: "loading" });
    try {
      const result = await loadRestaurants(controller.signal);
      if (!controller.signal.aborted)
        setState({ status: "ready", restaurants: result.data });
    } catch {
      if (!controller.signal.aborted) setState({ status: "error" });
    }
  }

  if (state.status === "ready")
    return <FoodMap restaurants={state.restaurants} />;
  if (state.status === "loading") return <CatalogLoading />;
  return (
    <CatalogStatus>
      <div role="alert">
        <h1>Chưa tải được danh sách quán</h1>
        <p>Hãy kiểm tra kết nối rồi thử lại.</p>
        <button className="primary-button" onClick={retry}>
          Thử lại
        </button>
      </div>
    </CatalogStatus>
  );
}
