import type { ImgHTMLAttributes } from "react";
export default function FoodImage({
  src,
  sizes,
  loading = "lazy",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const name =
    typeof src === "string"
      ? src.match(/^\/images\/([\w-]+)\.jpg$/)?.[1]
      : undefined;
  const srcSet = name
    ? [128, 256, 512, 768]
        .map((width) => `/images/optimized/${name}-${width}.webp ${width}w`)
        .join(", ")
    : undefined;
  return (
    <img
      {...props}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      loading={loading}
      decoding="async"
    />
  );
}
