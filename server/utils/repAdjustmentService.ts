/**
 * Rep Adjustment Service
 * 
 * Implements a two-step algorithm for suggesting reps when a user manually updates weight:
 * 1. Estimate 1RM from last known (weight, reps) using an ensemble of 4 formulas
 * 2. Look up the closest rep count from a percentage-of-1RM table
 */

/**
 * Percentage-of-1RM table for rep lookups
 * Maps rep count to percentage of 1RM
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

/**
 * Calculate 1RM estimate using Epley formula
 * 1RM = weight * (1 + reps / 30)
 */
function calculateEpley(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

/**
 * Calculate 1RM estimate using Brzycki formula
 * 1RM = weight * (36 / (37 - reps))
 * Note: Brzycki is unreliable for reps >= 37, so we skip it in those cases
 */
function calculateBrzycki(weight: number, reps: number): number | null {
  if (reps >= 37) {
    return null; // Skip if reps >= 37 to avoid division by zero or negative
  }
  return weight * (36 / (37 - reps));
}

/**
 * Calculate 1RM estimate using Lombardi formula
 * 1RM = weight * (reps ^ 0.10)
 */
function calculateLombardi(weight: number, reps: number): number {
  return weight * Math.pow(reps, 0.1);
}

/**
 * Calculate 1RM estimate using Mayhew formula
 * 1RM = (100 * weight) / (52.2 + 41.9 * e^(-0.055 * reps))
 */
function calculateMayhew(weight: number, reps: number): number {
  return (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));
}

/**
 * Estimate 1RM from last known set using ensemble of four formulas
 * 
 * @param lastWeight - Weight performed in last set
 * @param lastReps - Reps performed in last set
 * @returns Average of valid 1RM estimates
 */
export function estimate1RM(lastWeight: number, lastReps: number): number {
  // Clamp reps to valid range [1, 36] before calculation
  const reps = Math.max(1, Math.min(36, Math.round(lastReps)));

  const estimates: number[] = [];

  // Calculate all four estimates
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

  // Return average of all valid estimates
  const average = estimates.reduce((sum, est) => sum + est, 0) / estimates.length;
  return average;
}

/**
 * Find closest rep count from percentage table
 * Uses linear interpolation for values between table entries
 * 
 * @param pct - Percentage of 1RM (0-1)
 * @returns Closest rep count from table
 */
function findClosestRepFromTable(pct: number): number {
  // Clamp pct to valid range
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
 * Uses a two-step process:
 * 1. Estimate 1RM from last known (weight, reps) pair using ensemble of 4 formulas
 * 2. Look up closest rep count from percentage-of-1RM table based on new weight
 * 
 * @param lastWeight - Weight from last completed set (kg or lbs)
 * @param lastReps - Reps from last completed set
 * @param newWeight - New weight user is setting (kg or lbs)
 * @returns Suggested rep count, clamped to [1, 20]
 */
export function getSuggestedReps(
  lastWeight: number,
  lastReps: number,
  newWeight: number,
): number {
  // Validate inputs
  if (!Number.isFinite(lastWeight) || lastWeight <= 0) {
    return 1;
  }
  if (!Number.isFinite(lastReps) || lastReps <= 0) {
    return 1;
  }
  if (!Number.isFinite(newWeight) || newWeight <= 0) {
    return 1;
  }

  // Step 1: Estimate 1RM from last known pair
  const oneRM = estimate1RM(lastWeight, lastReps);

  if (!Number.isFinite(oneRM) || oneRM <= 0) {
    return 1;
  }

  // Step 2: Calculate percentage of 1RM for new weight
  const pct = newWeight / oneRM;

  // Step 3: Look up closest rep count from table
  const suggestedReps = findClosestRepFromTable(pct);

  // Step 4: Clamp to reasonable range [1, 20]
  return Math.max(1, Math.min(20, suggestedReps));
}

/**
 * Alternative function for displaying 1RM estimate to user (e.g. for badges)
 * Uses only Epley formula for simplicity and consistency
 * 
 * @param weight - Weight performed
 * @param reps - Reps performed
 * @returns 1RM estimate using Epley formula
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
