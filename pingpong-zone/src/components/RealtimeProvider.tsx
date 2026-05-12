"use client";

import { useEffect, useRef } from "react";

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/me")
      .then((r) => r.json())
      .then((user) => {
        if (cancelled || !user?.id) return;

        const es = new EventSource("/api/sse");
        esRef.current = es;

        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === "match_confirmed" || data.type === "challenge_received") {
              window.dispatchEvent(new CustomEvent(data.type, { detail: data }));
            }
          } catch {}
        };

        es.onerror = () => {
          es.close();
        };
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
