"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const Dither = dynamic(() => import("@/components/Dither"), {
  ssr: false,
});

export function ReactBitsDither() {
  const reduceMotion = useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-25">
      <Dither
        colorNum={10}
        disableAnimation={reduceMotion}
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
