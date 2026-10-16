import Image from "@/components/food-image";
import { Star, PersonSimpleWalk, X, ArrowRight } from "@phosphor-icons/react";
import { compactPrice, type Restaurant } from "@/lib/data";

export type SearchResultHighlightState =
  "idle" | "match" | "hover" | "selected";
export function searchResultHighlightState(
  id: string,
  selected: string | null,
  hovered: string | null,
  searching: boolean,
): SearchResultHighlightState {
  return id === selected
    ? "selected"
    : id === hovered
      ? "hover"
      : searching
        ? "match"
        : "idle";
}
interface MarkerProps {
  restaurant: Restaurant;
  highlight: SearchResultHighlightState;
  onSelect: () => void;
  onHover: (id: string | null) => void;
}
export function MapRestaurantMarker({
  restaurant: r,
  highlight,
  onSelect,
  onHover,
}: MarkerProps) {
  return (
    <button
      className="food-pin"
      data-highlight={highlight}
      data-food-pin={r.id}
      aria-label={`${r.name}, giá từ ${compactPrice(r.price)}, ${r.rating} sao`}
      aria-pressed={false}
      onClick={onSelect}
      onMouseEnter={() => onHover(r.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(r.id)}
      onBlur={() => onHover(null)}
    >
      <span className="pin-thumbnail">
        <Image src={r.image} alt="" width={112} height={76} sizes="112px" />
      </span>
      <span className="food-pin-name">{r.name}</span>
      <span className="food-pin-facts">
        <strong>Từ {compactPrice(r.price)}</strong>
        <span>
          <Star size={11} weight="fill" />
          {r.rating}
        </span>
      </span>
    </button>
  );
}
export function ActiveMapRestaurantMarker({
  restaurant: r,
  onDetail,
  onClose,
}: {
  restaurant: Restaurant;
  onDetail: () => void;
  onClose: () => void;
}) {
  return (
    <article
      className="active-food-pin"
      data-food-pin={r.id}
      data-highlight="selected"
      aria-label={`Quán đang chọn: ${r.name}`}
    >
      <span className="pin-thumbnail">
        <Image
          src={r.image}
          alt={`Ảnh minh họa ${r.category.toLowerCase()}`}
          width={260}
          height={120}
          sizes="260px"
        />
      </span>
      <button
        className="active-pin-close"
        onClick={onClose}
        aria-label="Bỏ chọn quán"
      >
        <X size={16} />
      </button>
      <div className="active-pin-copy">
        <span className="active-pin-category">
          {r.category} · {r.open ? "Đang mở cửa" : "Đã đóng cửa"}
        </span>
        <h2>{r.name}</h2>
        <div className="active-pin-facts">
          <strong>Từ {compactPrice(r.price)}</strong>
          <span>
            <Star size={14} weight="fill" />
            {r.rating}
          </span>
          <span>
            <PersonSimpleWalk size={16} />
            {r.walk} phút
          </span>
        </div>
        <button className="active-pin-detail" onClick={onDetail}>
          Xem chi tiết <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}
