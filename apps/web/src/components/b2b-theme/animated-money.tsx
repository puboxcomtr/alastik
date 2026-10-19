"use client";

import { useEffect, useRef, useState } from "react";
import { formatKurus } from "@components/b2b-theme/lib/format";

export function AnimatedMoney({
  kurus,
  duration = 450,
}: {
  kurus: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(kurus);
  const displayRef = useRef(kurus);

  useEffect(() => {
    displayRef.current = display;
  });

  useEffect(() => {
    const from = displayRef.current;
    const to = kurus;
    if (from === to) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else setDisplay(to);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [kurus, duration]);

  return <>{formatKurus(display)}</>;
}
