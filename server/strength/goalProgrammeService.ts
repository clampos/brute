// server/strength/goalProgrammeService.ts
// Goal programme generator: projects a week-by-week training plan from
// current 1RM to a target weight, with milestones and adaptive timeline.

import { round2_5, calcTmFromOneRm } from "./trainingMaxService";
import { FIVE_THREE_ONE_WEEKS, TM_INCREMENTS, ADVANCED_INCREMENTS, LINEAR_INCREMENTS, LINEAR_SETS, LINEAR_REPS } from "./constants";
// LINEAR_SETS is now a plain number (3)
import type {
  GoalProgrammeWeek, GoalProgrammePreview, StrengthSetPrescription,
  ExperienceLevel, ProgrammeType, ProjectionUpdate, StrengthGoalProgramme,
} from "./types";

const MAX_WEEKS = 52;

// ── Preview computation ───────────────────────────────────────────────────────

export interface GoalPreviewParams {
  current1rm: number;
  targetWeight: number;   // target 1RM / working weight
  experienceLevel: ExperienceLevel;
  daysPerWeek: number;
  exerciseId: string;
}

export function computeGoalPreview(params: GoalPreviewParams): GoalProgrammePreview {
  const { current1rm, targetWeight, experienceLevel, daysPerWeek, exerciseId } = params;

  // Determine programme type and TM increments
  let programmeType: ProgrammeType;
  let tmIncrementUpper: number;
  let tmIncrementLower: number;

  if (experienceLevel === "beginner") {
    programmeType = "LINEAR";
    tmIncrementUpper = LINEAR_INCREMENTS.upper;
    tmIncrementLower = LINEAR_INCREMENTS.lower;
  } else if (experienceLevel === "advanced") {
    programmeType = "531";
    tmIncrementUpper = ADVANCED_INCREMENTS.upper;
    tmIncrementLower = ADVANCED_INCREMENTS.lower;
  } else {
    programmeType = "531";
    tmIncrementUpper = TM_INCREMENTS.upper;
    tmIncrementLower = TM_INCREMENTS.lower;
  }

  // Determine body part for increment selection
  const lowerExercises = ["quads_barbell_squat", "back_deadlift"];
  const isLower = lowerExercises.includes(exerciseId);
  const tmIncrement = isLower ? tmIncrementLower : tmIncrementUpper;

  const startTm = calcTmFromOneRm(current1rm);
  const startingWeight = programmeType === "LINEAR" ? round2_5(current1rm * 0.7) : startTm;

  // Gap from current TM to target
  const gap = targetWeight - startTm;
  const milestoneWeights = [0.25, 0.50, 0.75, 1.00].map((pct) =>
    round2_5(startTm + gap * pct),
  );

  const weeks: GoalProgrammeWeek[] = [];
  let weekNumber = 0;
  let currentTm = startTm;
  let linearWeight = startingWeight;
  let goalReached = false;

  while (weekNumber < MAX_WEEKS && !goalReached) {
    weekNumber++;
    const cycleWeek = ((weekNumber - 1) % 4) + 1;  // 1-4 repeating
    const isDeload = cycleWeek === 4;

    let sets: StrengthSetPrescription[];
    let estimatedTm: number;

    if (programmeType === "LINEAR") {
      sets = Array.from({ length: LINEAR_SETS }, (_, i) => ({
        setNumber: i + 1,
        targetWeight: linearWeight,
        targetReps: LINEAR_REPS,
        isAmrap: false,
        percentageOfTm: 0,
      }));
      estimatedTm = linearWeight;

      if (!isDeload) linearWeight = round2_5(linearWeight + tmIncrement);
    } else {
      const weekConfig = FIVE_THREE_ONE_WEEKS[cycleWeek - 1];
      const isDeload531 = cycleWeek === 4;
      const mainSets: StrengthSetPrescription[] = weekConfig.percents.map((pct, i) => {
        const isLastSet = i === weekConfig.percents.length - 1;
        const isAmrap = !isDeload531 && isLastSet;
        return {
          setNumber: i + 1,
          targetWeight: round2_5(currentTm * pct),
          targetReps: isAmrap ? 0 : weekConfig.reps[i],
          isAmrap,
          percentageOfTm: pct,
        };
      });
      const fslSets: StrengthSetPrescription[] = isDeload531 ? [] : Array.from({ length: 5 }, (_, i) => ({
        setNumber: mainSets.length + i + 1,
        targetWeight: mainSets[0]?.targetWeight ?? 0,
        targetReps: 5,
        isAmrap: false,
        percentageOfTm: weekConfig.percents[0],
        isFSL: true,
      }));
      sets = [...mainSets, ...fslSets];
      estimatedTm = currentTm;

      // TM increases after week 3 (completing the cycle)
      if (cycleWeek === 3) {
        currentTm = round2_5(currentTm + tmIncrement);
      }
    }

    // Check milestone
    const progressTm = programmeType === "LINEAR" ? linearWeight : currentTm;
    const milestoneIdx = milestoneWeights.findIndex(
      (mw) => progressTm >= mw && (weekNumber === 1 || !weeks.some((w) => w.milestone === `${[25, 50, 75, 100][milestoneWeights.indexOf(mw)]}%` as any)),
    );
    const milestoneLabel = milestoneIdx >= 0
      ? ([null, "25%", "50%", "75%", "100%"] as const)[milestoneIdx + 1]
      : undefined;

    const week: GoalProgrammeWeek = {
      weekNumber,
      cycleWeek,
      isDeload,
      estimatedTm,
      sets,
    };
    if (milestoneLabel) {
      week.milestone = milestoneLabel as any;
    }
    weeks.push(week);

    const effectiveTm = programmeType === "LINEAR" ? linearWeight : currentTm;
    if (effectiveTm >= targetWeight) goalReached = true;
  }

  const isUnrealistic = !goalReached;
  const projectedWeeks = isUnrealistic ? MAX_WEEKS : weekNumber;

  // Compute projected end date
  const projectedEndDate = addWeeks(new Date(), projectedWeeks);

  let realisticProjection: string | undefined;
  if (isUnrealistic) {
    // Compute how many weeks it would ACTUALLY take (up to 5 years)
    let extraWeeks = MAX_WEEKS;
    let tempTm = currentTm;
    let tempLinear = linearWeight;
    for (let w = 0; w < 260; w++) {
      const cw = (w % 4) + 1;
      if (programmeType === "LINEAR") {
        if (cw !== 4) tempLinear = round2_5(tempLinear + tmIncrement);
        if (tempLinear >= targetWeight) { extraWeeks = MAX_WEEKS + w; break; }
      } else {
        if (cw === 3) tempTm = round2_5(tempTm + tmIncrement);
        if (tempTm >= targetWeight) { extraWeeks = MAX_WEEKS + w; break; }
      }
    }
    const totalWeeks = extraWeeks;
    const months = Math.round(totalWeeks / 4.33);
    realisticProjection = months < 12
      ? `approximately ${months} months`
      : `approximately ${(months / 12).toFixed(1)} years`;
  }

  return {
    startTm,
    targetWeight,
    projectedWeeks,
    projectedEndDate: projectedEndDate.toISOString().split("T")[0],
    isUnrealistic,
    realisticProjection,
    programmeType,
    weeks,
  };
}

