"use client";

import { useCallback, useEffect, useRef, useState } from "react";
export type Coordinate = [number, number];
type LocationState = { status: "loading" | "ready" | "error"; coordinate: Coordinate | null; accuracy: number | null; message: string };

/** Position is held in memory only; never written to URLs or local storage. */
export function useUserLocation() {
  const [state, setState] = useState<LocationState>({ status: "loading", coordinate: null, accuracy: null, message: "Đang lấy vị trí…" });
  const watch = useRef<number | null>(null);
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
  }, []);
  const request = useCallback(() => {
    stop();
    const current = generation.current;
    if (!navigator.geolocation || !window.isSecureContext) {
      setState({ status: "error", coordinate: null, accuracy: null, message: "Cần HTTPS và trình duyệt hỗ trợ định vị." });
      return;
    }
    setState({ status: "loading", coordinate: null, accuracy: null, message: "Đang lấy vị trí…" });
    watch.current = navigator.geolocation.watchPosition(({ coords }) => {
      if (current !== generation.current) return;
      setState({ status: "ready", coordinate: [coords.longitude, coords.latitude], accuracy: coords.accuracy, message: "Vị trí hiện tại của bạn" });
    }, (error) => {
      if (current !== generation.current) return;
      setState({ status: "error", coordinate: null, accuracy: null, message: error.code === 1
        ? "Chưa được cấp quyền. Hãy bật vị trí trong trình duyệt rồi thử lại."
        : error.code === 3 ? "Định vị quá lâu. Hãy thử lại." : "Chưa lấy được vị trí. Hãy kiểm tra định vị thiết bị." });
    }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 });
  }, [stop]);
  useEffect(() => { request(); return stop; }, [request, stop]);
  return { ...state, request };
}
