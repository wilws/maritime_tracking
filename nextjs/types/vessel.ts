export type Vessel = {
  mmsi: string;
  shipName: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  heading: number;
  navigationStatus: number;
};

// A history row is a vessel position plus the hour it was sampled in.
export type VesselHistory = Vessel & {
  hourBucket: string; // "2026-09-20T08"
};
