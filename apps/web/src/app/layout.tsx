import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/600.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./food-map.css";

export const metadata: Metadata = {
  title: "HUST FoodMap | Ăn ngon, gần Bách khoa",
  description:
    "Tìm quán ăn quanh Bách khoa theo ngân sách và thời gian của bạn.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#18242d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
