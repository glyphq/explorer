"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const Dither = dynamic(() => import("@/components/Dither"), {
  ssr: false,
});

export function ReactBitsDither() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const reduceMotion = useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      rootMargin: "160px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-25">
      <Dither
        colorNum={10}
        disableAnimation={reduceMotion || !isVisible}
        enableMouseInteraction={false}
        mouseRadius={1}
        pixelSize={2}
        waveAmplitude={0.3}
        waveColor={[0.8, 0.9882352941176471, 0.984313725490196]}
        waveFrequency={2.5}
        waveSpeed={0.01}
      />
    </div>
  );
}
