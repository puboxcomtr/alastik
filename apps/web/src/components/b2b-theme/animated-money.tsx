"use client";

// Para değeri değişince eski değerden yeni değere sayarak (artıp azalarak)
// geçiş yapar. Sepette adet değişince fiyatlar yumuşak animasyonla güncellenir.
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

  // Her render'da güncel gösterilen değeri sakla (animasyon kesilirse buradan devam)
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
      const eased = 1 - Math.pow(1 - t, 3); // ease-out
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else setDisplay(to);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [kurus, duration]);

  return <>{formatKurus(display)}</>;
}
