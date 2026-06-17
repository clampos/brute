// server/strength/wave531Service.ts
// 5/3/1 wave loading: 4-week cycles based on a Training Max (TM = 90% of 1RM).
// Weeks 1-3 have an AMRAP final set. Week 4 is deload.
// After week 3 AMRAP:
//   - ≥5 reps → TM += increment, advance
//   - 3-4 reps → TM unchanged, advance
//   - <3 reps → TM *= 0.95, advance

import { round2_5 } from "./trainingMaxService";
import { FIVE_THREE_ONE_WEEKS, TM_INCREMENTS, getBodyPart, getLiftName } from "./constants";
import type { StrengthLiftState, StrengthSessionPrescription, StrengthSetPrescription } from "./types";

export function prescribe531(
  state: StrengthLiftState,
  exerciseId: string,
): StrengthSessionPrescription {
  const tm = state.trainingMax ?? 0;
  const cycleWeek = Math.min(Math.max(state.cycleWeek ?? 1, 1), 4);
  const weekConfig = FIVE_THREE_ONE_WEEKS[cycleWeek - 1];
  const liftName = getLiftName(exerciseId);
  const isDeload = cycleWeek === 4;
  const isAmrapWeek = !isDeload;

  const mainSets: StrengthSetPrescription[] = weekConfig.percents.map((pct, i) => {
    const isLastSet = i === weekConfig.percents.length - 1;
    const isAmrap = isAmrapWeek && isLastSet;
    const targetWeight = tm > 0 ? round2_5(tm * pct) : 0;
    return {
      setNumber: i + 1,
      targetWeight,
      targetReps: isAmrap ? 0 : weekConfig.reps[i],
      isAmrap,
      percentageOfTm: pct,
    };
  });

  // First Set Last (FSL): 5×5 at the first main set weight on non-deload weeks
  const fslSets: StrengthSetPrescription[] = isDeload ? [] : Array.from({ length: 5 }, (_, i) => ({
    setNumber: mainSets.length + i + 1,
    targetWeight: mainSets[0]?.targetWeight ?? 0,
    targetReps: 5,
    isAmrap: false,
    percentageOfTm: weekConfig.percents[0],
    isFSL: true,
  }));

  const sets = [...mainSets, ...fslSets];

  const weekLabels = ["5/5/5+", "3/3/3+", "5/3/1+", "Deload"];
  const note = isDeload
    ? `Deload week — ${weekLabels[cycleWeek - 1]}. Light work, focus on technique.`
    : `Week ${cycleWeek} (${weekLabels[cycleWeek - 1]}) — last set is AMRAP. Cycle ${state.cycleNumber}.`;

  return {
    exerciseId,
    liftName,
    programmeType: "531",
    cycleWeek,
    cycleNumber: state.cycleNumber,
    sets,
    progressionNote: note,
    isAmrapWeek,
    trainingMax: tm,
  };
}

export function advance531(
  state: StrengthLiftState,
  amrapReps: number,
  exerciseId: string,
): Partial<StrengthLiftState> {
  const cycleWeek = state.cycleWeek ?? 1;
  const now = new Date().toISOString();

  // Weeks 1 and 2: just advance the week
  if (cycleWeek < 3) {
    return { cycleWeek: cycleWeek + 1, lastSessionAt: now };
  }

  // Week 3: evaluate AMRAP and advance to next cycle
  if (cycleWeek === 3) {
    const tm = state.trainingMax ?? 0;
    const bodyPart = getBodyPart(exerciseId);
    const increment = TM_INCREMENTS[bodyPart];

    let newTm: number;
    if (amrapReps >= 5) {
      newTm = round2_5(tm + increment);
    } else if (amrapReps >= 3) {
      newTm = tm;
    } else {
      newTm = round2_5(tm * 0.95);
    }

    return {
      cycleWeek: 4,  // proceed to deload
      cycleNumber: state.cycleNumber,
      trainingMax: newTm,
      lastSessionAt: now,
    };
  }

  // Week 4 (deload): complete cycle, reset to week 1
  return {
    cycleWeek: 1,
    cycleNumber: (state.cycleNumber ?? 1) + 1,
    lastSessionAt: now,
  };
}
