export interface Restaurant {
  id: string;
  name: string;
  category: string;
  /** All food groups served; category remains the primary display label. */
  categories?: string[];
  address: string;
  price: number;
  maxPrice: number;
  rating: number;
  reviews: number;
  walk: number;
  wait: number;
  open: boolean;
  crowd: "Vắng" | "Vừa" | "Đông" | null;
  plans: number;
  coordinate: [number, number];
  image: string;
  reason: string;
  amenities: string[];
  menu: { name: string; price: number }[];
}
export interface DataEnvelope<T> {
  data: T;
  source: "verified" | "unverified" | "sample";
  updatedAt: string | null;
}
export interface RestaurantQuery {
  text: string;
  budget: number;
  walkingMinutes: number;
  mealMinutes: number;
  openOnly: boolean;
  origin: [number, number];
  returnTo: [number, number];
}
export type VisitStatus =
  "planned" | "travelling" | "arrived" | "left" | "cancelled" | "expired";
export interface VisitPlan {
  id: string;
  restaurantId: string;
  arrivalAt: string;
  partySize: number;
  expiresAt: string;
  status: VisitStatus;
  version: number;
}
export type RealtimeEvent =
  | {
      type: "visit-count.updated";
      restaurantId: string;
      expectedVisitors: number;
      windowStart: string;
      windowEnd: string;
      updatedAt: string;
      version: number;
    }
  | {
      type: "crowd-report.updated";
      restaurantId: string;
      level: "quiet" | "moderate" | "busy" | null;
      updatedAt: string;
      sampleCount: number;
    };
export interface FoodMapService {
  search(
    query: RestaurantQuery,
    signal: AbortSignal,
  ): Promise<DataEnvelope<Restaurant[]>>;
  createVisit(input: {
    restaurantId: string;
    arrivalAt: string;
    partySize: number;
    idempotencyKey: string;
  }): Promise<VisitPlan>;
  updateVisit(
    id: string,
    input: Partial<Pick<VisitPlan, "arrivalAt" | "partySize" | "status">>,
    expectedVersion: number,
  ): Promise<VisitPlan>;
  setRating(
    restaurantId: string,
    stars: number,
  ): Promise<{ currentRating: number; historyId: string }>;
  subscribe(onEvent: (event: RealtimeEvent) => void): () => void;
}
