import type { ReactNode } from "react";

export function CatalogStatus({ children }: { children: ReactNode }) {
  return (
    <main className="api-status">
      <a className="brand" href="/">
        HUST FoodMap
      </a>
      {children}
    </main>
  );
}

export function CatalogLoading() {
  return (
    <CatalogStatus>
      <p role="status">Đang tìm những quán ngon quanh Bách khoa…</p>
    </CatalogStatus>
  );
}
