import * as Dialog from "@radix-ui/react-dialog";
import Image from "./food-image";
import {
  X,
  Heart,
  Star,
  PersonSimpleWalk,
  Users,
  Clock,
} from "@phosphor-icons/react";
import { compactPrice, type Restaurant } from "@/lib/data";
export function Modal({
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal-content"
          {...(!description ? { "aria-describedby": undefined } : {})}
        >
          <div className="modal-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Đóng">
              <X size={22} />
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="muted">
              {description}
            </Dialog.Description>
          ) : null}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function RestaurantFacts({ restaurant: r }: { restaurant: Restaurant }) {
  return (
    <div className="restaurant-facts">
      <strong className="price">
        {compactPrice(r.price)} - {compactPrice(r.maxPrice)}
      </strong>
      <span>
        <Star size={14} weight="fill" className="star" />
        {r.rating} <small>({r.reviews})</small>
      </span>
      <span>
        <PersonSimpleWalk size={16} />
        {r.walk} phút
      </span>
    </div>
  );
}
export function RestaurantSidebarCard({
  restaurant: r,
  selected,
  saved,
  loading = "lazy",
  totalMinutes,
  onSelect,
  onSave,
  highlight,
  onHover,
}: {
  restaurant: Restaurant;
  selected: boolean;
  saved: boolean;
  loading?: "eager" | "lazy";
  totalMinutes: number;
  onSelect: () => void;
  onSave: () => void;
  highlight: import("@/features/discovery/components/restaurant-markers").SearchResultHighlightState;
  onHover: (id: string | null) => void;
}) {
  return (
    <article
      className={`restaurant-card ${selected ? "is-selected" : ""}`}
      data-restaurant-id={r.id}
      data-highlight={highlight}
      onMouseEnter={() => onHover(r.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(r.id)}
      onBlur={() => onHover(null)}
    >
      <button
        className="card-main"
        onClick={onSelect}
        aria-label={`Xem ${r.name}`}
        aria-pressed={selected}
      >
        <Image
          src={r.image}
          alt={
            r.category === "Đồ uống"
              ? "Ảnh minh họa đồ uống"
              : `Ảnh minh họa ${r.category.toLowerCase()}`
          }
          width={104}
          height={106}
          sizes="104px"
          loading={loading}
          fetchPriority={loading === "eager" ? "high" : "auto"}
        />
        <div className="card-copy">
          <span className="card-category">{r.category}</span>
          <h2>{r.name}</h2>
          <RestaurantFacts restaurant={r} />
          <div className="card-status">
            <span className={r.open ? "open" : "closed-text"}>
              {r.open ? "Đang mở cửa" : "Đã đóng cửa"}
            </span>
            <span className={r.crowd === "Đông" ? "busy" : ""}>
              {r.crowd ? `${r.crowd} (mẫu)` : "Chưa rõ độ đông"}
            </span>
          </div>
        </div>
      </button>
      <button
        className="save-button"
        aria-label={`${saved ? "Bỏ lưu" : "Lưu"} ${r.name}`}
        aria-pressed={saved}
        onClick={onSave}
      >
        <Heart size={18} weight={saved ? "fill" : "regular"} />
      </button>
      <div className="card-footer">
        <span>
          <span className="recommendation-reason">{r.reason}</span>
          <span className="card-meal-time">
            <Clock size={12} />
            {totalMinutes} phút cả bữa (ước tính mẫu)
          </span>
        </span>
        <span>
          <Users size={14} />
          {r.plans} dự định đến
        </span>
      </div>
    </article>
  );
}
