/**
 * Rep Adjustment Utilities for Frontend
 * 
 * Mirrors the backend repAdjustmentService but implemented in TypeScript for frontend use
 */

/**
 * Percentage-of-1RM table for rep lookups
 */
const REP_PERCENTAGE_TABLE: Array<{ reps: number; pct: number }> = [
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

function calculateEpley(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

function calculateBrzycki(weight: number, reps: number): number | null {
  if (reps >= 37) {
    return null;
  }
  return weight * (36 / (37 - reps));
}

function calculateLombardi(weight: number, reps: number): number {
  return weight * Math.pow(reps, 0.1);
}

function calculateMayhew(weight: number, reps: number): number {
  return (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));
}

export function estimate1RM(lastWeight: number, lastReps: number): number {
  const reps = Math.max(1, Math.min(36, Math.round(lastReps)));

  const estimates: number[] = [];

  const epley = calculateEpley(lastWeight, reps);
  estimates.push(epley);

  const brzycki = calculateBrzycki(lastWeight, reps);
  if (brzycki !== null) {
    estimates.push(brzycki);
  }

  const lombardi = calculateLombardi(lastWeight, reps);
  estimates.push(lombardi);

  const mayhew = calculateMayhew(lastWeight, reps);
  estimates.push(mayhew);

  const average = estimates.reduce((sum, est) => sum + est, 0) / estimates.length;
  return average;
}

function findClosestRepFromTable(pct: number): number {
  const clampedPct = Math.max(0.6, Math.min(1.0, pct));

  // Find exact match first
  for (const entry of REP_PERCENTAGE_TABLE) {
    if (Math.abs(entry.pct - clampedPct) < 0.001) {
      return entry.reps;
    }
  }

  // Find two closest entries: one below and one above pct
  let below: typeof REP_PERCENTAGE_TABLE[0] | null = null;
  let above: typeof REP_PERCENTAGE_TABLE[0] | null = null;

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

/**
 * Calculate suggested reps when user manually updates weight
 * 
 * Uses ensemble 1RM estimation and percentage table lookup
 * 
 * @param lastWeight - Weight from last completed set
 * @param lastReps - Reps from last completed set
 * @param newWeight - New weight user is setting
 * @returns Suggested rep count, clamped to [1, 20]
 */
export function getSuggestedReps(
  lastWeight: number,
  lastReps: number,
  newWeight: number,
): number {
  if (!Number.isFinite(lastWeight) || lastWeight <= 0) {
    return 1;
  }
  if (!Number.isFinite(lastReps) || lastReps <= 0) {
    return 1;
  }
  if (!Number.isFinite(newWeight) || newWeight <= 0) {
    return 1;
  }

  const oneRM = estimate1RM(lastWeight, lastReps);

  if (!Number.isFinite(oneRM) || oneRM <= 0) {
    return 1;
  }

  const pct = newWeight / oneRM;
  const suggestedReps = findClosestRepFromTable(pct);

  return Math.max(1, Math.min(20, suggestedReps));
}

/**
 * Helper for displaying 1RM estimate using Epley formula
 */
export function estimate1RMForDisplay(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || weight <= 0) {
    return 0;
  }
  if (!Number.isFinite(reps) || reps <= 0) {
    return weight;
  }

  const clampedReps = Math.max(1, Math.min(36, Math.round(reps)));
  return calculateEpley(weight, clampedReps);
}
