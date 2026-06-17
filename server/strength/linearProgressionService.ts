// server/strength/linearProgressionService.ts
// Linear progression: fixed weight increments every session.
// Squat 3×5, Bench 3×5, Deadlift 1×5, OHP 3×5.
// After 3 consecutive failures → switch to DOUBLE progression.

import { round2_5 } from "./trainingMaxService";
import {
  LINEAR_INCREMENTS, LINEAR_SETS, LINEAR_REPS,
  getBodyPart, getLiftName,
} from "./constants";
// LINEAR_SETS is now a plain number (3) — all big-4 lifts use 3×5
import type { StrengthLiftState, StrengthSessionPrescription, StrengthSetPrescription } from "./types";

export function prescribeLinear(
  state: StrengthLiftState,
  exerciseId: string,
): StrengthSessionPrescription {
  const sets = LINEAR_SETS;
  const weight = state.linearWeight ?? 0;
  const liftName = getLiftName(exerciseId);
  const isFirstSession = !state.linearWeight;

  const setDefs: StrengthSetPrescription[] = Array.from({ length: sets }, (_, i) => ({
    setNumber: i + 1,
    targetWeight: weight,
    targetReps: LINEAR_REPS,
    isAmrap: false,
    percentageOfTm: 0,
  }));

  const note = isFirstSession
    ? `Enter the weight you want to start with — this will be your first ${sets}×${LINEAR_REPS} session.`
    : state.consecutiveFailures > 0
    ? `${state.consecutiveFailures} failure(s) recorded. Hit all ${sets}×${LINEAR_REPS} to continue progressing.`
    : `Add ${LINEAR_INCREMENTS[getBodyPart(exerciseId)]}kg to last session's weight if you hit all reps.`;

  return {
    exerciseId,
    liftName,
    programmeType: "LINEAR",
    cycleWeek: 1,
    cycleNumber: state.cycleNumber,
    sets: setDefs,
    progressionNote: note,
    isAmrapWeek: false,
    trainingMax: null,
  };
}

export function advanceLinear(
  state: StrengthLiftState,
  repsPerSet: number[],
  exerciseId: string,
): Partial<StrengthLiftState> {
  const targetReps = LINEAR_REPS;
  const allSetsHit = repsPerSet.every((r) => r >= targetReps);
  const bodyPart = getBodyPart(exerciseId);
  const increment = LINEAR_INCREMENTS[bodyPart];
  const now = new Date().toISOString();

  if (allSetsHit) {
    const newWeight = round2_5((state.linearWeight ?? 0) + increment);
    return {
      linearWeight: newWeight,
      consecutiveFailures: 0,
      lastSessionAt: now,
    };
  }

  const newFailures = (state.consecutiveFailures ?? 0) + 1;

  if (newFailures >= 3) {
    // Switch to double progression; derive TM from current weight
    const currentWeight = state.linearWeight ?? 0;
    const estimatedTm = round2_5(currentWeight * 1.05);
    return {
      programmeType: "DOUBLE",
      trainingMax: estimatedTm,
      consecutiveFailures: 0,
      lastSessionAt: now,
    };
  }

  return {
    consecutiveFailures: newFailures,
    lastSessionAt: now,
  };
}
