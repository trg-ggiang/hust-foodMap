import type { Restaurant } from "@hust-foodmap/contracts";
export type { Restaurant } from "@hust-foodmap/contracts";
export const origins = [
  { name: "Cổng Parabol", coordinate: [105.8474, 21.0042] as [number, number] },
  {
    name: "Thư viện Tạ Quang Bửu",
    coordinate: [105.847, 21.0055] as [number, number],
  },
  { name: "Tòa D9", coordinate: [105.849, 21.0055] as [number, number] },
];
export const money = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
export const compactPrice = (amount: number) => `${amount / 1000}k`;
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
export const mealTime = (r: Restaurant, walk = r.walk) =>
  walk * 2 + r.wait + 15 + 5;
