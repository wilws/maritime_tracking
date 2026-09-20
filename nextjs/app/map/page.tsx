"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useVessels } from "./useVessels";
import type { VesselHistory } from "@/types/vessel";

// MapLibre touches `window` on import, so it must not render on the server.
const VesselMap = dynamic(() => import("./VesselMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#0b1420]" />,
});

const timeOf = (iso: string) => iso.slice(11, 19);

export default function MapPage() {
  const { vessels, feed, connected } = useVessels();
  const [selected, setSelected] = useState<string | null>(null);
  const [track, setTrack] = useState<VesselHistory[]>([]);
  const [loadingTrack, setLoadingTrack] = useState(false);

  const vesselList = useMemo(() => [...vessels.values()], [vessels]);
  const selectedVessel = selected ? vessels.get(selected) : null;

  // Most recently heard from first, so the list reads as activity.
  const roster = useMemo(
    () => [...vesselList].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [vesselList],
  );

  useEffect(() => {
    if (!selected) {
      setTrack([]);
      return;
    }

    let cancelled = false;
    setLoadingTrack(true);

    fetch(`/api/vessels/${selected}/history?days=30`)
      .then((r) => r.json())
      .then(({ history }: { history: VesselHistory[] }) => {
        if (!cancelled) setTrack(history);
      })
      .catch((err) => console.error("history failed", err))
      .finally(() => {
        if (!cancelled) setLoadingTrack(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <div className="flex h-screen w-full bg-[#0b1420] text-slate-200">
      <main className="relative flex-1">
        <VesselMap
          vessels={vesselList}
          selected={selected}
          track={track}
          onSelect={setSelected}
        />

        <header className="pointer-events-none absolute left-14 top-3 z-10 rounded-md bg-[#0b1420]/85 px-4 py-2 backdrop-blur">
          <h1 className="text-sm font-semibold tracking-wide text-sky-300">
            Maritime Tracking
          </h1>
          <p className="text-xs text-slate-400">
            {vesselList.length} vessels · click a dot for its 30-day track
          </p>
        </header>

        {/* Attribution — sits above the map's own OSM credit */}
        <footer className="absolute bottom-3 left-16 z-10 rounded bg-[#0b1420]/85 px-2.5 py-1.5 text-[11px] leading-snug text-slate-400 backdrop-blur">
          <div>© {new Date().getFullYear()} Wilson Wong · Maritime Tracking</div>
          <div className="text-slate-500">Built by Wilson Wong</div>
        </footer>

        {/* Detail card — only while a vessel is selected */}
        {selectedVessel && (
          <section className="absolute right-3 top-3 z-10 w-[260px] rounded-md border border-slate-700/60 bg-[#0b1420]/92 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {selectedVessel.shipName || "UNKNOWN"}
                </p>
                <p className="font-mono text-[11px] text-slate-500">
                  MMSI {selectedVessel.mmsi}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="shrink-0 text-xs text-slate-500 hover:text-slate-300"
              >
                clear
              </button>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <Row label="Speed" value={`${selectedVessel.speed} kn`} />
              <Row label="Course" value={`${selectedVessel.course}°`} />
              <Row
                label="Heading"
                value={
                  selectedVessel.heading < 0 ? "—" : `${selectedVessel.heading}°`
                }
              />
              <Row label="Status" value={String(selectedVessel.navigationStatus)} />
              <Row label="Lat" value={selectedVessel.latitude.toFixed(4)} />
              <Row label="Lon" value={selectedVessel.longitude.toFixed(4)} />
            </dl>

            <p className="mt-3 text-[11px] text-slate-500">
              {loadingTrack
                ? "loading track…"
                : `${track.length} hourly positions over 30 days`}
            </p>
          </section>
        )}
      </main>

      <aside className="flex w-[340px] shrink-0 flex-col border-l border-slate-800 bg-[#0d1a28]">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <span className="text-sm font-semibold text-sky-300">Live feed</span>
          <span
            className={`flex items-center gap-1.5 text-[11px] font-medium ${
              connected ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>

        {/* Live feed — a third of the remaining height */}
        <div className="min-h-0 basis-1/3 overflow-y-auto border-b border-slate-800">
          {feed.length === 0 && (
            <p className="px-4 py-6 text-xs text-slate-600">
              Waiting for broadcast updates…
            </p>
          )}

          {feed.map((entry) => (
            <div
              key={entry.at}
              className="border-b border-slate-800/60 px-4 py-2.5"
            >
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[11px] font-medium text-sky-400">
                  {entry.vessels.length} update
                  {entry.vessels.length === 1 ? "" : "s"}
                </span>
                <span className="font-mono text-[10px] text-slate-600">
                  {new Date(entry.at).toLocaleTimeString()}
                </span>
              </div>

              {entry.vessels.slice(0, 6).map((v) => (
                <button
                  key={`${entry.at}-${v.mmsi}`}
                  onClick={() => setSelected(v.mmsi)}
                  className="flex w-full items-baseline justify-between gap-2 py-0.5 text-left hover:text-sky-300"
                >
                  <span className="truncate text-xs text-slate-300">
                    {v.shipName || v.mmsi}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">
                    {v.speed}kn · {timeOf(v.timestamp)}
                  </span>
                </button>
              ))}

              {entry.vessels.length > 6 && (
                <p className="pt-0.5 text-[10px] text-slate-600">
                  +{entry.vessels.length - 6} more
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Every vessel on record, most recently heard from first */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
          <span className="text-sm font-semibold text-sky-300">Vessels</span>
          <span className="font-mono text-[11px] text-slate-500">
            {roster.length}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {roster.map((v) => (
            <button
              key={v.mmsi}
              onClick={() => setSelected(v.mmsi)}
              className={`flex w-full items-baseline justify-between gap-2 border-b border-slate-800/40 px-4 py-1.5 text-left hover:bg-slate-800/40 ${
                v.mmsi === selected ? "bg-sky-950/60" : ""
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    v.speed > 0.5 ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                <span className="truncate text-xs text-slate-300">
                  {v.shipName || v.mmsi}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[10px] text-slate-500">
                {v.speed}kn · {timeOf(v.timestamp)}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono text-slate-300">{value}</dd>
    </>
  );
}