// ── Milestone assignment (deterministic, based on TM progress) ────────────────

function assignMilestones(weeks: GoalProgrammeWeek[], startTm: number, targetWeight: number): void {
  const gap = targetWeight - startTm;
  const thresholds: Array<[number, "25%" | "50%" | "75%" | "100%"]> = [
    [0.25, "25%"], [0.50, "50%"], [0.75, "75%"], [1.00, "100%"],
  ];
  const assigned = new Set<string>();

  for (const week of weeks) {
    const progress = (week.estimatedTm - startTm) / gap;
    for (const [pct, label] of thresholds) {
      if (!assigned.has(label) && progress >= pct) {
        week.milestone = label;
        assigned.add(label);
        break;
      }
    }
  }
}

// ── Projection re-evaluation after a completed session ────────────────────────

export function recomputeProjection(
  goal: StrengthGoalProgramme,
  newTm: number,
): ProjectionUpdate | null {
  const sessionsCompleted = goal.sessionsCompleted + 1;
  const daysSinceStart = Math.max(
    1,
    (Date.now() - new Date(goal.startDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  // Actual rate: kg gained per day
  const tmGained = newTm - goal.startTm;
  const actualRatePerDay = tmGained / daysSinceStart;

  // Remaining gap
  const remainingGap = goal.targetWeight - newTm;

  if (remainingGap <= 0) {
    const today = new Date().toISOString().split("T")[0];
    return {
      newProjectedEndDate: today,
      weeksChange: -999,
      reason: "Goal achieved!",
      significant: true,
    };
  }

  if (actualRatePerDay <= 0) return null;  // no progress yet

  const daysRemaining = remainingGap / actualRatePerDay;
  const newEndDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
  const newEndDateStr = newEndDate.toISOString().split("T")[0];

  const currentProjected = new Date(goal.projectedEndDate);
  const weeksDiff = Math.round((newEndDate.getTime() - currentProjected.getTime()) / (7 * 24 * 60 * 60 * 1000));

  if (Math.abs(weeksDiff) < 2) return null;  // not significant enough

  const direction = weeksDiff > 0 ? "slower" : "faster";
  const abs = Math.abs(weeksDiff);
  const reason = weeksDiff < 0
    ? `You're progressing ${abs} week${abs !== 1 ? "s" : ""} ahead of schedule. Goal date updated forward.`
    : `Progress is ${abs} week${abs !== 1 ? "s" : ""} behind initial projection. Goal date updated.`;

  return {
    newProjectedEndDate: newEndDateStr,
    weeksChange: weeksDiff,
    reason,
    significant: true,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export function formatProjectedDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
