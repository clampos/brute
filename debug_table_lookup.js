#!/usr/bin/env node

// Inline implementation for debugging

const REP_PERCENTAGE_TABLE = [
  { reps: 1, pct: 1.0 },
  { reps: 2, pct: 0.97 },
  { reps: 3, pct: 0.94 },
  { reps: 4, pct: 0.91 },
  { reps: 5, pct: 0.87 },
  { reps: 6, pct: 0.85 },
  { reps: 7, pct: 0.83 },
  { reps: 8, pct: 0.8 },
  { reps: 9, pct: 0.77 },
  { reps: 10, pct: 0.75 },
  { reps: 11, pct: 0.73 },
  { reps: 12, pct: 0.7 },
  { reps: 13, pct: 0.68 },
  { reps: 14, pct: 0.66 },
  { reps: 15, pct: 0.65 },
  { reps: 20, pct: 0.6 },
];

function findClosestRepFromTable(pct) {
  const clampedPct = Math.max(0.6, Math.min(1.0, pct));
  console.log(`\n  Looking up: ${clampedPct} (${(clampedPct * 100).toFixed(1)}%)`);

  // Find exact match first
  for (const entry of REP_PERCENTAGE_TABLE) {
    if (Math.abs(entry.pct - clampedPct) < 0.001) {
      console.log(`  → Exact match: ${entry.reps} reps @ ${entry.pct}`);
      return entry.reps;
    }
  }

  // Find two closest entries: one below and one above pct
  let below = null;
  let above = null;

  for (const entry of REP_PERCENTAGE_TABLE) {
    if (entry.pct < clampedPct) {
      // Keep the entry with pct closest to clampedPct (largest pct < clampedPct)
      if (below === null || entry.pct > below.pct) {
        below = entry;
      }
    } else if (entry.pct > clampedPct) {
      // Keep the entry with pct closest to clampedPct (smallest pct > clampedPct)
      if (above === null || entry.pct < above.pct) {
        above = entry;
      }
    }
  }

  console.log(`  Below: ${below ? `${below.reps} reps @ ${below.pct}` : "none"}`);
  console.log(`  Above: ${above ? `${above.reps} reps @ ${above.pct}` : "none"}`);

  // If we only have one side, return that
  if (below && !above) {
    console.log(`  → Only below: ${below.reps}`);
    return below.reps;
  }
  if (above && !below) {
    console.log(`  → Only above: ${above.reps}`);
    return above.reps;
  }

  // Both exist - interpolate
  if (below && above) {
    const t = (clampedPct - below.pct) / (above.pct - below.pct);
    const interpolated = below.reps + t * (above.reps - below.reps);
    console.log(`  t = (${clampedPct} - ${below.pct}) / (${above.pct} - ${below.pct}) = ${t.toFixed(4)}`);
    console.log(`  Interpolated: ${below.reps} + ${t.toFixed(4)} * (${above.reps} - ${below.reps}) = ${interpolated.toFixed(2)}`);
    const result = Math.round(interpolated);
    console.log(`  → Rounded: ${result}`);
    return result;
  }

  console.log(`  → Edge case: returning 1`);
  return 1;
}

// Test cases
console.log("🧪 Table Lookup Debugging\n");
console.log("=".repeat(70));

const testPcts = [
  { pct: 1.0, name: "100% (1RM)" },
  { pct: 0.91, name: "91% (4 reps)" },
  { pct: 0.88, name: "88% (between 4 and 5)" },
  { pct: 0.764, name: "76.4% (same weight case)" },
  { pct: 0.75, name: "75% (10 reps)" },
  { pct: 0.906, name: "90.6% (single rep max case)" },
  { pct: 0.677, name: "67.7% (high reps case)" },
  { pct: 0.76, name: "76% (slight increase case)" },
  { pct: 0.6, name: "60% (20 reps)" },
  { pct: 0.48, name: "48% (very light)" },
];

testPcts.forEach(({ pct, name }) => {
  console.log(`\nTest: ${name}`);
  const result = findClosestRepFromTable(pct);
  console.log(`Final result: ${result} reps`);
});
