// server/strength/constants.ts
// All constants for the dedicated strength progression system.

export type BodyPart = "upper" | "lower";
export type ProgrammeType = "LINEAR" | "DOUBLE" | "531";

export const BIG_4 = {
  SQUAT:    { exerciseId: "quads_barbell_squat",  name: "Squat",          bodyPart: "lower" as BodyPart },
  BENCH:    { exerciseId: "chest_barbell_bench",   name: "Bench Press",    bodyPart: "upper" as BodyPart },
  DEADLIFT: { exerciseId: "back_deadlift",         name: "Deadlift",       bodyPart: "lower" as BodyPart },
  OHP:      { exerciseId: "shoulders_ohp",         name: "Overhead Press", bodyPart: "upper" as BodyPart },
} as const;

export const BIG_4_IDS = Object.values(BIG_4).map((l) => l.exerciseId);

export function isBig4(exerciseId: string): boolean {
  return (BIG_4_IDS as readonly string[]).includes(exerciseId);
}

export function getBodyPart(exerciseId: string): BodyPart {
  for (const lift of Object.values(BIG_4)) {
    if (lift.exerciseId === exerciseId) return lift.bodyPart;
  }
  return "upper";
}

export function getLiftName(exerciseId: string): string {
  for (const lift of Object.values(BIG_4)) {
    if (lift.exerciseId === exerciseId) return lift.name;
  }
  return "Lift";
}

// Training max = 90% of 1RM
export const TM_PERCENT = 0.90;

// TM increments per completed 5/3/1 cycle
export const TM_INCREMENTS: Record<BodyPart, number> = { upper: 2.5, lower: 5.0 };

// Linear progression increments per successful session
export const LINEAR_INCREMENTS: Record<BodyPart, number> = { upper: 2.5, lower: 5.0 };

// Advanced periodisation increments (slower)
export const ADVANCED_INCREMENTS: Record<BodyPart, number> = { upper: 1.25, lower: 2.5 };

// Linear programme scheme — all big 4 lifts use 3×5
export const LINEAR_SETS = 3;
export const LINEAR_REPS = 5;

// Double progression: always 4 sets, 5–8 rep range, fixed 2.5 kg increment
export const DOUBLE_SETS = 4;
export const DOUBLE_REP_RANGE: [number, number] = [5, 8];
export const DOUBLE_INCREMENT = 2.5;

// 5/3/1 weekly prescription
// percents = % of TM; reps = target reps for non-AMRAP sets (last set weeks 1-3 is AMRAP)
export const FIVE_THREE_ONE_WEEKS = [
  { week: 1, percents: [0.65, 0.75, 0.85], reps: [5, 5, 5] },
  { week: 2, percents: [0.70, 0.80, 0.90], reps: [3, 3, 3] },
  { week: 3, percents: [0.75, 0.85, 0.95], reps: [5, 3, 1] },
  { week: 4, percents: [0.40, 0.50, 0.60], reps: [5, 5, 5] }, // deload
] as const;

// Accessories per day in strength programme
export const ACCESSORY_COUNT = 3;

// Strength programme accessories by main lift day
export const STRENGTH_ACCESSORY_MUSCLES: Record<string, string[]> = {
  "quads_barbell_squat":  ["Hamstrings", "Glutes", "Quads"],
  "chest_barbell_bench":  ["Triceps", "Chest", "Shoulders"],
  "back_deadlift":        ["Back", "Hamstrings", "Glutes"],
  "shoulders_ohp":        ["Shoulders", "Triceps", "Back"],
};
