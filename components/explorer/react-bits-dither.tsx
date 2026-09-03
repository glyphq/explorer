"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Dither = dynamic(() => import("@/components/Dither"), {
  ssr: false,
});

export function ReactBitsDither() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
      <Dither
        colorNum={10}
        disableAnimation={reducedMotion}
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
