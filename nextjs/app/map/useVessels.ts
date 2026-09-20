"use client";

import { useEffect, useRef, useState } from "react";
import type { Vessel } from "@/types/vessel";

export type FeedEntry = {
  at: number;
  vessels: Vessel[];
};

/**
 * Holds every vessel's latest position, seeded by a one-off fetch
 * and kept current by the WebSocket feed.
 */
export function useVessels() {
  const [vessels, setVessels] = useState<Map<string, Vessel>>(new Map());
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial paint: the socket only carries changes, so a vessel that
  // hasn't moved recently would otherwise never appear.
  useEffect(() => {
    fetch("/api/vessels")
      .then((r) => r.json())
      .then(({ vessels }: { vessels: Vessel[] }) =>
        setVessels(new Map(vessels.map((v) => [v.mmsi, v]))),
      )
      .catch((err) => console.error("initial load failed", err));
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const connect = () => {
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (!msg.vessels) return;

        const incoming = msg.vessels as Vessel[];

        setVessels((prev) => {
          const next = new Map(prev);
          for (const v of incoming) next.set(v.mmsi, v);
          return next;
        });

        // Keep the last 50 batches for the side panel.
        setFeed((prev) => [{ at: Date.now(), vessels: incoming }, ...prev].slice(0, 50));
      };

      ws.onclose = () => {
        setConnected(false);
        if (!stopped) timer = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(timer);
      wsRef.current?.close();
    };
  }, []);

  return { vessels, feed, connected };
}
