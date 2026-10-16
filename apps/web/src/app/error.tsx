"use client";

import { CatalogStatus } from "@/features/discovery/components/catalog-status";

export default function DiscoveryError({ reset }: { reset: () => void }) {
  return (
    <CatalogStatus>
      <div role="alert">
        <h1>Chưa mở được bản đồ quán ăn</h1>
        <p>Vui lòng tải lại để tiếp tục khám phá.</p>
        <button className="primary-button" onClick={reset}>
          Tải lại
        </button>
      </div>
    </CatalogStatus>
  );
}
