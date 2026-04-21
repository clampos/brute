#!/usr/bin/env node

/**
 * Rep Adjustment Algorithm Test Suite (Node.js)
 * Run with: node test_rep_adjustment.js
 */

// Inline implementation for Node.js testing
function calculateEpley(weight, reps) {
  return weight * (1 + reps / 30);
}

function calculateBrzycki(weight, reps) {
  if (reps >= 37) return null;
  return weight * (36 / (37 - reps));
}

function calculateLombardi(weight, reps) {
  return weight * Math.pow(reps, 0.1);
}

function calculateMayhew(weight, reps) {
  return (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));
}

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

function estimate1RM(lastWeight, lastReps) {
  const reps = Math.max(1, Math.min(36, Math.round(lastReps)));
  const estimates = [];

  estimates.push(calculateEpley(lastWeight, reps));

  const brzycki = calculateBrzycki(lastWeight, reps);
  if (brzycki !== null) estimates.push(brzycki);

  estimates.push(calculateLombardi(lastWeight, reps));
  estimates.push(calculateMayhew(lastWeight, reps));

  return estimates.reduce((sum, est) => sum + est, 0) / estimates.length;
}

function findClosestRepFromTable(pct) {
  const clampedPct = Math.max(0.6, Math.min(1.0, pct));

  // Find exact match first
  for (const entry of REP_PERCENTAGE_TABLE) {
    if (Math.abs(entry.pct - clampedPct) < 0.001) {
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

  // If we only have one side, return that
  if (below && !above) {
    return below.reps;
  }
  if (above && !below) {
    return above.reps;
  }

  // Both exist - interpolate
  if (below && above) {
    const t = (clampedPct - below.pct) / (above.pct - below.pct);
    const interpolated = below.reps + t * (above.reps - below.reps);
    return Math.round(interpolated);
  }

  // Fallback (shouldn't reach here)
  return 1;
}

function getSuggestedReps(lastWeight, lastReps, newWeight) {
  if (!Number.isFinite(lastWeight) || lastWeight <= 0) return 1;
  if (!Number.isFinite(lastReps) || lastReps <= 0) return 1;
  if (!Number.isFinite(newWeight) || newWeight <= 0) return 1;

  const oneRM = estimate1RM(lastWeight, lastReps);

  if (!Number.isFinite(oneRM) || oneRM <= 0) return 1;

  const pct = newWeight / oneRM;
  const suggestedReps = findClosestRepFromTable(pct);

  return Math.max(1, Math.min(20, suggestedReps));
}

// Test scenarios
const testCases = [
  {
    name: "Basic progression",
    lastWeight: 100,
    lastReps: 8,
    newWeight: 110,
    expectedRange: [5, 5],  // 110 is 88% of 1RM
  },
  {
    name: "Same weight",
    lastWeight: 80,
    lastReps: 10,
    newWeight: 80,
    expectedRange: [9, 9],  // 76.4% of 1RM → 9 reps
  },
  {
    name: "Lighter deload",
    lastWeight: 100,
    lastReps: 8,
    newWeight: 60,
    expectedRange: [20, 20],
  },
  {
    name: "Single rep max light",
    lastWeight: 150,
    lastReps: 1,
    newWeight: 140,
    expectedRange: [4, 4],  // 90.6% of 1RM → 4 reps
  },
  {
    name: "High reps increase",
    lastWeight: 40,
    lastReps: 20,
    newWeight: 45,
    expectedRange: [13, 13],  // 67.7% of 1RM → 13 reps
  },
  {
    name: "Slight increase",
    lastWeight: 50,
    lastReps: 12,
    newWeight: 52,
    expectedRange: [10, 10],  // 76% of 1RM → 10 reps
  },
  {
    name: "Major decrease",
    lastWeight: 120,
    lastReps: 5,
    newWeight: 80,
    expectedRange: [20, 20],  // Very light, capped at 20
  },
];

console.log("🧪 Rep Adjustment Algorithm Test Suite\n");
console.log("=".repeat(70));

let passed = 0;
let failed = 0;

testCases.forEach((testCase) => {
  const result = getSuggestedReps(
    testCase.lastWeight,
    testCase.lastReps,
    testCase.newWeight,
  );

  const isValid =
    result >= testCase.expectedRange[0] && result <= testCase.expectedRange[1];
  const status = isValid ? "✅ PASS" : "❌ FAIL";

  if (isValid) passed++;
  else failed++;

  console.log(`\n${status} - ${testCase.name}`);
  console.log(`   ${testCase.lastWeight}kg × ${testCase.lastReps} reps → ${testCase.newWeight}kg`);
  console.log(`   Suggested: ${result} reps`);
  console.log(
    `   Expected: ${testCase.expectedRange[0]}-${testCase.expectedRange[1]} reps`,
  );

  // Show calculation details
  const oneRM = estimate1RM(testCase.lastWeight, testCase.lastReps);
  const pct = (testCase.newWeight / oneRM * 100).toFixed(1);
  console.log(`   [1RM: ${oneRM.toFixed(1)}kg, at ${pct}% of 1RM]`);
});

console.log("\n" + "=".repeat(70));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log("🎉 All tests passed!\n");
  process.exit(0);
} else {
  console.log("⚠️  Some tests failed!\n");
  process.exit(1);
}
