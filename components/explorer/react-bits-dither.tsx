"use client";

import dynamic from "next/dynamic";

const Dither = dynamic(() => import("@/components/Dither"), {
  ssr: false,
});

export function ReactBitsDither() {
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-25">
      <Dither
        colorNum={10}
        disableAnimation={false}
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
