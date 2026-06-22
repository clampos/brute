import React from "react";

import tricepsRaw    from "../assets/Icons/Triceps.svg?raw";
import chestRaw      from "../assets/Icons/Chest.svg?raw";
import backRaw       from "../assets/Icons/Back.svg?raw";
import shoulderRaw   from "../assets/Icons/Shoulder.svg?raw";
import bicepsRaw     from "../assets/Icons/Biceps.svg?raw";
import absRaw        from "../assets/Icons/Abs.svg?raw";
import calvesRaw     from "../assets/Icons/Calves.svg?raw";
import forearmsRaw   from "../assets/Icons/Forearms.svg?raw";
import glutesRaw     from "../assets/Icons/Glutes.svg?raw";
import hamstringsRaw from "../assets/Icons/Hamstrings.svg?raw";
import quadsRaw      from "../assets/Icons/Quads.svg?raw";

// ── Brand colour mapping ─────────────────────────────────────────────────────
// Each SVG ships with three colour families:
//   • Dark silhouette (#484x69 / #494x69)   → app dark navy
//   • Primary highlight (red #FxOOxx)        → brand blue accent
//   • Secondary highlight (orange #Fxxxxx)   → softer blue
//   • Body shading (grey-blue #9xAxCx)       → body outline shade

const COLOUR_MAP: [RegExp, string][] = [
  // Dark body silhouette
  [/#484E68/gi, "#1E2C48"],
  [/#484F69/gi, "#1E2C48"],
  [/#494E69/gi, "#1E2C48"],
  [/#494F69/gi, "#1E2C48"],

  // Primary muscle highlight (reds → brand blue)
  [/#FE004F/gi, "#8EC5FF"],
  [/#FD004F/gi, "#8EC5FF"],
  [/#FC014F/gi, "#8EC5FF"],
  [/#FC004F/gi, "#8EC5FF"],
  [/#FB004F/gi, "#8EC5FF"],
  [/#F8024F/gi, "#8EC5FF"],
  [/#F50B0B/gi, "#8EC5FF"],

  // Secondary muscle highlight (oranges → softer blue)
  [/#FD8464/gi, "#5B9CDE"],
  [/#FC8464/gi, "#5B9CDE"],
  [/#FB8464/gi, "#5B9CDE"],
  [/#FB8364/gi, "#5B9CDE"],
  [/#FA8364/gi, "#5B9CDE"],
  [/#F88264/gi, "#5B9CDE"],
  [/#F68264/gi, "#5B9CDE"],

  // Body shading (grey-blues → outline shade)
  [/#9EAACD/gi, "#2E4068"],
  [/#9EAACC/gi, "#2E4068"],
  [/#9EA9CC/gi, "#2E4068"],
  [/#9DA9CC/gi, "#2E4068"],
  [/#9DA9CB/gi, "#2E4068"],
  [/#9DA8CB/gi, "#2E4068"],
  [/#9CA9CB/gi, "#2E4068"],
  [/#9CA8CB/gi, "#2E4068"],
  [/#9CA7CA/gi, "#2E4068"],
  [/#9BA7CA/gi, "#2E4068"],
  [/#9BA7C9/gi, "#2E4068"],
  [/#9BA6C9/gi, "#2E4068"],
  [/#9AA6C9/gi, "#2E4068"],
  [/#9AA6C8/gi, "#2E4068"],
  [/#90D077/gi, "#2E4068"],
];

function applyBrandColours(raw: string): string {
  let out = raw;
  for (const [re, colour] of COLOUR_MAP) out = out.replace(re, colour);
  return out;
}

// ── SVG lookup ───────────────────────────────────────────────────────────────

const SVG_MAP: Record<string, string> = {
  chest:      chestRaw,
  back:       backRaw,
  shoulder:   shoulderRaw,
  bicep:      bicepsRaw,
  tricep:     tricepsRaw,
  forearm:    forearmsRaw,
  quad:       quadsRaw,
  hamstring:  hamstringsRaw,
  glute:      glutesRaw,
  calf:       calvesRaw,
  calve:      calvesRaw,
  ab:         absRaw,
  core:       absRaw,
};

const PROCESSED: Record<string, string> = {};

function getSvg(muscleGroup: string): string {
  const key = (muscleGroup || "").toLowerCase().trim();
  const match = Object.keys(SVG_MAP).find((k) => key.includes(k));
  const raw = match ? SVG_MAP[match] : backRaw;

  const cacheKey = match ?? "__default__";
  if (!PROCESSED[cacheKey]) {
    let processed = applyBrandColours(raw);
    // Inject viewBox so the 512×512 coordinate space scales to the container
    if (!processed.includes("viewBox")) {
      processed = processed.replace(/<svg([^>]*)>/, '<svg$1 viewBox="0 0 512 512">');
    }
    // Replace fixed dimensions with 100% so the SVG fills the wrapper div
    processed = processed.replace(/\s+width="\d+(\.\d+)?"/g, "");
    processed = processed.replace(/\s+height="\d+(\.\d+)?"/g, "");
    processed = processed.replace(/<svg/, '<svg style="width:100%;height:100%"');
    PROCESSED[cacheKey] = processed;
  }
  return PROCESSED[cacheKey];
}

// ── Public component ─────────────────────────────────────────────────────────
type Props = { muscleGroup: string; size?: number };

export default function MuscleIcon({ muscleGroup, size = 44 }: Props) {
  const svg = getSvg(muscleGroup);

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: Math.round(size * 0.24),
        background: "#090E1A",
        border: "1px solid #1A2640",
        boxShadow: "0 2px 12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(142,197,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: Math.round(size * 0.04),
        flexShrink: 0,
        overflow: "hidden",
      }}
      title={muscleGroup}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
