import React from "react";

type Props = {
  muscleGroup: string;
  size?: number;
};

// Regions we can highlight on a simple silhouette
type Region =
  | "chest"
  | "upper_back"
  | "lower_back"
  | "left_arm"
  | "right_arm"
  | "abs"
  | "glutes"
  | "left_leg"
  | "right_leg"
  | "calves"
  | "neck"
  | "shoulders";

const regionMap: Record<string, Region[]> = {
  chest: ["chest"],
  lats: ["upper_back"],
  "middle back": ["upper_back"],
  "lower back": ["lower_back"],
  back: ["upper_back", "lower_back"],
  biceps: ["left_arm", "right_arm"],
  triceps: ["left_arm", "right_arm"],
  forearms: ["left_arm", "right_arm"],
  traps: ["upper_back"],
  shoulders: ["shoulders"],
  quadriceps: ["left_leg", "right_leg"],
  hamstrings: ["left_leg", "right_leg"],
  glutes: ["glutes"],
  adductors: ["left_leg", "right_leg"],
  abductors: ["left_leg", "right_leg"],
  calves: ["calves"],
  legs: ["left_leg", "right_leg"],
  abdominals: ["abs"],
  abs: ["abs"],
  core: ["abs"],
  neck: ["neck"],
};

function lookupRegions(group: string): Region[] {
  const g = (group || "").toLowerCase().trim();
  if (regionMap[g]) return regionMap[g];

  // partial matches
  if (g.includes("chest")) return ["chest"];
  if (g.includes("back") || g.includes("lat")) return ["upper_back"];
  if (
    g.includes("bi") ||
    g.includes("tri") ||
    g.includes("arm") ||
    g.includes("forearm") ||
    g.includes("trap")
  )
    return ["left_arm", "right_arm"];
  if (
    g.includes("quad") ||
    g.includes("hamstring") ||
    g.includes("glute") ||
    g.includes("calf") ||
    g.includes("leg")
  )
    return ["left_leg", "right_leg"];
  if (g.includes("abdom") || g.includes("core")) return ["abs"];

  return [];
}

export default function MuscleIcon({ muscleGroup, size = 40 }: Props) {
  const regions = lookupRegions(muscleGroup || "");
  const w = size;
  const h = size;

  const highlight = (r: Region) => {
    const common = { fill: "#16A34A", opacity: 0.95 } as any;
    switch (r) {
      case "neck":
        return <circle cx={w * 0.5} cy={h * 0.13} r={w * 0.07} {...common} />;
      case "chest":
        return (
          <rect
            x={w * 0.28}
            y={h * 0.22}
            width={w * 0.44}
            height={h * 0.18}
            rx={w * 0.05}
            {...common}
          />
        );
      case "upper_back":
        return (
          <rect
            x={w * 0.28}
            y={h * 0.15}
            width={w * 0.44}
            height={h * 0.18}
            rx={w * 0.04}
            {...common}
          />
        );
      case "lower_back":
        return (
          <rect
            x={w * 0.26}
            y={h * 0.36}
            width={w * 0.48}
            height={h * 0.16}
            rx={w * 0.04}
            {...common}
          />
        );
      case "shoulders":
        return (
          <>
            <ellipse
              cx={w * 0.2}
              cy={h * 0.25}
              rx={w * 0.12}
              ry={h * 0.06}
              {...common}
            />
            <ellipse
              cx={w * 0.8}
              cy={h * 0.25}
              rx={w * 0.12}
              ry={h * 0.06}
              {...common}
            />
          </>
        );
      case "left_arm":
        return (
          <rect
            x={w * 0.06}
            y={h * 0.22}
            width={w * 0.12}
            height={h * 0.44}
            rx={w * 0.06}
            {...common}
          />
        );
      case "right_arm":
        return (
          <rect
            x={w * 0.82}
            y={h * 0.22}
            width={w * 0.12}
            height={h * 0.44}
            rx={w * 0.06}
            {...common}
          />
        );
      case "abs":
        return (
          <rect
            x={w * 0.34}
            y={h * 0.34}
            width={w * 0.32}
            height={h * 0.22}
            rx={w * 0.04}
            {...common}
          />
        );
      case "glutes":
        return (
          <rect
            x={w * 0.34}
            y={h * 0.56}
            width={w * 0.32}
            height={h * 0.14}
            rx={w * 0.04}
            {...common}
          />
        );
      case "left_leg":
        return (
          <rect
            x={w * 0.34}
            y={h * 0.7}
            width={w * 0.12}
            height={h * 0.26}
            rx={w * 0.05}
            {...common}
          />
        );
      case "right_leg":
        return (
          <rect
            x={w * 0.54}
            y={h * 0.7}
            width={w * 0.12}
            height={h * 0.26}
            rx={w * 0.05}
            {...common}
          />
        );
      case "calves":
        return (
          <>
            <rect
              x={w * 0.34}
              y={h * 0.84}
              width={w * 0.12}
              height={h * 0.12}
              rx={w * 0.04}
              {...common}
            />
            <rect
              x={w * 0.54}
              y={h * 0.84}
              width={w * 0.12}
              height={h * 0.12}
              rx={w * 0.04}
              {...common}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={muscleGroup}
      title={muscleGroup}
    >
      {/* Base silhouette */}
      <g fill="#0B1020">
        <circle
          cx={w * 0.5}
          cy={h * 0.12}
          r={w * 0.09}
          fill="#FFFFFF"
          opacity={0.06}
        />
        <rect
          x={w * 0.3}
          y={h * 0.2}
          width={w * 0.4}
          height={h * 0.6}
          rx={w * 0.06}
          fill="#FFFFFF"
          opacity={0.04}
        />
        <rect
          x={w * 0.18}
          y={h * 0.24}
          width={w * 0.12}
          height={h * 0.48}
          rx={w * 0.06}
          fill="#FFFFFF"
          opacity={0.04}
        />
        <rect
          x={w * 0.7}
          y={h * 0.24}
          width={w * 0.12}
          height={h * 0.48}
          rx={w * 0.06}
          fill="#FFFFFF"
          opacity={0.04}
        />
      </g>

      {/* Highlights */}
      <g>
        {regions.map((r) => (
          <React.Fragment key={r}>{highlight(r)}</React.Fragment>
        ))}
      </g>
    </svg>
  );
}
