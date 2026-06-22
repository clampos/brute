// server/strength/peakWeekService.ts
// Peak week and 1RM testing system.
// Replaces the standard deload on the FINAL cycle of a goal programme only.

import { round2_5 } from "./trainingMaxService";
import { TM_INCREMENTS, getBodyPart, getLiftName } from "./constants";
import type { ExperienceLevel } from "./types";

// ── Phase enum ────────────────────────────────────────────────────────────────

export type PeakWeekPhase =
  | "NONE"        // normal 5/3/1 cycles
  | "APPROACHING" // next cycle will be the peak cycle — notify user
  | "OPENER"      // peak week session 1 (opener lifts, reduced accessories)
  | "REST"        // peak week day 2 (no lifting prescription)
  | "MAX_ATTEMPT" // peak week session 2 (warm-up + 3 attempts)
  | "COMPLETE";   // test done, waiting for next normal cycle (deload)

export type AttemptFeel = "easy" | "solid" | "hard" | "missed";
export type AttemptResult = "hit" | "miss";
export type TestType = "FINAL" | "MID_CHECKPOINT";

// ── Detection ─────────────────────────────────────────────────────────────────

/**
 * After a cycle's week-3 AMRAP, check whether the TM we're about to set will
 * reach the goal weight by the end of the NEXT complete cycle.
 * If yes, the next cycle is the final/peak cycle.
 */
export function willReachGoalNextCycle(
  currentTm: number,
  goalWeight: number,
  exerciseId: string,
  experienceLevel: ExperienceLevel,
): boolean {
  const bodyPart = getBodyPart(exerciseId);
  const increment = TM_INCREMENTS[bodyPart];
  const projectedTm = currentTm + increment; // TM at end of next cycle
  // goal is a 1RM target; TM = 0.9 × 1RM so convert: goal as TM = goal × 0.9
  const goalAsTm = goalWeight * 0.9;
  return projectedTm >= goalAsTm;
}

/** Already at or past goal — offer an early test. */
export function isAtGoal(currentTm: number, goalWeight: number): boolean {
  return currentTm >= goalWeight * 0.9;
}

/** Mid-programme checkpoint target = start + 50% of gap (rounded to 2.5). */
export function midCheckpointTarget(start1rm: number, goalWeight: number): number {
  return round2_5(start1rm + (goalWeight - start1rm) * 0.5);
}

/**
 * Whether to insert a mid-programme checkpoint.
 * Applies when the projected duration is ≥ 16 weeks.
 */
export function needsMidCheckpoint(projectedWeeks: number): boolean {
  return projectedWeeks >= 16;
}

// ── Peak week prescriptions ────────────────────────────────────────────────────

export interface PeakOpenerSet {
  setNumber: number;
  weight: number;
  reps: number;
  label: string;
}

export interface MaxAttemptWarmUp {
  setNumber: number;
  weight: number;
  reps: number;
  percent: number;
}

export interface MaxAttemptSession {
  warmUp: MaxAttemptWarmUp[];
  attempt1Suggested: number;
  attempt2Suggested: number | null;
  attempt3Suggested: number;
  goalWeight: number;
}

/**
 * Opener session prescription.
 * 75% × 3 / 85% × 1 / 90% × 1 of estimated current 1RM.
 * No FSL. Purpose: neural activation without fatigue.
 */
export function prescribePeakOpener(currentTm: number, exerciseId: string): PeakOpenerSet[] {
  const estimated1rm = round2_5(currentTm / 0.9);
  return [
    { setNumber: 1, weight: round2_5(estimated1rm * 0.75), reps: 3, label: "75% × 3" },
    { setNumber: 2, weight: round2_5(estimated1rm * 0.85), reps: 1, label: "85% × 1" },
    { setNumber: 3, weight: round2_5(estimated1rm * 0.90), reps: 1, label: "90% × 1" },
  ];
}

/**
 * Max attempt day warm-up sequence.
 * 50% × 5 / 60% × 3 / 70% × 2 / 80% × 1 / 90% × 1 of goal weight.
 */
export function prescribeMaxAttemptWarmUp(goalWeight: number): MaxAttemptWarmUp[] {
  return [
    { setNumber: 1, weight: round2_5(goalWeight * 0.50), reps: 5, percent: 50 },
    { setNumber: 2, weight: round2_5(goalWeight * 0.60), reps: 3, percent: 60 },
    { setNumber: 3, weight: round2_5(goalWeight * 0.70), reps: 2, percent: 70 },
    { setNumber: 4, weight: round2_5(goalWeight * 0.80), reps: 1, percent: 80 },
    { setNumber: 5, weight: round2_5(goalWeight * 0.90), reps: 1, percent: 90 },
  ];
}

/** Initial attempt 1 suggestion: 92–95% of goal weight (use 93%). */
export function suggestAttempt1(goalWeight: number): number {
  return round2_5(goalWeight * 0.93);
}

/**
 * Suggest attempt 2 based on attempt 1 feel.
 * Easy   → +5kg
 * Solid  → +2.5kg
 * Hard   → +1.25kg (minimum plate increment)
 * Missed → -2.5kg
 */
export function suggestAttempt2(attempt1Weight: number, feel: AttemptFeel): number {
  const delta: Record<AttemptFeel, number> = {
    easy:   5.0,
    solid:  2.5,
    hard:   1.25,
    missed: -2.5,
  };
  return round2_5(attempt1Weight + delta[feel]);
}

/**
 * Suggest attempt 3 based on attempt 2 feel.
 * Easy   → goalWeight + 2.5kg
 * Solid  → goalWeight
 * Hard   → goalWeight (still attempt it)
 * Missed → goalWeight - 2.5kg (flag goal reassessment)
 */
export function suggestAttempt3(
  attempt2Weight: number,
  feel: AttemptFeel,
  goalWeight: number,
): { weight: number; flagReassessment: boolean } {
  if (feel === "easy")   return { weight: round2_5(goalWeight + 2.5), flagReassessment: false };
  if (feel === "missed") return { weight: round2_5(goalWeight - 2.5), flagReassessment: true  };
  return { weight: goalWeight, flagReassessment: false };
}

// ── Post-test TM calculation ──────────────────────────────────────────────────

export interface TestResult {
  goalHit: boolean;
  newOneRm: number;
  newTm: number;
}

export function computePostTestState(
  bestSuccessfulWeight: number | null,
  goalWeight: number,
): TestResult {
  const newOneRm = bestSuccessfulWeight ?? goalWeight * 0.9; // fallback if all missed
  const newTm = round2_5(newOneRm * 0.9);
  return {
    goalHit: bestSuccessfulWeight !== null && bestSuccessfulWeight >= goalWeight,
    newOneRm,
    newTm,
  };
}

// ── Notification text helpers ─────────────────────────────────────────────────

export function peakWeekApproachingMessage(
  liftName: string,
  goalWeight: number,
): string {
  return `You're on track to test your ${goalWeight}kg ${liftName} in 4 weeks. Your final cycle will end with a max attempt week.`;
}

export function midCheckpointApproachingMessage(
  liftName: string,
  checkpointWeight: number,
): string {
  return `Halfway to your goal — time to see how far you've come. Your next cycle ends with a ${checkpointWeight}kg ${liftName} test.`;
}
