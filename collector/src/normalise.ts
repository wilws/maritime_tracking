import type { AisStreamMessage, VesselPosition } from "./types.js";

/** AIS sentinel: 511 in TrueHeading means "no heading data available". */
const HEADING_UNAVAILABLE = 511;

/** Our own marker for unknown heading. Distinguishable from a real 0°. */
export const HEADING_UNKNOWN = -1;

/**
 * AISStream sends Go's time format:
 *   "2026-09-16 21:58:38.019781712 +0000 UTC"
 * `new Date()` cannot parse that — the space separator, nanosecond precision
 * and trailing "UTC" all defeat it. Reshape into something ISO-ish first.
 */
export function parseAisTime(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();

  const cleaned = raw
    .replace(" +0000 UTC", "Z") // drop Go's zone suffix
    .replace(" ", "T") // date/time separator
    .replace(/(\.\d{3})\d+Z$/, "$1Z"); // ns -> ms, JS can't hold more

  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

/**
 * AISStream shape -> our contract.
 * Returns null for anything that isn't a usable position report, so the
 * caller can simply skip it.
 */
export function normalise(raw: AisStreamMessage): VesselPosition | null {
  if (raw.MessageType !== "PositionReport") return null;

  const report = raw.Message?.PositionReport;
  const meta = raw.MetaData;
  if (!report || !meta) return null;

  // The AIS payload itself can declare a report invalid.
  if (report.Valid === false) return null;

  // Without a position there is nothing to track.
  if (typeof report.Latitude !== "number" || typeof report.Longitude !== "number") {
    return null;
  }

  // MMSI must be a string: leading zeros are meaningful and JS numbers eat them.
  const mmsi = meta.MMSI_String != null ? String(meta.MMSI_String) : String(meta.MMSI ?? "");
  if (!mmsi) return null;

  const heading =
    report.TrueHeading === HEADING_UNAVAILABLE || report.TrueHeading == null
      ? HEADING_UNKNOWN
      : report.TrueHeading;

  return {
    eventType: "VESSEL_POSITION",
    mmsi,
    // AIS pads names to 20 chars with spaces.
    shipName: (meta.ShipName ?? "").trim() || "UNKNOWN",
    timestamp: parseAisTime(meta.time_utc),
    latitude: report.Latitude,
    longitude: report.Longitude,
    speed: report.Sog ?? 0,
    course: report.Cog ?? 0,
    heading,
    navigationStatus: report.NavigationalStatus ?? 15, // 15 = "undefined" in AIS
  };
}

/** AIS navigational status codes, for human-readable output. */
const NAV_STATUS: Record<number, string> = {
  0: "under way (engine)",
  1: "at anchor",
  2: "not under command",
  3: "restricted manoeuvrability",
  4: "constrained by draught",
  5: "moored",
  6: "aground",
  7: "fishing",
  8: "under way (sailing)",
  15: "undefined",
};

export function navStatusLabel(code: number): string {
  return NAV_STATUS[code] ?? `status ${code}`;
}
