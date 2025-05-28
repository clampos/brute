// src/components/BubblesBackground.tsx
import React, { useMemo } from "react";

export default function BubblesBackground() {
  const bubbleCount = 25;
  const bubbleColors = ["#8ecae6", "#bde0fe", "#a2d2ff", "#d0f4ff"];

  const bubbles = useMemo(() => {
    return Array.from({ length: bubbleCount }, (_, i) => {
      const size = Math.random() * 6 + 4;
      const left = Math.random() * 100;
      const delay = Math.random() * 10;
      const duration = 10 + Math.random() * 10;

      return (
        <div
          key={i}
          className="absolute rounded-full opacity-30 animate-float animate-drift"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            bottom: `-20px`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            backgroundColor:
              bubbleColors[Math.floor(Math.random() * bubbleColors.length)],
          }}
        />
      );
    });
  }, []); // <== only generate once

  return (
    <div className="absolute inset-0 overflow-hidden z-10 pointer-events-none">
      {bubbles}
    </div>
  );
}
