"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Vessel, VesselHistory } from "@/types/vessel";

const VESSEL_SOURCE = "vessels";
const TRACK_SOURCE = "track";

// Free raster basemap — no API key. Swap for vector tiles if you want labels
// that rotate with the map.
const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0b1420" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      // Slightly muted so the vessel dots carry the eye.
      paint: { "raster-brightness-max": 0.8, "raster-saturation": -0.3 },
    },
  ],
};

const toFeatureCollection = (
  vessels: Vessel[],
): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
  type: "FeatureCollection",
  features: vessels.map((v) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
    properties: {
      mmsi: v.mmsi,
      shipName: v.shipName,
      speed: v.speed,
      moving: v.speed > 0.5 ? 1 : 0,
    },
  })),
});

type Props = {
  vessels: Vessel[];
  selected: string | null;
  track: VesselHistory[];
  onSelect: (mmsi: string) => void;
};

export default function VesselMap({ vessels, selected, track, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Latest positions, readable from the map's load handler. StrictMode mounts
  // effects twice in dev, so data can arrive against a map that is then torn
  // down — the load handler reads this instead of relying on effect ordering.
  const vesselsRef = useRef<Vessel[]>(vessels);
  vesselsRef.current = vessels;

  const [ready, setReady] = useState(0);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [114.1, 22.3], // Hong Kong — middle of the tracked region
      zoom: 4,
      attributionControl: { compact: true },
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-left");

    map.on("load", () => {
      map.addSource(VESSEL_SOURCE, {
        type: "geojson",
        data: toFeatureCollection([]),
      });

      map.addSource(TRACK_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Track sits under the dots so vessels stay clickable.
      map.addLayer({
        id: "track-line",
        type: "line",
        source: TRACK_SOURCE,
        paint: {
          "line-color": "#38bdf8",
          "line-width": 2,
          "line-opacity": 0.85,
        },
      });

      // Soft halo — blurred and faint, gives the dot a glow.
      map.addLayer({
        id: "vessel-glow",
        type: "circle",
        source: VESSEL_SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 10, 10, 18],
          "circle-color": [
            "case",
            ["==", ["get", "moving"], 1],
            "#4ade80",
            "#fb7185",
          ],
          "circle-opacity": 0.22,
          "circle-blur": 1,
        },
      });

      // Solid core — small and crisp, so the position stays readable and clickable.
      map.addLayer({
        id: "vessel-dots",
        type: "circle",
        source: VESSEL_SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.5, 10, 4.5],
          "circle-color": [
            "case",
            ["==", ["get", "moving"], 1],
            "#4ade80", // under way
            "#fb7185", // stopped or anchored
          ],
          "circle-opacity": 0.75,
        },
      });

      // Highlight ring for the selected vessel.
      map.addLayer({
        id: "vessel-selected",
        type: "circle",
        source: VESSEL_SOURCE,
        filter: ["==", ["get", "mmsi"], ""],
        paint: {
          "circle-radius": 12,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#0ea5e9",
        },
      });

      map.on("click", "vessel-dots", (e: maplibregl.MapLayerMouseEvent) => {
        const mmsi = e.features?.[0]?.properties?.mmsi;
        if (mmsi) onSelectRef.current(String(mmsi));
      });

      map.on("mouseenter", "vessel-dots", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "vessel-dots", () => {
        map.getCanvas().style.cursor = "";
      });

      // Paint whatever has already arrived, then let the effects take over.
      const source = map.getSource(VESSEL_SOURCE) as maplibregl.GeoJSONSource;
      source.setData(toFeatureCollection(vesselsRef.current));

      setReady((n) => n + 1);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Push new positions into the existing source rather than re-rendering markers.
  // Positions can arrive before the style finishes loading, so wait for it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(VESSEL_SOURCE) as
      | maplibregl.GeoJSONSource
      | undefined;

    source?.setData(toFeatureCollection(vessels));
  }, [vessels, ready]);

  // Selection ring.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("vessel-selected")) return;

    map.setFilter("vessel-selected", ["==", ["get", "mmsi"], selected ?? ""]);
  }, [selected, ready]);

  // Draw the track and frame it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(TRACK_SOURCE) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;

    if (track.length === 0) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const coordinates = track.map(
      (p) => [p.longitude, p.latitude] as [number, number],
    );

    source.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates },
          properties: {},
        },
      ],
    });

    // Fit the whole journey, but don't zoom past street level for a
    // vessel that never left port.
    const bounds = coordinates.reduce(
      (b, c) => b.extend(c),
      new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    );

    map.fitBounds(bounds, { padding: 80, maxZoom: 11, duration: 900 });
  }, [track, ready]);

  return <div ref={containerRef} className="h-full w-full" />;
}
