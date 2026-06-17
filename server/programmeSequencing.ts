import { PrismaClient } from "@prisma/client";

function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  const epley = weight * (1 + reps / 30);
  const brzycki = weight * (36 / (37 - reps));
  return (epley + brzycki) / 2;
}

export interface ProgrammeSignals {
  completionRate: number;   // 0–1, proportion of non-skipped workouts
  progressionRate: number;  // avg weekly volume change % (positive = improving)
  avgRpe: number;           // 1–10
  goalMet: boolean;
  experienceLevel: string;
  cycleNumber: number;
}

export type Recommendation = "ADVANCE" | "REPEAT" | "STEP_BACK";

export function computeRecommendation(signals: ProgrammeSignals): Recommendation {
  const { completionRate, progressionRate, avgRpe } = signals;

  // Poor adherence → must repeat before advancing
  if (completionRate < 0.7) return "REPEAT";

  // Struggling: volume declining AND RPE very high → step back
  if (progressionRate < 0 && avgRpe > 8) return "STEP_BACK";

  // Strong performance: advance
  if (completionRate >= 0.85 && progressionRate > 2 && avgRpe <= 7.5) return "ADVANCE";

  // Serviceable completion with goal met → advance
  if (signals.goalMet && completionRate >= 0.75) return "ADVANCE";

  return "REPEAT";
}

export async function computeSignals(
  userProgramId: string,
  prisma: PrismaClient
): Promise<ProgrammeSignals> {
  const userProgram = await prisma.userProgram.findUnique({
    where: { id: userProgramId },
    include: {
      programme: true,
      workouts: {
        include: {
          exercises: {
            include: { sets: true },
          },
        },
        orderBy: { completedAt: "asc" },
      },
      user: true,
    },
  });

  if (!userProgram) {
    return { completionRate: 0, progressionRate: 0, avgRpe: 5, goalMet: false, experienceLevel: "beginner", cycleNumber: 1 };
  }

  const workouts = userProgram.workouts;
  const totalWorkouts = workouts.length;
  if (totalWorkouts === 0) {
    return { completionRate: 0, progressionRate: 0, avgRpe: 5, goalMet: false, experienceLevel: userProgram.programme.experienceLevel ?? "beginner", cycleNumber: 1 };
  }

  // Completion rate: non-skipped / total
  const completedWorkouts = workouts.filter((w) => !w.skipped);
  const completionRate = completedWorkouts.length / totalWorkouts;

  // Average RPE from perceivedDifficulty
  const rpeSamples = completedWorkouts
    .map((w) => w.perceivedDifficulty)
    .filter((v): v is number => v !== null && v !== undefined);
  const avgRpe = rpeSamples.length > 0 ? rpeSamples.reduce((a, b) => a + b, 0) / rpeSamples.length : 6;

  // Weekly volume progression — compute total volume (sets × reps × weight) per week
  // Exclude the deload week (programLength + 1) so intentionally reduced volume doesn't skew the signal.
  const programLength = userProgram.programme.weeks;
  const deloadWeekNumber = programLength + 1;
  const weeklyVolume: Record<number, number> = {};
  for (const workout of completedWorkouts) {
    if (workout.skipped) continue;
    const week = workout.weekNumber ?? 1;
    if (week === deloadWeekNumber) continue;  // skip deload week
    let vol = 0;
    for (const ex of workout.exercises) {
      for (const s of ex.sets) {
        if (s.completed && s.weight && s.reps) {
          vol += s.weight * s.reps;
        }
      }
    }
    weeklyVolume[week] = (weeklyVolume[week] ?? 0) + vol;
  }

  const weekEntries = Object.entries(weeklyVolume)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, v]) => v);

  let progressionRate = 0;
  if (weekEntries.length >= 2) {
    const changes: number[] = [];
    for (let i = 1; i < weekEntries.length; i++) {
      const prev = weekEntries[i - 1];
      if (prev > 0) changes.push(((weekEntries[i] - prev) / prev) * 100);
    }
    if (changes.length > 0) {
      progressionRate = changes.reduce((a, b) => a + b, 0) / changes.length;
    }
  }

  // Count existing macro cycles to determine cycleNumber
  const cycleCount = await prisma.userMacroCycle.count({ where: { userId: userProgram.userId } });

  const experienceLevel = userProgram.programme.experienceLevel ?? userProgram.user.currentExperienceLevel ?? "beginner";

  // goalMet: simple heuristic — positive progression and good completion
  const goalMet = completionRate >= 0.75 && progressionRate >= 0;

  return {
    completionRate,
    progressionRate,
    avgRpe,
    goalMet,
    experienceLevel,
    cycleNumber: cycleCount + 1,
  };
}

export async function computeProgrammeStats(
  userProgramId: string,
  prisma: PrismaClient
): Promise<{
  totalWorkoutsCompleted: number;
  totalSets: number;
  totalVolumeKg: number;
  weeksCompleted: number;
  topExerciseName: string | null;
  topExerciseImprovement: number;
}> {
  const userProgram = await prisma.userProgram.findUnique({
    where: { id: userProgramId },
    include: {
      workouts: {
        include: {
          exercises: {
            include: { sets: true, exercise: true },
          },
        },
      },
    },
  });

  if (!userProgram) {
    return { totalWorkoutsCompleted: 0, totalSets: 0, totalVolumeKg: 0, weeksCompleted: 0, topExerciseName: null, topExerciseImprovement: 0 };
  }

  const completedWorkouts = userProgram.workouts.filter((w) => !w.skipped);
  let totalSets = 0;
  let totalVolumeKg = 0;

  // Track 1RM per exercise across weeks to find best improvement
  const exerciseFirstRM: Record<string, { name: string; first: number }> = {};
  const exerciseLastRM: Record<string, number> = {};

  for (const workout of completedWorkouts) {
    for (const ex of workout.exercises) {
      for (const s of ex.sets) {
        if (s.completed) {
          totalSets++;
          if (s.weight && s.reps) {
            totalVolumeKg += s.weight * s.reps;
            const rm = estimate1RM(s.weight, s.reps);
            const exId = ex.exerciseId;
            if (!exerciseFirstRM[exId]) {
              exerciseFirstRM[exId] = { name: ex.exercise.name, first: rm };
            }
            exerciseLastRM[exId] = rm;
          }
        }
      }
    }
  }

  let topExerciseName: string | null = null;
  let topExerciseImprovement = 0;
  for (const [exId, { name, first }] of Object.entries(exerciseFirstRM)) {
    const last = exerciseLastRM[exId] ?? first;
    const improvement = ((last - first) / first) * 100;
    if (improvement > topExerciseImprovement) {
      topExerciseImprovement = improvement;
      topExerciseName = name;
    }
  }

  const weeksCompleted = userProgram.currentWeek;

  return {
    totalWorkoutsCompleted: completedWorkouts.length,
    totalSets,
    totalVolumeKg: Math.round(totalVolumeKg),
    weeksCompleted,
    topExerciseName,
    topExerciseImprovement: Math.round(topExerciseImprovement),
  };
}

const levelOrder = ["beginner", "intermediate", "advanced"];

export function nextLevel(current: string): string {
  const idx = levelOrder.indexOf(current.toLowerCase());
  return idx >= 0 && idx < levelOrder.length - 1 ? levelOrder[idx + 1] : current;
}

export function prevLevel(current: string): string {
  const idx = levelOrder.indexOf(current.toLowerCase());
  return idx > 0 ? levelOrder[idx - 1] : current;
}
