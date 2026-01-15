import React from "react";

type Props = {
  muscleGroup: string;
  size?: number;
};

function getIconSVG(group: string): JSX.Element {
  const g = (group || "").toLowerCase().trim();

  // Chest
  if (g.includes("chest")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#86FF99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6V18" />
        <ellipse cx="8" cy="12" rx="3" ry="5" />
        <ellipse cx="16" cy="12" rx="3" ry="5" />
      </svg>
    );
  }

  // Back
  if (g.includes("back") || g.includes("lat")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#86FF99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6V18" />
        <path d="M6 10L12 8L18 10" />
        <path d="M6 14L12 16L18 14" />
      </svg>
    );
  }

  // Shoulders/Traps
  if (g.includes("shoulder") || g.includes("trap")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#86FF99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="10" r="2" />
        <circle cx="19" cy="10" r="2" />
        <line x1="7" y1="11" x2="17" y2="11" />
        <path d="M7 11V16" />
        <path d="M17 11V16" />
      </svg>
    );
  }

  // Arms
  if (
    g.includes("bicep") ||
    g.includes("tricep") ||
    g.includes("forearm") ||
    (g.includes("arm") && !g.includes("back"))
  ) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#86FF99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 7L6 15" />
        <path d="M17 7L18 15" />
        <circle cx="6" cy="6" r="1.5" />
        <circle cx="18" cy="6" r="1.5" />
      </svg>
    );
  }

  // Legs
  if (
    g.includes("quad") ||
    g.includes("hamstring") ||
    g.includes("glute") ||
    g.includes("calf") ||
    g.includes("adductor") ||
    g.includes("abductor") ||
    g.includes("leg")
  ) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#86FF99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="5" x2="8" y2="18" />
        <line x1="16" y1="5" x2="16" y2="18" />
        <circle cx="8" cy="4" r="1" />
        <circle cx="16" cy="4" r="1" />
      </svg>
    );
  }

  // Abs
  if (g.includes("abdom") || g.includes("core") || g.includes("abs")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#86FF99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="6" width="6" height="12" rx="1" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    );
  }

  // Default
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#86FF99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7V12" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="8" y1="12L8 18" />
      <line x1="16" y1="12L16 18" />
    </svg>
  );
}

export default function MuscleIcon({ muscleGroup, size = 40 }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title={muscleGroup}
      role="img"
      aria-label={muscleGroup}
    >
      {getIconSVG(muscleGroup || "")}
    </div>
  );
}
