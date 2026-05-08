import React from "react";

// ─── Palette ──────────────────────────────────────────────────────────────────
const BODY    = "#1E2C48";
const OUTLINE = "#2E4068";
const HL      = "#8EC5FF";
const HL_S    = "#C2DEFF";

function Glow({ id }: { id: string }) {
  return (
    <defs>
      <filter id={id} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.65" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  );
}

// ─── Lean athletic upper body ─────────────────────────────────────────────────
// V-taper: wide chest (~13px), narrow waist (~8px), arms fully separate
function UpperBody({ rear }: { rear?: boolean }) {
  return (
    <>
      {/* Head */}
      <ellipse cx="12" cy="2.3" rx="2" ry="2.1" fill={BODY} stroke={OUTLINE} strokeWidth="0.65" />
      {/* Neck */}
      <path d="M10.7 4.3 C10.6 5 10.8 5.8 11.1 6 L12.9 6 C13.2 5.8 13.4 5 13.3 4.3 C12.9 4 12.5 3.8 12 3.8 C11.5 3.8 11.1 4 10.7 4.3 Z" fill={BODY} />

      {/* Torso — V-taper. Wide armpits (13px), chest bulge (14px), narrow waist (8px) */}
      <path
        d="M8.5 7 C9.5 6.5 11 6 12 6 C13 6 14.5 6.5 15.5 7
           L18.5 9.5
           C19 12 18.5 14.5 17 16.5
           C16 18.5 15.5 20.5 15.5 23
           L8.5 23
           C8.5 20.5 8 18.5 7 16.5
           C5.5 14.5 5 12 5.5 9.5
           C6.5 8.5 7.5 7.5 8.5 7 Z"
        fill={BODY} stroke={OUTLINE} strokeWidth="0.65"
      />

      {/* Left arm — lean, deltoid bump, tapers to forearm */}
      <path
        d="M8.5 7.5
           C6 7 4.5 8 3 10
           C2 12 2 14.5 3 16.5
           C3.5 18 4.5 19.5 5 21.5
           L6.5 23
           C7 23.5 8 23.5 8.5 23
           L8.5 21
           C8 19.5 7.5 18 7.5 16.5
           C7.5 14 8 12 7.5 10
           C7.5 9 7.5 8 8.5 7.5 Z"
        fill={BODY} stroke={OUTLINE} strokeWidth="0.65"
      />
      {/* Right arm — mirror */}
      <path
        d="M15.5 7.5
           C18 7 19.5 8 21 10
           C22 12 22 14.5 21 16.5
           C20.5 18 19.5 19.5 19 21.5
           L17.5 23
           C17 23.5 16 23.5 15.5 23
           L15.5 21
           C16 19.5 16.5 18 16.5 16.5
           C16.5 14 16 12 16.5 10
           C16.5 9 16.5 8 15.5 7.5 Z"
        fill={BODY} stroke={OUTLINE} strokeWidth="0.65"
      />

      {/* Rear-view spine line */}
      {rear && (
        <line x1="12" y1="7" x2="12" y2="22.5" stroke={OUTLINE} strokeWidth="1.2" strokeLinecap="round" />
      )}
    </>
  );
}

// ─── Single muscular arm (for biceps / triceps / forearms) ────────────────────
function SingleArm() {
  return (
    // Fills the 24×24 canvas: thick shoulder cap, bicep peak, tapered forearm
    <path
      d="M7 3.5
         C5.5 3 4.5 4 4.5 6
         C4.5 8 3.5 9.5 3 12
         C2.5 14.5 3 17 4.5 19
         C5.5 20.5 7 22 7.5 23.5
         L9 24 L15 24 L16.5 23.5
         C17 22 18.5 20.5 19.5 19
         C21 17 21.5 14.5 21 12
         C20.5 9.5 19.5 8 19.5 6
         C19.5 4 18.5 3 17 3.5
         C15.5 3 13.5 2.5 12 2.5
         C10.5 2.5 8.5 3 7 3.5 Z"
      fill={BODY} stroke={OUTLINE} strokeWidth="0.7"
    />
  );
}

// ─── Hips + both legs ─────────────────────────────────────────────────────────
function Legs() {
  return (
    <>
      {/* Pelvis */}
      <path
        d="M7 3 C8 2.5 10 2.5 12 2.5 C14 2.5 16 2.5 17 3
           C18.5 3.5 19 5.5 18 7 L15.5 8.5 L8.5 8.5 L6 7
           C5 5.5 5.5 3.5 7 3 Z"
        fill={BODY} stroke={OUTLINE} strokeWidth="0.65"
      />
      {/* Left leg — thick quad, clear contour */}
      <path
        d="M8.5 8.5
           C7.5 10 6.5 12.5 6 16
           C5.5 18.5 5.5 21 6.5 23
           L8 24 C8.5 24.5 9.5 24.5 10 24
           L10 23
           C10 21 10 18.5 9.5 16
           C9 12.5 9 10 10 8.5
           C9.5 8 9 8 8.5 8.5 Z"
        fill={BODY} stroke={OUTLINE} strokeWidth="0.65"
      />
      {/* Right leg */}
      <path
        d="M15.5 8.5
           C16.5 10 17.5 12.5 18 16
           C18.5 18.5 18.5 21 17.5 23
           L16 24 C15.5 24.5 14.5 24.5 14 24
           L14 23
           C14 21 14 18.5 14.5 16
           C15 12.5 15 10 14 8.5
           C14.5 8 15 8 15.5 8.5 Z"
        fill={BODY} stroke={OUTLINE} strokeWidth="0.65"
      />
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChestSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="cg" />
      <UpperBody />
      {/* Left pec — fan shape from outer chest curving to sternum */}
      <path
        d="M6.5 9.5 C6 11 7.5 14.5 9.5 16 L12 16.5 L12 9.5 C10.5 8.5 8 8.5 6.5 9.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.45" filter="url(#cg)"
      />
      {/* Right pec */}
      <path
        d="M17.5 9.5 C18 11 16.5 14.5 14.5 16 L12 16.5 L12 9.5 C13.5 8.5 16 8.5 17.5 9.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.45" filter="url(#cg)"
      />
      {/* Lower pec curvature line */}
      <path d="M7 14 C8.5 15.5 10.5 16 12 16" stroke={HL_S} strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
      <path d="M17 14 C15.5 15.5 13.5 16 12 16" stroke={HL_S} strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function BackSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="bg" />
      <UpperBody rear />
      {/* Left lat — wing from shoulder blade down to lower back */}
      <path
        d="M6.5 10 C5 12.5 5 16.5 8 19.5 C10 21.5 11.5 22 12 22 L12 12.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.45" filter="url(#bg)"
      />
      {/* Right lat */}
      <path
        d="M17.5 10 C19 12.5 19 16.5 16 19.5 C14 21.5 12.5 22 12 22 L12 12.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.45" filter="url(#bg)"
      />
      {/* Lat belly line */}
      <path d="M7.5 12 C8 15 10 18 12 20" stroke={HL_S} strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
      <path d="M16.5 12 C16 15 14 18 12 20" stroke={HL_S} strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function ShouldersSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="sg" />
      <UpperBody />
      {/* Left deltoid — round prominent cap */}
      <path
        d="M8.5 7.5 C6 7 4.5 8 3 10 C2 12 2 14.5 3 16.5 C3.5 17.5 4.5 17.5 5.5 17 L7.5 16.5 L6.5 10 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.45" filter="url(#sg)"
      />
      {/* Right deltoid */}
      <path
        d="M15.5 7.5 C18 7 19.5 8 21 10 C22 12 22 14.5 21 16.5 C20.5 17.5 19.5 17.5 18.5 17 L16.5 16.5 L17.5 10 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.45" filter="url(#sg)"
      />
      {/* Delt head division lines */}
      <path d="M4.5 10 C5 12 5.5 14.5 5.5 16.5" stroke={HL_S} strokeWidth="0.65" strokeLinecap="round" opacity="0.5" />
      <path d="M19.5 10 C19 12 18.5 14.5 18.5 16.5" stroke={HL_S} strokeWidth="0.65" strokeLinecap="round" opacity="0.5" />
      {/* Trapezius */}
      <path
        d="M9.5 7 C10.5 6.5 11.5 6 12 6 C12.5 6 13.5 6.5 14.5 7 L13.5 8.5 L12 8 L10.5 8.5 Z"
        fill={HL} opacity="0.55" filter="url(#sg)"
      />
    </svg>
  );
}

function BicepsSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="bic" />
      <SingleArm />
      {/* Bicep — large front belly with peak. Covers upper-front of arm */}
      <path
        d="M4.5 6 C4 8 4 11.5 5 14 C6 16 8 17 12 17 C16 17 18 16 19 14 C20 11.5 20 8 19.5 6 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.5" filter="url(#bic)"
      />
      {/* Bicep peak — short head crease */}
      <path d="M5 9 C5.5 11.5 7 14 9 15.5" stroke={HL_S} strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
      {/* Long head / outer split */}
      <path d="M19 9 C18.5 11.5 17 14 15 15.5" stroke={HL_S} strokeWidth="0.7" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

function TricepsSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="tri" />
      <SingleArm />
      {/* Tricep horseshoe — wide U covering back/entire upper arm, clearly larger than bicep highlight */}
      <path
        d="M4.5 6 C4 8.5 4 12 5.5 15 C7 17.5 9 18.5 12 18.5 C15 18.5 17 17.5 18.5 15 C20 12 20 8.5 19.5 6 L12 5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.5" filter="url(#tri)"
      />
      {/* Central medial-head groove — the defining feature of tricep horseshoe */}
      <line x1="12" y1="18.5" x2="12" y2="6.5" stroke={BODY} strokeWidth="2.2" strokeLinecap="round" />
      {/* Lateral head outer belly */}
      <path d="M5.5 8 C5 11 5.5 14 7 16" stroke={HL_S} strokeWidth="0.85" strokeLinecap="round" opacity="0.55" />
      <path d="M18.5 8 C19 11 18.5 14 17 16" stroke={HL_S} strokeWidth="0.85" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function ForearmsSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="fg" />
      <SingleArm />
      {/* Forearm highlight — lower portion of arm only, clearly distinct region */}
      <path
        d="M7 17.5 C6.5 18.5 6.5 20 7 21 L8.5 24 C9 24.5 10.5 24.5 12 24.5 C13.5 24.5 15 24.5 15.5 24 L17 21 C17.5 20 17.5 18.5 17 17.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.5" filter="url(#fg)"
      />
      {/* Brachioradialis muscle belly */}
      <path d="M7.5 18 C8 20 9 22 10 23" stroke={HL_S} strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
      {/* Extensor / flexor divide */}
      <line x1="12" y1="18" x2="12" y2="24" stroke={BODY} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function QuadsSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="qg" />
      <Legs />
      {/* Left quad — front of upper leg */}
      <path
        d="M8.5 8.5 C7.5 10 6.5 13 6 16.5 C5.5 19 5.5 21 6.5 23 L8 24 L10 24 L10 23 C10 21 9.5 18.5 9.5 16 C9 12.5 9 10 10 8.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.45" filter="url(#qg)"
      />
      {/* Right quad */}
      <path
        d="M15.5 8.5 C16.5 10 17.5 13 18 16.5 C18.5 19 18.5 21 17.5 23 L16 24 L14 24 L14 23 C14 21 14.5 18.5 14.5 16 C15 12.5 15 10 14 8.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.45" filter="url(#qg)"
      />
      {/* VMO teardrop — the inner quad head above knee */}
      <path d="M7.5 21 C8.5 22.5 9.5 23.5 10 24" stroke={BODY} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <path d="M16.5 21 C15.5 22.5 14.5 23.5 14 24" stroke={BODY} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      {/* Rectus femoris center line */}
      <path d="M7.5 10 C7.5 13 8 16.5 8 20" stroke={HL_S} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
      <path d="M16.5 10 C16.5 13 16 16.5 16 20" stroke={HL_S} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function HamstringsSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="hg" />
      <Legs />
      {/* Left hamstring — rear / inner thigh, slightly wider + lower than quad */}
      <path
        d="M8.5 8.5 C7 10.5 6 14 5.5 17.5 C5 20 5.5 22 6.5 23.5 L8.5 24.5 L10.5 24.5 L10 23 C9.5 21.5 9.5 18.5 10 16 C10.5 12.5 10.5 10 9.5 8.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.45" filter="url(#hg)"
      />
      {/* Right hamstring */}
      <path
        d="M15.5 8.5 C17 10.5 18 14 18.5 17.5 C19 20 18.5 22 17.5 23.5 L15.5 24.5 L13.5 24.5 L14 23 C14.5 21.5 14.5 18.5 14 16 C13.5 12.5 13.5 10 14.5 8.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.45" filter="url(#hg)"
      />
      {/* Bicep femoris long head */}
      <path d="M7 11 C7 14 7.5 17.5 8.5 21.5" stroke={BODY} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <path d="M17 11 C17 14 16.5 17.5 15.5 21.5" stroke={BODY} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

function GlutesSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="gg" />
      {/* Sacrum / lower back */}
      <path
        d="M7 2.5 L17 2.5 C18.5 3 19 4.5 18 6.5 L12 8 L6 6.5 C5 4.5 5.5 3 7 2.5 Z"
        fill={BODY} stroke={OUTLINE} strokeWidth="0.65"
      />
      {/* Left glute — large round mass */}
      <path
        d="M5 9.5 C3.5 12 3.5 16.5 5.5 19.5 C7 22 9.5 23 12 23.5 L12 20 C10 19.5 8 18 6.5 15 C5 12.5 5 10 6.5 7.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.5" filter="url(#gg)"
      />
      {/* Right glute */}
      <path
        d="M19 9.5 C20.5 12 20.5 16.5 18.5 19.5 C17 22 14.5 23 12 23.5 L12 20 C14 19.5 16 18 17.5 15 C19 12.5 19 10 17.5 7.5 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.5" filter="url(#gg)"
      />
      {/* Gluteal cleft — deep line through center */}
      <line x1="12" y1="7.5" x2="12" y2="23" stroke={BODY} strokeWidth="2.2" strokeLinecap="round" />
      {/* Gluteal fold (under-glute crease) */}
      <path d="M6 20 C8.5 23 10.5 23.5 12 23.5 C13.5 23.5 15.5 23 18 20" stroke={BODY} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function CalvesSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="cag" />
      {/* Upper legs / knees — not highlighted */}
      <path d="M7 2 L9.5 2 L10 11 L8 11.5 L6.5 11 Z" fill={BODY} stroke={OUTLINE} strokeWidth="0.65" />
      <path d="M14.5 2 L17 2 L17.5 11 L16 11.5 L14 11 Z" fill={BODY} stroke={OUTLINE} strokeWidth="0.65" />
      {/* Left calf — gastrocnemius diamond, prominent peak ~y=14 */}
      <path
        d="M6.5 11 C5 13 4.5 16.5 6.5 20 C7.5 21.5 8.5 22 9.5 22 L10 11 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.5" filter="url(#cag)"
      />
      {/* Right calf */}
      <path
        d="M17.5 11 C19 13 19.5 16.5 17.5 20 C16.5 21.5 15.5 22 14.5 22 L14 11 Z"
        fill={HL} stroke={HL_S} strokeWidth="0.5" filter="url(#cag)"
      />
      {/* Medial / lateral head split */}
      <path d="M7 15 C7.5 17 9 19 9.5 20" stroke={BODY} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <path d="M17 15 C16.5 17 15 19 14.5 20" stroke={BODY} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      {/* Ankle */}
      <path d="M7.5 21.5 L8 24 L9.5 24.5 L10 22 Z" fill={BODY} opacity="0.5" />
      <path d="M16.5 21.5 L16 24 L14.5 24.5 L14 22 Z" fill={BODY} opacity="0.5" />
    </svg>
  );
}

function AbsSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <Glow id="ag" />
      <UpperBody />
      {/* 6-pack sitting on the torso */}
      {[0, 1, 2].map((row) => (
        <React.Fragment key={row}>
          <rect x="7.8"  y={11 + row * 3.5} width="3.6" height="2.8" rx="0.8" fill={HL} stroke={HL_S} strokeWidth="0.4" filter="url(#ag)" />
          <rect x="12.6" y={11 + row * 3.5} width="3.6" height="2.8" rx="0.8" fill={HL} stroke={HL_S} strokeWidth="0.4" filter="url(#ag)" />
        </React.Fragment>
      ))}
      {/* Linea alba */}
      <line x1="12" y1="10.5" x2="12" y2="22.5" stroke={BODY} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DefaultSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <UpperBody />
      <path d="M8 10 C7.5 11 7 13 7.5 16 L16.5 16 C17 13 16.5 11 16 10 Z" fill={HL} opacity="0.25" />
    </svg>
  );
}

// ─── Mapping ──────────────────────────────────────────────────────────────────
function getMuscleSVG(group: string): React.ReactElement {
  const g = (group || "").toLowerCase().trim();
  if (g.includes("chest"))                                                  return <ChestSVG />;
  if (g.includes("back") || g.includes("lat"))                             return <BackSVG />;
  if (g.includes("shoulder") || g.includes("delt") || g.includes("trap")) return <ShouldersSVG />;
  if (g.includes("bicep"))                                                  return <BicepsSVG />;
  if (g.includes("tricep"))                                                 return <TricepsSVG />;
  if (g.includes("forearm"))                                                return <ForearmsSVG />;
  if (g.includes("quad"))                                                   return <QuadsSVG />;
  if (g.includes("hamstring"))                                              return <HamstringsSVG />;
  if (g.includes("glute"))                                                  return <GlutesSVG />;
  if (g.includes("calf") || g.includes("calve"))                           return <CalvesSVG />;
  if (g.includes("ab") || g.includes("core"))                              return <AbsSVG />;
  return <DefaultSVG />;
}

// ─── Public component ─────────────────────────────────────────────────────────
type Props = { muscleGroup: string; size?: number };

export default function MuscleIcon({ muscleGroup, size = 44 }: Props) {
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
        padding: Math.round(size * 0.06),
        flexShrink: 0,
        overflow: "hidden",
      }}
      title={muscleGroup}
    >
      {getMuscleSVG(muscleGroup)}
    </div>
  );
}
