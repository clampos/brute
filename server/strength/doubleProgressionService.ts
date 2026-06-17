// server/strength/doubleProgressionService.ts
// Double progression bridge: 4 sets of 5 reps, working up to 4×8.
// Once 4×8 is hit, increase weight by 2.5 kg and reset to 4×5.
// After 4 successful weight increases, transition to 5/3/1.

import { round2_5 } from "./trainingMaxService";
import { DOUBLE_SETS, DOUBLE_REP_RANGE, DOUBLE_INCREMENT, getLiftName } from "./constants";
import type { StrengthLiftState, StrengthSessionPrescription, StrengthSetPrescription } from "./types";

export function prescribeDouble(
  state: StrengthLiftState,
  exerciseId: string,
): StrengthSessionPrescription {
  const weight = state.trainingMax ?? state.linearWeight ?? 0;
  const liftName = getLiftName(exerciseId);
  const [minReps, maxReps] = DOUBLE_REP_RANGE;

  const setDefs: StrengthSetPrescription[] = Array.from({ length: DOUBLE_SETS }, (_, i) => ({
    setNumber: i + 1,
    targetWeight: weight,
    targetReps: minReps,
    isAmrap: false,
    percentageOfTm: 0,
  }));

  return {
    exerciseId,
    liftName,
    programmeType: "DOUBLE",
    cycleWeek: 1,
    cycleNumber: state.cycleNumber,
    sets: setDefs,
    progressionNote: `Hit ${DOUBLE_SETS}×${maxReps} to add ${DOUBLE_INCREMENT}kg. After 4 successful increases you'll move to 5/3/1.`,
    isAmrapWeek: false,
    trainingMax: weight,
  };
}

export function advanceDouble(
  state: StrengthLiftState,
  repsPerSet: number[],
  exerciseId: string,
): Partial<StrengthLiftState> {
  const [, maxReps] = DOUBLE_REP_RANGE;
  const now = new Date().toISOString();
  const currentWeight = state.trainingMax ?? state.linearWeight ?? 0;

  // Count main sets only (DOUBLE has no FSL)
  const allAtMax = repsPerSet.slice(0, DOUBLE_SETS).every((r) => r >= maxReps);

  if (allAtMax) {
    const newWeight = round2_5(currentWeight + DOUBLE_INCREMENT);
    const newCycleNumber = (state.cycleNumber ?? 1) + 1;

    // After 4 successful weight increases transition to 5/3/1
    if (newCycleNumber >= 4) {
      return {
        programmeType: "531",
        trainingMax: round2_5(newWeight / 0.9),  // set TM from the new working weight
        consecutiveFailures: 0,
        cycleWeek: 1,
        cycleNumber: 1,
        lastSessionAt: now,
      };
    }

    return {
      trainingMax: newWeight,
      consecutiveFailures: 0,
      cycleNumber: newCycleNumber,
      lastSessionAt: now,
    };
  }

  return {
    consecutiveFailures: (state.consecutiveFailures ?? 0) + 1,
    lastSessionAt: now,
  };
}
