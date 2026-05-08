import React, { useEffect, useRef } from "react";
import { animate } from "framer-motion";

interface CountUpProps {
  to: number;
  duration?: number;
  decimals?: number;
  className?: string;
}

/** Animates a number from 0 to `to` on mount. */
export default function CountUp({ to, duration = 0.8, decimals = 0, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(value) {
        if (ref.current) {
          ref.current.textContent = decimals > 0
            ? value.toFixed(decimals)
            : Math.round(value).toString();
        }
      },
    });
    return () => controls.stop();
  }, [to]);

  return (
    <span ref={ref} className={className}>
      {decimals > 0 ? to.toFixed(decimals) : to}
    </span>
  );
}
