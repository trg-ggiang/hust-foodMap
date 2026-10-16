"use client";

import dynamic from "next/dynamic";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "@/components/food-image";
import {
  IconContext,
  MapPin,
  MagnifyingGlass,
  Heart,
  CalendarBlank,
  ArrowRight,
  SlidersHorizontal,
  Clock,
  PersonSimpleWalk,
  ForkKnife,
  Check,
  X,
  Users,
  NavigationArrow,
  Star,
  Info,
  BowlFood,
  Hamburger,
  Coffee,
  Leaf,
  Wallet,
  Trash,
  GraduationCap,
  BookmarkSimple,
} from "@phosphor-icons/react";
import type { LngLatBounds } from "maplibre-gl";
import { RestaurantSidebarCard, RestaurantFacts, Modal } from "@/components/primitives";
import {
  origins,
  money,
  type Restaurant,
} from "@/lib/data";

import { searchResultHighlightState } from "./restaurant-markers";
const DiscoveryMap = dynamic(() => import("./discovery-map"), { ssr: false });

import { DiscoveryHeader, type DiscoveryView as View } from "./discovery-navigation";
import { useUserLocation } from "../hooks/use-user-location";
import { useDiscoveryQuery } from "../hooks/use-discovery-query";
import { defaultFilters as defaults, type Filters, getWalkingMinutes, getMealMinutes, selectDiscoveryRestaurants, getActiveFilterCount } from "../model/discovery-query";
interface Plan {
  restaurantId: string;
  arrival: string;
  people: number;
  expires: number;
  status: "planned" | "arrived";
}
const categories = [
  { name: "Tất cả", icon: ForkKnife },
  { name: "Cơm", icon: BowlFood },
  { name: "Bún & phở", icon: BowlFood },
  { name: "Ăn nhanh", icon: Hamburger },
  { name: "Ăn chay", icon: Leaf },
  { name: "Đồ uống", icon: Coffee },
];
export function FoodMap({ restaurants }: { restaurants: Restaurant[] }) {
  const location = useUserLocation();
  const [mapReady, setMapReady] = useState(false);
  const { query, setQuery, category, setCategory, view, setView, sort, setSort,
    filters, setFilters, origin, returnOrigin, setReturnOrigin,
    selected, setSelected, state: queryState, navigationVersion } = useDiscoveryQuery(restaurants);
  const [draft, setDraft] = useState<Filters>(defaults),
    [filterOpen, setFilterOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false),
    [planOpen, setPlanOpen] = useState(false),
    [accountOpen, setAccountOpen] = useState(false),
    [infoOpen, setInfoOpen] = useState(false);
  const [saved, setSaved] = useState<string[]>([]),
    [plan, setPlan] = useState<Plan | null>(null),
    [signedIn, setSignedIn] = useState(false),
    [storageReady, setStorageReady] = useState(false);
  const [draftReturnOrigin, setDraftReturnOrigin] = useState(0),
    [bounds, setBounds] = useState<LngLatBounds | null>(null),
    [toast, setToast] = useState("");
  const [dark, setDark] = useState(false),
    [arrival, setArrival] = useState("15"),
    [people, setPeople] = useState(1),
    [planError, setPlanError] = useState("");
  const [reviews, setReviews] = useState<
    Record<string, { rating: number; history: number[] }>
  >({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5500);
  }, []);
  // Give the discovery list, fonts and first thumbnail priority over parsing the map engine.
  // The map is still loaded automatically; its UI remains in a labeled loading state.
  useEffect(() => {
    let disposed = false;
    let idle: number | undefined;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const thumbnail =
      document.querySelector<HTMLImageElement>(".card-main img");
    Promise.all([
      document.fonts.ready,
      thumbnail?.decode().catch(() => undefined),
    ]).then(() => {
      if (disposed) return;
      const mount = () => {
        if (!disposed) setMapReady(true);
      };
      if ("requestIdleCallback" in window)
        idle = window.requestIdleCallback(mount, { timeout: 1000 });
      else fallback = setTimeout(mount, 0);
    });
    return () => {
      disposed = true;
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (fallback) clearTimeout(fallback);
    };
  }, []);
  useEffect(() => {
    try {
      const store = JSON.parse(localStorage.getItem("hust-foodmap:v1") || "{}");
      setSaved(
        Array.isArray(store.saved)
          ? store.saved.filter((id: unknown) => typeof id === "string")
          : [],
      );
      if (
        Number.isFinite(store.plan?.expires) &&
        store.plan?.expires > Date.now() &&
        restaurants.some((r) => r.id === store.plan.restaurantId) &&
        Number.isFinite(Date.parse(store.plan.arrival)) &&
        Number.isInteger(store.plan.people) &&
        store.plan.people >= 1 &&
        store.plan.people <= 10 &&
        ["planned", "arrived"].includes(store.plan.status)
      )
        setPlan(store.plan);
      setSignedIn(store.signedIn === true);
    } catch {}
    setDark(matchMedia("(prefers-color-scheme: dark)").matches);
    setStorageReady(true);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(
        "hust-foodmap:v1",
        JSON.stringify({ saved, plan, signedIn }),
      );
    } catch {
      notify(
        "Không lưu được trên thiết bị này. Thay đổi chỉ giữ trong phiên hiện tại.",
      );
    }
  }, [saved, plan, signedIn, storageReady, notify]);
  useEffect(() => { setBounds(null); }, [query, category, origin, navigationVersion]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !document.querySelector('[role="dialog"]')
      ) {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>('input[name="search"]')
          ?.focus();

      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    if (!plan) return;
    const remaining = plan.expires - Date.now();
    if (remaining <= 0) {
      setPlan(null);
      notify("Kế hoạch mẫu đã hết hạn.");
      return;
    }
    const timer = setTimeout(() => {
      setPlan(null);
      notify("Kế hoạch mẫu đã hết hạn.");
    }, remaining);
    return () => clearTimeout(timer);
  }, [plan, notify]);
  const current = restaurants.find((r) => r.id === selected) ?? null;
  const review = current ? (reviews[current.id]?.rating ?? 0) : 0;
  const reviewHistory = current ? (reviews[current.id]?.history ?? []) : [];
  const originWalk = useCallback((r: Restaurant) => getWalkingMinutes(r, origin, location.coordinate), [origin, location.coordinate]);
  const totalTime = useCallback((r: Restaurant) => getMealMinutes(r, origin, returnOrigin, location.coordinate), [origin, returnOrigin, location.coordinate]);
  const results = useMemo(
    () => selectDiscoveryRestaurants(restaurants, queryState, { savedIds: saved, bounds, position: location.coordinate }),
    [restaurants, queryState, saved, bounds, location.coordinate],
  );
  const mapRestaurants = useMemo(
    () => results.map((r) => ({ ...r, walk: originWalk(r) })),
    [results, originWalk],
  );
  function navigate(nextView: View) {
    setView(nextView);

  }
  function selectRestaurant(id: string) {
    setSelected(id);

  }
  function saveRestaurant(id: string) {
    if (!signedIn) {
      setAccountOpen(true);
      return;
    }
    setSaved((previous) =>
      previous.includes(id)
        ? previous.filter((v) => v !== id)
        : [...previous, id],
    );
    notify(
      saved.includes(id)
        ? "Đã bỏ lưu quán trên thiết bị."
        : "Đã lưu quán mẫu trên thiết bị.",
    );
  }
  function reset() {
    setQuery("");
    setCategory("Tất cả");
    setFilters(defaults);
    setBounds(null);
  }
  function startPlan() {
    if (!signedIn) {
      setAccountOpen(true);
      return;
    }
    setPlanError("");
    setPeople(plan && plan.restaurantId === current?.id ? plan.people : 1);
    setArrival("15");
    setPlanOpen(true);
  }
  function confirmPlan(event: React.FormEvent) {
    event.preventDefault();
    if (!current) return;
    if (!Number.isInteger(people) || people < 1 || people > 10) {
      setPlanError("Chọn từ 1 đến 10 người.");
      return;
    }
    if (!current.open) {
      setPlanError("Quán mẫu đang đóng cửa. Hãy chọn quán đang mở.");
      return;
    }
    if (plan && plan.restaurantId !== current.id) {
      setPlanError(
        "Bạn đang có kế hoạch ở quán khác. Hãy hủy hoặc hoàn thành kế hoạch cũ trước.",
      );
      return;
    }
    const expires = Date.now() + (Number(arrival) + 60) * 60000;
    setPlan({
      restaurantId: current.id,
      arrival: new Date(Date.now() + Number(arrival) * 60000).toISOString(),
      people,
      expires,
      status: plan?.restaurantId === current.id ? plan.status : "planned",
    });
    setPlanOpen(false);
    notify("Đã lưu kế hoạch mẫu trên thiết bị. Chưa gửi tới máy chủ.");
  }
  function cancelPlan() {
    const old = plan;
    setPlan(null);
    notify("Đã hủy kế hoạch mẫu.");
    lastPlan.current = old;
  }
  const lastPlan = useRef<Plan | null>(null);
  const activeCount = getActiveFilterCount(filters) + Number(category !== "Tất cả") + Number(Boolean(bounds));
  const draftCount = selectDiscoveryRestaurants(restaurants, { ...queryState, filters: draft, returnOrigin: draftReturnOrigin }, { savedIds: saved, bounds, position: location.coordinate }).length;
  function clearFilters() {
    setFilters({ ...defaults }); setCategory("Tất cả"); setBounds(null); setSelected(null);
  }
  const plannedRestaurant = restaurants.find(
    (r) => r.id === plan?.restaurantId,
  );
  return (
    <IconContext.Provider
      value={{ size: 20, weight: "regular", "aria-hidden": true }}
    >
      <div className="app-shell">
        <a href="#results" className="skip-link">
          Đến danh sách quán
        </a>
        <DiscoveryHeader view={view} savedCount={saved.length} planCount={plan ? 1 : 0}
          onNavigate={navigate} dark={dark} signedIn={signedIn}
          onTheme={() => setDark(!dark)} onAccount={() => setAccountOpen(true)} />
        <main className="workspace" aria-label="Khám phá quán ăn">
          <aside
            className="discovery-panel"
            aria-label="Tìm và chọn quán ăn"
          >
            <div className="discovery-controls">
            <div className="discovery-intro">
              <div className="eyebrow">QUANH KHUÔN VIÊN HUST</div>
              <h1>
                {view === "saved"
                  ? "Quán ngon đã lưu"
                  : view === "plans"
                    ? "Kế hoạch đi ăn"
                    : "Hôm nay, ăn gì?"}
              </h1>
              <p>
                {view === "explore"
                  ? "Một bữa ngon, vừa túi tiền, kịp giờ lên lớp."
                  : view === "saved"
                    ? "Những lựa chọn bạn muốn quay lại."
                    : "Sắp xếp bữa ăn trước tiết học tiếp theo."}
              </p>
            </div>
            {view !== "plans" ? (
              <>
                <div className="search-box">
                  <MagnifyingGlass size={21} />
                  <input
                    name="search"
                    aria-label="Tìm quán hoặc món ăn"
                    autoComplete="off"
                    placeholder="Tìm quán, món ăn…"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setBounds(null); }}
                  />
                  {query ? (
                    <button
                      className="icon-button"
                      aria-label="Xóa tìm kiếm"
                      onClick={() => setQuery("")}
                    >
                      <X size={18} />
                    </button>
                  ) : null}
                </div>
                <div className="quick-filters">
                  <button className={filters.budget < defaults.budget ? "chip selected" : "chip"}
                    aria-label="Chọn ngân sách" onClick={() => { setDraft(filters); setDraftReturnOrigin(returnOrigin); setFilterOpen(true); }}>
                    <Wallet size={16} />≤ {filters.budget / 1000}k
                  </button>
                  <button
                    className={filters.walk > 0 ? "chip selected" : "chip"}
                    aria-pressed={filters.walk > 0}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        walk: filters.walk > 0 ? 0 : 5,
                      })
                    }
                  >
                    <PersonSimpleWalk size={16} />
                    {filters.walk ? `≤ ${filters.walk} phút` : "Đi bộ"}
                  </button>
                  <button
                    className="chip filter-trigger"
                    aria-label="Mở bộ lọc"
                    onClick={() => {
                      setDraft(filters);
                      setDraftReturnOrigin(returnOrigin);
                      setFilterOpen(true);
                    }}
                  >
                    <SlidersHorizontal size={17} />
                    {activeCount > 0 ? activeCount : "Lọc"}
                  </button>
                  <button
                    className={
                      filters.open
                        ? "chip selected open-chip"
                        : "chip open-chip"
                    }
                    aria-pressed={filters.open}
                    onClick={() =>
                      setFilters({ ...filters, open: !filters.open })
                    }
                  >
                    <span className="status-dot" />
                    Đang mở
                  </button>
                  <button className="chip clear-filters" aria-label="Xóa tất cả bộ lọc" title="Xóa tất cả bộ lọc, giữ từ khóa tìm kiếm" disabled={activeCount === 0} onClick={clearFilters}><Trash size={17} /></button>
                </div>
            <div className="time-budget">
              <span className="time-budget-icon">
                <Clock size={20} />
              </span>
              <div>
                <strong>Bạn có bao nhiêu thời gian?</strong>
                <span>Tính cả đi bộ, chờ món, ăn và quay về</span>
              </div>
              <select
                name="availableTime"
                aria-label="Thời gian dành cho bữa ăn"
                value={filters.available}
                onChange={(e) =>
                  setFilters({ ...filters, available: Number(e.target.value) })
                }
              >
                <option value={0}>Không giới hạn</option>
                <option value={30}>30 phút</option>
                <option value={45}>45 phút</option>
                <option value={60}>60 phút</option>
                <option value={90}>90 phút</option>
              </select>
            </div>
                <div className="category-list" aria-label="Loại món ăn">
                  {categories.map((c) => (
                    <button
                      key={c.name}
                      aria-pressed={category === c.name}
                      className={
                        category === c.name ? "category active" : "category"
                      }
                      onClick={() => { setCategory(c.name); setBounds(null); }}
                    >
                      <c.icon size={17} />
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="results-heading">
                  <div>
                    <strong role="status" aria-live="polite" aria-atomic="true">{results.length} quán phù hợp</strong>
                    <span>{location.coordinate ? "Từ vị trí hiện tại · thời gian ước tính" : "Quanh HUST · chưa có vị trí của bạn"}</span>
                  </div>
                  <select
                    name="sort"
                    aria-label="Sắp xếp quán"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="match">Phù hợp nhất</option>
                    <option value="rating">Đánh giá cao</option>
                    <option value="price">Giá thấp nhất</option>
                    <option value="walk">Gần nhất</option>
                    <option value="fast">Nhanh nhất</option>
                  </select>
                </div>
              </>
            ) : null}
            </div>
            <div className="results-list" id="results" tabIndex={-1}>
              {view === "plans" ? (
                <div className="plan-panel">
                  {plan && plannedRestaurant ? (
                    <>
                      <span className="soft-badge">
                        Kế hoạch mẫu trên thiết bị
                      </span>
                      <h2>{plannedRestaurant.name}</h2>
                      <Image
                        src={plannedRestaurant.image}
                        width={340}
                        height={170}
                        sizes="400px"
                        alt="Ảnh minh họa món ăn"
                      />
                      <p>
                        <Clock size={17} />
                        Dự kiến{" "}
                        {new Intl.DateTimeFormat("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Ho_Chi_Minh",
                        }).format(new Date(plan.arrival))}
                      </p>
                      <p>
                        <Users size={17} />
                        {plan.people} người ·{" "}
                        {plan.status === "arrived" ? "Đã đến" : "Dự định đến"}
                      </p>
                      <button
                        className="primary-button"
                        disabled={plan.status === "arrived"}
                        onClick={() => {
                          setPlan({ ...plan, status: "arrived" });
                          notify("Đã check-in kế hoạch mẫu.");
                        }}
                      >
                        <Check />{" "}
                        {plan.status === "arrived"
                          ? "Đã check-in"
                          : "Check-in tại quán"}
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setSelected(plan.restaurantId);
                          setPeople(plan.people);
                          setArrival("15");
                          setPlanError("");
                          setPlanOpen(true);
                        }}
                      >
                        Chỉnh sửa kế hoạch
                      </button>
                      <button className="text-button" onClick={cancelPlan}>
                        Hủy kế hoạch
                      </button>
                      <p className="helper">
                        Kế hoạch không phải đặt bàn. Số người dự định đến không
                        thể hiện số khách thực tế.
                      </p>
                    </>
                  ) : (
                    <Empty
                      icon={<CalendarBlank size={35} />}
                      title="Chưa có kế hoạch đi ăn"
                      text="Chọn một quán, rồi nhấn “Tôi sẽ đến” để lên kế hoạch mẫu."
                      action={
                        <button
                          className="primary-button"
                          onClick={() => setView("explore")}
                        >
                          Khám phá quán ăn
                          <ArrowRight />
                        </button>
                      }
                    />
                  )}
                </div>
              ) : results.length ? (
                results.map((r, index) => (
                  <RestaurantSidebarCard
                    key={r.id}
                    restaurant={{ ...r, walk: originWalk(r) }}
                    selected={selected === r.id}
                    saved={saved.includes(r.id)}
                    loading={index === 0 ? "eager" : "lazy"}
                    totalMinutes={totalTime(r)}
                    highlight={searchResultHighlightState(
                      r.id,
                      selected,
                      hovered,
                      Boolean(query || category !== "Tất cả" || activeCount),
                    )}
                    onHover={setHovered}
                    onSelect={() => selectRestaurant(r.id)}
                    onSave={() => saveRestaurant(r.id)}
                  />
                ))
              ) : (
                <Empty
                  icon={
                    view === "saved" ? (
                      <BookmarkSimple size={35} />
                    ) : (
                      <MagnifyingGlass size={35} />
                    )
                  }
                  title={
                    view === "saved" && !saved.length
                      ? "Lưu lại quán bạn thích"
                      : "Chưa tìm thấy quán phù hợp"
                  }
                  text={
                    view === "saved" && !saved.length
                      ? "Nhấn biểu tượng trái tim để lưu quán và tìm lại dễ dàng."
                      : "Thử tăng ngân sách, thời gian hoặc chọn loại món khác."
                  }
                  action={
                    <button
                      className="secondary-button"
                      onClick={() => {
                        reset();
                        if (view === "saved") setView("explore");
                      }}
                    >
                      {" "}
                      {view === "saved" ? "Khám phá quán ăn" : "Xóa bộ lọc"}
                    </button>
                  }
                />
              )}
            </div>
            <div className="demo-notice">
              <Info size={16} />
              <span>Dữ liệu mẫu. Chưa kết nối realtime.</span>
              <button
                onClick={() => setInfoOpen(true)}
                aria-label="Thông tin về dữ liệu mẫu"
              >
                Chi tiết
              </button>
            </div>
          </aside>
          <div className="map-workspace">
            {mapReady ? (
              <Suspense
                fallback={
                  <div className="map-region map-loading" role="status">
                    Đang tải bản đồ…
                  </div>
                }
              >
                <DiscoveryMap
                  restaurants={mapRestaurants}
                  selected={selected}
                  userCoordinate={location.coordinate}
                  locationMessage={location.message}
                  onLocate={location.request}
                  onSelect={(id) => {
                    selectRestaurant(id);
                    requestAnimationFrame(() =>
                      document
                        .querySelector(`[data-restaurant-id="${id}"]`)
                        ?.scrollIntoView({
                          block: "nearest",
                          behavior: matchMedia(
                            "(prefers-reduced-motion: reduce)",
                          ).matches
                            ? "instant"
                            : "smooth",
                        }),
                    );
                  }}
                  onBounds={setBounds}
                  onResetBounds={() => setBounds(null)}
                  notify={notify}
                  hovered={hovered}
                  onHover={setHovered}
                  searching={Boolean(
                    query || category !== "Tất cả" || activeCount,
                  )}
                  onDetail={() => setDetailOpen(true)}
                  onClose={() => setSelected(null)}
                />
              </Suspense>
            ) : (
              <div className="map-region map-loading" role="status">
                Đang chuẩn bị bản đồ…
              </div>
            )}


            {!results.some((r) => r.id === selected) ? (
              <div className="map-hint">
                <span className="hint-icon">
                  <MapPin size={23} />
                </span>
                <div>
                  <strong>Một quán ngon đang ở rất gần</strong>
                  <span>Chọn ảnh món ăn trên bản đồ để khám phá quán.</span>
                </div>
              </div>
            ) : null}
          </div>
        </main>
        <Modal
          title="Tìm bữa ăn phù hợp"
          description="Chọn điều kiện phù hợp với ngân sách và lịch học của bạn."
          open={filterOpen}
          onOpenChange={setFilterOpen}
        >
          <form
            className="filter-form"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters(draft);
              setReturnOrigin(draftReturnOrigin);
              setFilterOpen(false);
            }}
          >
            <label>
              Ngân sách tối đa <strong>{money(draft.budget)}</strong>
              <input
                type="range"
                name="budget"
                min={20000}
                max={100000}
                step={5000}
                value={draft.budget}
                onChange={(e) =>
                  setDraft({ ...draft, budget: Number(e.target.value) })
                }
              />
              <span className="range-labels">
                <span>20k</span>
                <span>100k</span>
              </span>
            </label>
            <div className="budget-presets" aria-label="Ngân sách gợi ý">
              {[30000, 50000, 70000, 100000].map(value => <button key={value} type="button" className={draft.budget === value ? "chip selected" : "chip"} aria-pressed={draft.budget === value} onClick={() => setDraft({ ...draft, budget: value })}>≤ {value / 1000}k</button>)}
            </div>
            <div className="form-grid">
              <label>
                Đi bộ tối đa
                <select
                  name="walkingTime"
                  value={draft.walk}
                  onChange={(e) =>
                    setDraft({ ...draft, walk: Number(e.target.value) })
                  }
                >
                  <option value={0}>Không giới hạn</option>
                  <option value={5}>5 phút</option>
                  <option value={10}>10 phút</option>
                  <option value={15}>15 phút</option>
                </select>
              </label>
              <label>
                Thời gian cả bữa
                <select
                  name="mealTime"
                  value={draft.available}
                  onChange={(e) =>
                    setDraft({ ...draft, available: Number(e.target.value) })
                  }
                >
                  {[0, 30, 45, 60, 90].map((n) => (
                    <option value={n} key={n}>
                      {n === 0 ? "Không giới hạn" : `${n} phút`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Điểm đánh giá
                <select
                  name="minimumRating"
                  value={draft.rating}
                  onChange={(e) =>
                    setDraft({ ...draft, rating: Number(e.target.value) })
                  }
                >
                  <option value={0}>Tất cả</option>
                  <option value={4.5}>Từ 4,5 sao</option>
                  <option value={4.7}>Từ 4,7 sao</option>
                </select>
              </label>
              <label>
                Tiện ích
                <select
                  name="amenity"
                  value={draft.amenity}
                  onChange={(e) =>
                    setDraft({ ...draft, amenity: e.target.value })
                  }
                >
                  <option value="">Tất cả</option>
                  {["Điều hòa", "Chỗ để xe", "Mang về"].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Quay về
              <select
                name="returnOrigin"
                value={draftReturnOrigin}
                onChange={(e) => setDraftReturnOrigin(Number(e.target.value))}
              >
                {origins.map((o, i) => (
                  <option key={o.name} value={i}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={draft.open}
                onChange={(e) => setDraft({ ...draft, open: e.target.checked })}
              />
              Chỉ quán đang mở cửa
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={draft.quiet}
                onChange={(e) =>
                  setDraft({ ...draft, quiet: e.target.checked })
                }
              />
              Quán được báo cáo vắng (dữ liệu mẫu)
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => { setDraft({ ...defaults }); setDraftReturnOrigin(0); }}
              >
                Đặt lại
              </button>
              <button className="primary-button" type="submit">
                Xem {draftCount} quán phù hợp
                <Check size={18} />
              </button>
            </div>
          </form>
        </Modal>
        <Modal
          title={current?.name || "Chi tiết quán"}
          description="Thông tin và ảnh minh họa. Chưa xác minh với quán."
          open={detailOpen}
          onOpenChange={setDetailOpen}
        >
          {current ? (
            <div className="restaurant-detail">
              <Image
                className="detail-photo"
                src={current.image}
                width={480}
                height={210}
                sizes="480px"
                alt="Món ăn minh họa"
              />
              <RestaurantFacts
                restaurant={{ ...current, walk: originWalk(current) }}
              />
              <p className="address">
                <MapPin size={17} />
                {current.address}
              </p>
              <div className="detail-status">
                <span className="soft-badge">
                  {current.open ? "Mở cửa (mẫu)" : "Đóng cửa (mẫu)"}
                </span>
                <span>
                  {current.crowd
                    ? `Độ đông: ${current.crowd} (mẫu)`
                    : "Chưa có báo cáo độ đông"}
                </span>
              </div>
              <div className="meal-summary">
                <strong>
                  <Clock size={19} />
                  {totalTime(current)} phút cho cả bữa ăn
                </strong>
                <p>
                  Đi {originWalk(current)}′ + chờ {current.wait}′ + ăn 15′ + về{" "}
                  {current.walk +
                    (returnOrigin === 1 ? 2 : returnOrigin === 2 ? 1 : 0)}
                  ′ + dự phòng 5′
                </p>
                <small>Ước tính minh họa, chưa có dữ liệu định tuyến.</small>
              </div>
              <h3>Thực đơn tham khảo</h3>
              <div className="menu-list">
                {current.menu.map((d) => (
                  <div key={d.name}>
                    <span>{d.name}</span>
                    <strong>{money(d.price)}</strong>
                  </div>
                ))}
              </div>
              <div className="amenities">
                {current.amenities.map((a) => (
                  <span key={a}>
                    <Check size={13} />
                    {a}
                  </span>
                ))}
              </div>
              <h3>
                <Users size={18} />
                {current.plans} người dự định đến (mẫu)
              </h3>
              <p className="helper">
                Số lượt ghi nhận từ ứng dụng, không phải số khách thực tế. Chưa
                có thời điểm cập nhật từ máy chủ.
              </p>
              <h3>Đánh giá của sinh viên</h3>
              <p className="helper">
                Xu hướng 7 / 30 / 90 ngày: Chưa đủ dữ liệu.
              </p>
              <div className="review-rating">
                <span>{review ? "Điểm của bạn (mẫu)" : "Đánh giá thử"}</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    aria-label={`Đánh giá ${n} sao`}
                    aria-pressed={review === n}
                    onClick={() => {
                      if (!signedIn) {
                        setAccountOpen(true);
                        return;
                      }
                      setReviews((previous) => ({
                        ...previous,
                        [current.id]: {
                          rating: n,
                          history: [
                            ...(previous[current.id]?.history ?? []),
                            n,
                          ],
                        },
                      }));
                      notify(
                        "Đã sửa điểm mẫu. Không thêm lượt đánh giá công khai.",
                      );
                    }}
                  >
                    <Star size={22} weight={n <= review ? "fill" : "regular"} />
                  </button>
                ))}
              </div>
              {reviewHistory.length ? (
                <small className="helper">
                  Lịch sử điểm mẫu trong phiên: {reviewHistory.join(" → ")}
                </small>
              ) : null}
              <div className="detail-actions">
                <button
                  className="secondary-button"
                  onClick={() => saveRestaurant(current.id)}
                >
                  <Heart
                    size={18}
                    weight={saved.includes(current.id) ? "fill" : "regular"}
                  />
                  {saved.includes(current.id) ? "Đã lưu" : "Lưu quán"}
                </button>
                <button
                  className="primary-button"
                  disabled={!current.open}
                  onClick={startPlan}
                >
                  Tôi sẽ đến
                  <ArrowRight size={18} />
                </button>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  notify(
                    "Chưa có dịch vụ định tuyến. Bản đồ mẫu không dùng để dẫn đường.",
                  )
                }
              >
                <NavigationArrow size={17} />
                Thông tin chỉ đường
              </button>
            </div>
          ) : null}
        </Modal>
        <Modal
          title="Lên kế hoạch đi ăn"
          description="Kế hoạch thử được lưu trên thiết bị, chưa gửi đến quán hoặc máy chủ."
          open={planOpen}
          onOpenChange={setPlanOpen}
        >
          <form className="plan-form" onSubmit={confirmPlan}>
            <div className="plan-restaurant">
              <ForkKnife size={24} />
              <div>
                <strong>{current?.name}</strong>
                <span>Không phải đặt bàn</span>
              </div>
            </div>
            <label>
              Dự kiến đến sau
              <select
                name="arrival"
                value={arrival}
                onChange={(e) => setArrival(e.target.value)}
              >
                <option value="5">5 phút</option>
                <option value="15">15 phút</option>
                <option value="30">30 phút</option>
                <option value="60">60 phút</option>
              </select>
            </label>
            <label>
              Số người, bao gồm bạn
              <input
                type="number"
                name="partySize"
                inputMode="numeric"
                min={1}
                max={10}
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
                required
              />
            </label>
            {planError ? (
              <p className="form-error" role="alert">
                {planError}
              </p>
            ) : null}
            <p className="helper">
              Chỉ có một kế hoạch hoạt động. Kế hoạch tự hết hạn sau 60 phút kể
              từ giờ dự kiến đến.
            </p>
            <button type="submit" className="primary-button">
              {plan?.restaurantId === current?.id
                ? "Cập nhật kế hoạch mẫu"
                : "Xác nhận kế hoạch mẫu"}
              <Check size={18} />
            </button>
          </form>
        </Modal>
        <Modal
          title={
            signedIn
              ? "Tài khoản thử nghiệm"
              : "Lưu quán, lên kế hoạch cùng bạn"
          }
          description="Khám phá không cần tài khoản. Phiên thử nghiệm chỉ lưu dữ liệu trên thiết bị này."
          open={accountOpen}
          onOpenChange={setAccountOpen}
        >
          <div className="account-content">
            <span className="account-illustration">
              <GraduationCap size={45} />
            </span>
            <h3>
              {signedIn
                ? "Chào bạn, sinh viên Bách khoa!"
                : "Bữa trưa tiếp theo, dễ chọn hơn."}
            </h3>
            <p>
              Đăng nhập thật sẽ được mở khi kết nối dịch vụ xác thực. Bạn có thể
              trải nghiệm bằng phiên thử nghiệm.
            </p>
            <button
              className="primary-button"
              onClick={() => {
                setSignedIn(!signedIn);
                setAccountOpen(false);
                notify(
                  signedIn
                    ? "Đã thoát phiên thử nghiệm."
                    : "Đã bật phiên thử nghiệm trên thiết bị.",
                );
              }}
            >
              {signedIn ? "Thoát phiên thử nghiệm" : "Bắt đầu phiên thử nghiệm"}
              <ArrowRight size={18} />
            </button>
          </div>
        </Modal>
        <Modal
          title="Về dữ liệu trên FoodMap"
          description="Giao diện frontend với dữ liệu minh họa được gắn nhãn rõ ràng."
          open={infoOpen}
          onOpenChange={setInfoOpen}
        >
          <div className="info-content">
            <p>
              Tên quán, địa chỉ, thực đơn, giá, số sao, thời gian và báo cáo độ
              đông đều là dữ liệu mẫu. Ảnh chỉ minh họa món ăn.
            </p>
            <p>
              Bản đồ ngoại tuyến minh họa khu vực Bách khoa. Cần cấu hình nhà
              cung cấp bản đồ và dịch vụ định tuyến trước khi sử dụng thực tế.
            </p>
            <p>
              Danh sách quán được tải từ API dữ liệu mẫu. Chưa kết nối
              WebSocket. Các lượt dự định đến không được mô phỏng như cập nhật
              realtime. Lưu quán và kế hoạch thử chỉ nằm trên thiết bị của bạn.
            </p>
          </div>
        </Modal>
        <div
          className={`toast ${toast ? "visible" : ""}`}
          role="status"
          aria-live="polite"
        >
          {toast ? (
            <>
              <Info size={19} />
              <span>{toast}</span>
              {toast === "Đã hủy kế hoạch mẫu." ? (
                <button
                  onClick={() => {
                    if (lastPlan.current) {
                      setPlan(lastPlan.current);
                      notify("Đã khôi phục kế hoạch mẫu.");
                    }
                  }}
                >
                  Hoàn tác
                </button>
              ) : null}
              <button aria-label="Đóng thông báo" onClick={() => setToast("")}>
                <X size={17} />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </IconContext.Provider>
  );
}
function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
