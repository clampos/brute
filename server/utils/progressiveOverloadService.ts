// server/utils/progressiveOverloadService.ts
import { prisma } from "../prisma.js";

export interface WorkoutSetData {
  weight: number;
  reps: number;
  targetReps?: number;
  completed: boolean;
  isDropSet?: boolean;
  dropSetGroupId?: string;
}

interface SetDefinition {
  type: "main" | "drop";
  groupId?: string;
}

export interface ExerciseSetLayout {
  exerciseId: string;
  setDefinitions: SetDefinition[];
}

interface WorkoutSetHistory extends WorkoutSetData {
  setNumber: number;
  targetReps: number;
  setType: "main" | "drop";
  dropSetGroupId?: string;
}

export interface WorkoutData {
  exerciseId: string;
  sets: WorkoutSetData[];
}

export interface SetProgressionRecommendation {
  setNumber: number;
  recommendedWeight: number;
  recommendedReps: number;
}

export interface ProgressionRecommendation {
  exerciseId: string;
  recommendedWeight: number;
  recommendedReps: number;
  recommendedRPE: number;
  progressionType:
    | "NORMAL"
    | "AT_REP_CAP"
    | "WEIGHT_INCREASE"
    | "INTENSITY_FOCUS"
    | "REP_CAP"
    | "FAILURE"
    | "MANUAL_JUMP"
    | "UNDERPERFORMANCE"
    | "OVERPERFORMANCE"
    | "DELOAD"
    | "INITIAL";
  reasoning: string;
  setRecommendations: SetProgressionRecommendation[];
  volumeSuggestion?: "add_set" | "add_exercise" | null;
}

interface PerformanceHistory {
  weekNumber: number;
  actualReps: number;
  targetReps: number;
  weight: number;
}

type StrengthExerciseRole = "MAIN_LIFT" | "SUPPLEMENTAL" | "ACCESSORY";

interface StrengthExerciseMeta {
  role: StrengthExerciseRole;
  name: string;
  muscleGroup: string;
}

interface StrengthCycleTemplate {
  sets: number;
  reps: number;
  percent: number;
  rpe: number;
  progressionType: ProgressionRecommendation["progressionType"];
}

export interface WeeklySummary {
  strengthGainVsLastWeek: number | null; // percentage
  strengthGainVsProgramStart: number | null; // percentage
  weekOnWeekVsWeek1: number | null; // percentage context for current week vs week 1
  previousWorkoutComparison: {
    totalVolumeChangePct: number | null;
    totalCurrentVolume: number;
    totalPreviousVolume: number;
    totalExtraWeightMovedKg: number;
    exerciseDeltas: Array<{
      exerciseId: string;
      exerciseName: string;
      currentVolume: number;
      previousVolume: number;
      changePct: number | null;
      extraWeightMovedKg: number;
    }>;
  } | null;
  personalRecords: Array<{
    exerciseId: string;
    exerciseName: string;
    metric: "reps" | "weight" | "volume" | "repsAtWeight";
    value: number;
    previousBest: number;
    contextWeightKg?: number;
  }>;
  newRepMaxes: Array<{
    exerciseName: string;
    reps: number;
    weight: number;
  }>;
  isEndOfWeek: boolean;
  weeklySetsByMuscleGroup?: Record<string, number>;
}

export class ProgressiveOverloadService {
  // Constants from your rules
  private static readonly REP_CAP = 15;
  private static readonly REP_FAIL = 5;
  private static readonly WEIGHT_INCREASE_PERCENT = 0.05;
  private static readonly WEIGHT_DECREASE_PERCENT = 0.1;
  private static readonly MANUAL_INCREASE_THRESHOLD = 1.1;
  private static readonly OVERPERFORMANCE_THRESHOLD = 1.1;

  private static parseWorkoutSetDefinition(notes?: string | null): SetDefinition {
    if (!notes) {
      return { type: "main" };
    }

    try {
      const parsed = JSON.parse(notes);
      return {
        type: parsed?.type === "drop" ? "drop" : "main",
        groupId: parsed?.groupId,
      };
    } catch {
      return { type: "main" };
    }
  }

  private static normalizeCurrentSetDefinitions(
    setDefinitions: SetDefinition[] | undefined,
    setCount: number,
  ): SetDefinition[] {
    const count = setDefinitions ? Math.max(setCount, setDefinitions.length) : setCount;
    return Array.from({ length: count }, (_, index) => {
      const definition = setDefinitions?.[index];
      return {
        type: definition?.type === "drop" ? "drop" : "main",
        groupId: definition?.groupId,
      };
    });
  }

  /**
   * Generate RPE progression table based on program length
   * Rules:
   * - Base programme week 1 starts at RPE 7
   * - Final base programme week reaches RPE 10
   * - Optional post-programme deload week is appended at RPE 5
   */
  private static generateRPETable(programLength: number): number[] {
    const baseWeeks = Math.max(1, programLength);
    const baseRPEs: number[] = [];

    if (baseWeeks === 1) {
      baseRPEs.push(7);
    } else {
      for (let weekIndex = 0; weekIndex < baseWeeks; weekIndex += 1) {
        const progress = weekIndex / (baseWeeks - 1);
        const rpe = Math.round(7 + progress * 3); // 7 -> 10
        baseRPEs.push(Math.max(7, Math.min(10, rpe)));
      }
    }

    // Append optional deload week at the end.
    return [...baseRPEs, 5];
  }

  /**
   * Get performance history for an exercise over the last N weeks
   */
  private static async getPerformanceHistory(
    userId: string,
    exerciseId: string,
    weeks: number = 3,
  ): Promise<PerformanceHistory[]> {
    const workouts = await prisma.workout.findMany({
      where: {
        userProgram: {
          userId,
          status: "ACTIVE",
        },
        exercises: {
          some: {
            exerciseId,
          },
        },
      },
      select: {
        weekNumber: true,
        exercises: {
          where: {
            exerciseId,
          },
          include: {
            sets: {
              where: {
                completed: true,
              },
              orderBy: {
                setNumber: "asc",
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
      take: weeks,
    });

    return workouts
      .map((workout) => {
        const exercise = workout.exercises[0];
        if (!exercise || exercise.sets.length === 0) {
          return {
            weekNumber: workout.weekNumber || 0,
            actualReps: 0,
            targetReps: 0,
            weight: 0,
          };
        }

        const mainSets = exercise.sets.filter(
          (set) => this.parseWorkoutSetDefinition(set.notes).type === "main",
        );
        const candidateSets = mainSets.length > 0 ? mainSets : exercise.sets;

        // Get best set (highest reps at given weight, or highest volume)
        const bestSet = candidateSets.reduce((best, current) => {
          const bestVolume = (best.weight || 0) * (best.reps || 0);
          const currentVolume = (current.weight || 0) * (current.reps || 0);
          return currentVolume > bestVolume ? current : best;
        });

        return {
          weekNumber: workout.weekNumber || 0,
          actualReps: bestSet.reps || 0,
          targetReps: bestSet.targetReps || bestSet.reps || 0,
          weight: bestSet.weight || 0,
        };
      })
      .reverse(); // Reverse to get chronological order
  }

  private static async getLastWorkoutSetsForExercise(
    userId: string,
    exerciseId: string,
  ): Promise<WorkoutSetHistory[]> {
    const workout = await prisma.workout.findFirst({
      where: {
        userProgram: {
          userId,
          status: "ACTIVE",
        },
        exercises: {
          some: {
            exerciseId,
          },
        },
      },
      select: {
        exercises: {
          where: {
            exerciseId,
          },
          include: {
            sets: {
              orderBy: {
                setNumber: "asc",
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    const exercise = workout?.exercises?.[0];
    if (!exercise) return [];

    return exercise.sets.map((set) => {
      const setDefinition = this.parseWorkoutSetDefinition(set.notes);
      return {
        setNumber: set.setNumber,
        weight: set.weight || 0,
        reps: set.reps || 0,
        targetReps: set.targetReps ?? set.reps ?? 0,
        completed: set.completed,
        setType: setDefinition.type,
        dropSetGroupId: setDefinition.groupId,
      };
    });
  }

  private static calculateSetRecommendation(
    previousSet: WorkoutSetHistory,
    currentRPE: number,
    sets: number,
    progressionType: ProgressionRecommendation["progressionType"],
  ): SetProgressionRecommendation {
    let recommendedWeight = previousSet.weight;
    // Drive per-set progression from what the user actually achieved last session.
    // Using stale target reps can over-prescribe after misses (e.g. 5,5,5 -> 10,7,7).
    let recommendedReps = previousSet.reps;

    if (progressionType === "MANUAL_JUMP") {
      recommendedWeight = previousSet.weight;
      recommendedReps = previousSet.reps;
    } else if (progressionType === "UNDERPERFORMANCE") {
      recommendedWeight = previousSet.weight * (1 - this.WEIGHT_DECREASE_PERCENT);
      recommendedReps = Math.max(
        1,
        Math.floor(previousSet.reps * 0.9),
      );
    } else if (progressionType === "OVERPERFORMANCE") {
      recommendedWeight = previousSet.weight * (1 + this.WEIGHT_INCREASE_PERCENT);
      recommendedReps = this.calculateVolumePreservingReps(
        previousSet.weight,
        previousSet.reps,
        recommendedWeight,
        sets,
      );
    } else if (progressionType === "FAILURE") {
      recommendedWeight = previousSet.weight * (1 - this.WEIGHT_DECREASE_PERCENT);
      recommendedReps = this.REP_FAIL;
    } else if (progressionType === "REP_CAP") {
      recommendedWeight = previousSet.weight * (1 + this.WEIGHT_INCREASE_PERCENT);
      recommendedReps = this.calculateVolumePreservingReps(
        previousSet.weight,
        previousSet.reps,
        recommendedWeight,
        sets,
      );
    } else if (progressionType === "DELOAD") {
      recommendedWeight = previousSet.weight * 0.55;
      recommendedReps = previousSet.reps;
    } else if (progressionType === "NORMAL") {
      recommendedWeight = previousSet.weight;
      recommendedReps = Math.min(previousSet.reps + 1, this.REP_CAP);
    }

    recommendedWeight = this.roundToNearestIncrement(recommendedWeight, 2.5);

    return {
      setNumber: previousSet.setNumber,
      recommendedWeight,
      recommendedReps,
    };
  }

  private static buildSetRecommendations(
    previousSets: WorkoutSetHistory[],
    currentSetDefinitions: SetDefinition[],
    currentRPE: number,
    progressionType: ProgressionRecommendation["progressionType"],
  ): SetProgressionRecommendation[] {
    if (previousSets.length === 0) {
      // No hardcoded load/reps for a brand new exercise; guide by RPE only.
      return [];
    }

    const previousMainSets = previousSets.filter(
      (set) => set.setType !== "drop",
    );
    const previousDropSets = previousSets.filter(
      (set) => set.setType === "drop",
    );

    const effectiveDefinitions =
      progressionType === "DELOAD"
        ? (() => {
            const mainSetIndexes = currentSetDefinitions
              .map((definition, idx) => ({ definition, idx }))
              .filter((item) => item.definition.type !== "drop")
              .map((item) => item.idx);

            const keepMainSets = Math.max(1, Math.ceil(mainSetIndexes.length * 0.5));
            const keepSetIndexes = new Set(mainSetIndexes.slice(0, keepMainSets));

            return currentSetDefinitions.map((definition, idx) =>
              keepSetIndexes.has(idx) ? definition : { type: "drop" as const },
            );
          })()
        : currentSetDefinitions;

    let mainIndex = 0;
    let dropIndex = 0;

    return effectiveDefinitions.flatMap((definition, idx) => {
      const previousSet =
        definition.type === "drop"
          ? previousDropSets[dropIndex++]
          : previousMainSets[mainIndex++];

      if (!previousSet) {
        return [];
      }

      const setRecommendation = this.calculateSetRecommendation(
        previousSet,
        currentRPE,
        currentSetDefinitions.length,
        progressionType,
      );

      return {
        ...setRecommendation,
        setNumber: idx + 1,
      };
    });
  }

  /**
   * Calculate volume-preserving reps when weight changes
   * V_prev = S * R * W
   * R_next = V_prev / (S * W_next)
   * Clamp between 8-12
   */
  private static calculateVolumePreservingReps(
    previousWeight: number,
    previousReps: number,
    newWeight: number,
    sets: number,
  ): number {
    const previousVolume = sets * previousReps * previousWeight;
    let newReps = Math.round(previousVolume / (sets * newWeight));

    // Clamp between 8-12 for volume preservation
    return Math.max(8, Math.min(12, newReps));
  }

  private static getStrengthCycleWeek(currentWeek: number): number {
    return ((Math.max(currentWeek, 1) - 1) % 4) + 1;
  }

  private static getStrengthCycleTemplate(cycleWeek: number): StrengthCycleTemplate {
    switch (cycleWeek) {
      case 1:
        return { sets: 3, reps: 5, percent: 0.7, rpe: 7, progressionType: "NORMAL" };
      case 2:
        return { sets: 3, reps: 3, percent: 0.8, rpe: 8, progressionType: "NORMAL" };
      case 3:
        return { sets: 3, reps: 1, percent: 0.9, rpe: 9, progressionType: "NORMAL" };
      default:
        return { sets: 3, reps: 5, percent: 0.6, rpe: 5, progressionType: "DELOAD" };
    }
  }

  private static estimateOneRepMax(weight: number, reps: number): number {
    if (weight <= 0 || reps <= 0) return 0;
    return weight * (1 + reps / 30);
  }

  private static roundToNearestIncrement(value: number, increment: number = 2.5): number {
    if (value <= 0) return 0;
    return Math.max(increment, Math.round(value / increment) * increment);
  }

  private static getMainLiftIncrementKg(
    exerciseName: string,
    muscleGroup: string,
  ): number {
    const normalizedName = exerciseName.toLowerCase();
    const normalizedGroup = muscleGroup.toLowerCase();

    if (
      normalizedName.includes("deadlift") ||
      normalizedName.includes("squat") ||
      normalizedGroup.includes("quadriceps") ||
      normalizedGroup.includes("hamstrings") ||
      normalizedGroup.includes("glutes")
    ) {
      return 5;
    }

    return 2.5;
  }

  private static parseRepRange(repsString: string): { min: number; max: number } {
    const rangeMatch = repsString.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
    }
    const singleMatch = repsString.match(/^(\d+)$/);
    if (singleMatch) {
      const val = parseInt(singleMatch[1], 10);
      return { min: val, max: val };
    }
    return { min: 8, max: 12 };
  }

  private static async getOrCreateExerciseProgression(
    userId: string,
    userProgramId: string,
    exerciseId: string,
  ) {
    const existing = await prisma.userExerciseProgression.findUnique({
      where: { userProgramId_exerciseId: { userProgramId, exerciseId } },
    });
    if (existing) return existing;

    return prisma.userExerciseProgression.create({
      data: {
        userId,
        userProgramId,
        exerciseId,
        progressionPhase: "rep_progression",
        consecutiveSessionsAtMaxReps: 0,
        weeksAtCurrentSetCount: 0,
      },
    });
  }

  /**
   * Muscle building progression logic (MUSCLE_BUILDING programmes only).
   *
   * Phase flow:
   *   rep_progression  → add 1 rep/session within target range (e.g. 8–12)
   *   AT_REP_CAP       → hit max reps; accumulate consecutive sessions (default 3 needed)
   *   WEIGHT_INCREASE  → after N consecutive sessions at max reps: +5% weight, reset to min reps
   *   set_progression  → after 6 weeks at current set count: suggest adding a set (up to 5)
   *   exercise_addition→ at 5 sets: suggest adding a complementary exercise instead
   *   intensity_focus  → volume caps reached (5 sets/exercise + 20 sets/muscle group or 25 sets/workout)
   *
   * Volume caps:
   *   5 sets per exercise | 20 sets per muscle group | 25 sets per workout
   */
  private static async calculateMuscleBuildingRecommendation(
    userId: string,
    userProgramId: string,
    exerciseId: string,
    currentWeek: number,
    programLength: number,
    lastWorkoutSets: WorkoutSetHistory[],
    history: PerformanceHistory[],
    setCount: number,
    currentSetDefinitions: SetDefinition[],
    programmeReps: string,
    muscleGroupTotalSets: number,
    totalWorkoutSets: number,
    muscleGroup: string = "",
  ): Promise<ProgressionRecommendation> {
    const rpeTable = this.generateRPETable(programLength);
    const currentRPE = rpeTable[Math.min(currentWeek - 1, rpeTable.length - 1)];
    const isDeloadWeek = currentWeek === programLength + 1;

    const repRange = this.parseRepRange(programmeReps);

    const MAX_SETS_PER_EXERCISE = 5;
    const MAX_MUSCLE_GROUP_SETS = 20;
    const MAX_WORKOUT_SETS = 25;
    const SESSIONS_NEEDED_FOR_WEIGHT_INCREASE = 3;
    const WEEKS_BEFORE_SET_INCREASE = 6;

    const lowerBodyGroups = ["Quads", "Hamstrings", "Glutes", "Back", "quads", "hamstrings", "glutes", "back"];
    const weightIncrement = lowerBodyGroups.includes(muscleGroup) ? 5 : 2.5;

    const buildSets = (
      weight: number,
      reps: number,
      type: ProgressionRecommendation["progressionType"],
    ): SetProgressionRecommendation[] => {
      if (lastWorkoutSets.length === 0) return [];

      const previousMainSets = lastWorkoutSets.filter((s) => s.setType !== "drop");
      const previousDropSets = lastWorkoutSets.filter((s) => s.setType === "drop");
      let mainIndex = 0;
      let dropIndex = 0;

      const defs =
        type === "DELOAD"
          ? (() => {
              const mains = currentSetDefinitions.filter((d) => d.type !== "drop");
              const keep = Math.max(1, Math.ceil(mains.length * 0.5));
              return mains.slice(0, keep);
            })()
          : currentSetDefinitions;

      return defs.map((def, i) => {
        if (def.type === "drop") {
          const prev = previousDropSets[dropIndex++];
          return {
            setNumber: i + 1,
            recommendedWeight: prev?.weight ?? this.roundToNearestIncrement(weight * 0.8, weightIncrement),
            recommendedReps: prev?.reps ?? reps,
          };
        }
        const prev = previousMainSets[mainIndex++];
        // For rep-progression types, progress each set individually from its own last reps.
        // If no previous set exists (new set just added), default to the bottom of the rep range.
        const setReps =
          (type === "NORMAL" || type === "AT_REP_CAP") && prev
            ? Math.min(prev.reps + 1, repRange.max)
            : prev
              ? reps
              : repRange.min;
        return { setNumber: i + 1, recommendedWeight: weight, recommendedReps: setReps };
      });
    };

    if (history.length === 0 || lastWorkoutSets.length === 0) {
      return {
        exerciseId,
        recommendedWeight: 0,
        recommendedReps: repRange.min,
        recommendedRPE: currentRPE,
        progressionType: "INITIAL",
        reasoning: `First session: pick a weight you can hit ${repRange.min}–${repRange.max} reps with good form.`,
        setRecommendations: [],
        volumeSuggestion: null,
      };
    }

    const lastSession = history[history.length - 1];
    const currentWeight = lastSession.weight;
    const lastReps = lastSession.actualReps;

    if (isDeloadWeek) {
      const weight = this.roundToNearestIncrement(currentWeight * 0.55, weightIncrement);
      const reps = repRange.min;
      return {
        exerciseId,
        recommendedWeight: weight,
        recommendedReps: reps,
        recommendedRPE: 5,
        progressionType: "DELOAD",
        reasoning: `Deload week: ~55% load, ${reps} reps, cut sets by ~50%.`,
        setRecommendations: buildSets(weight, reps, "DELOAD"),
        volumeSuggestion: null,
      };
    }

    // Manual jump: user increased weight by >10% vs prior session
    // Only consolidate if performance dropped significantly — otherwise progress normally
    if (history.length >= 2) {
      const previousWeight = history[history.length - 2].weight;
      if (previousWeight > 0 && currentWeight / previousWeight > this.MANUAL_INCREASE_THRESHOLD) {
        const preJumpReps = history[history.length - 2].actualReps;
        if (preJumpReps > 0 && lastReps < preJumpReps * 0.85) {
          return {
            exerciseId,
            recommendedWeight: currentWeight,
            recommendedReps: lastReps,
            recommendedRPE: currentRPE,
            progressionType: "MANUAL_JUMP",
            reasoning: `Manual weight jump detected. Consolidate at ${currentWeight}kg before the next increase.`,
            setRecommendations: buildSets(currentWeight, lastReps, "MANUAL_JUMP"),
            volumeSuggestion: null,
          };
        }
        // Performance held up — fall through to normal progression
      }
    }

    const progression = await this.getOrCreateExerciseProgression(userId, userProgramId, exerciseId);
    const consecutiveSessions = progression.consecutiveSessionsAtMaxReps;
    const weeksAtCurrentSets = progression.weeksAtCurrentSetCount;

    const atExerciseCap = setCount >= MAX_SETS_PER_EXERCISE;
    const atMuscleGroupCap = muscleGroupTotalSets >= MAX_MUSCLE_GROUP_SETS;
    const atWorkoutCap = totalWorkoutSets >= MAX_WORKOUT_SETS;
    const atVolumeCap = (atExerciseCap && atMuscleGroupCap) || atWorkoutCap;

    // Volume suggestion (independent of rep/weight logic)
    let volumeSuggestion: ProgressionRecommendation["volumeSuggestion"] = null;
    if (!atExerciseCap && weeksAtCurrentSets >= WEEKS_BEFORE_SET_INCREASE) {
      volumeSuggestion = "add_set";
    } else if (atExerciseCap && !atMuscleGroupCap && !atWorkoutCap) {
      volumeSuggestion = "add_exercise";
    }

    let recommendedWeight: number;
    let recommendedReps: number;
    let progressionType: ProgressionRecommendation["progressionType"];
    let reasoning: string;

    if (atVolumeCap) {
      // Intensity focus: keep adding reps to max, then increase weight
      if (lastReps >= repRange.max) {
        recommendedWeight = this.roundToNearestIncrement(currentWeight * (1 + this.WEIGHT_INCREASE_PERCENT), weightIncrement);
        recommendedReps = repRange.min;
        reasoning = `Volume cap reached — focusing on weight. Increase to ${recommendedWeight}kg and target ${repRange.min} reps.`;
      } else {
        recommendedWeight = currentWeight;
        recommendedReps = Math.min(lastReps + 1, repRange.max);
        reasoning = `Volume cap reached. Building to ${repRange.max} reps before next weight increase.`;
      }
      progressionType = "INTENSITY_FOCUS";
    } else if (lastReps < repRange.min - 2) {
      // Too many missed reps: reduce weight
      recommendedWeight = this.roundToNearestIncrement(currentWeight * (1 - this.WEIGHT_DECREASE_PERCENT), weightIncrement);
      recommendedReps = repRange.min;
      progressionType = "FAILURE";
      reasoning = `Rep count (${lastReps}) dropped below range. Reducing weight by 10% and targeting ${repRange.min} reps.`;
    } else if (lastReps >= repRange.max) {
      if (consecutiveSessions + 1 >= SESSIONS_NEEDED_FOR_WEIGHT_INCREASE) {
        recommendedWeight = this.roundToNearestIncrement(currentWeight * (1 + this.WEIGHT_INCREASE_PERCENT), weightIncrement);
        recommendedReps = repRange.min;
        progressionType = "WEIGHT_INCREASE";
        reasoning = `Hit ${repRange.max} reps for ${SESSIONS_NEEDED_FOR_WEIGHT_INCREASE} sessions in a row. Increasing weight to ${recommendedWeight}kg — target ${repRange.min} reps.`;
      } else {
        recommendedWeight = currentWeight;
        recommendedReps = repRange.max;
        progressionType = "AT_REP_CAP";
        const sessionsLeft = SESSIONS_NEEDED_FOR_WEIGHT_INCREASE - (consecutiveSessions + 1);
        reasoning = `Hit ${repRange.max} reps (${consecutiveSessions + 1}/${SESSIONS_NEEDED_FOR_WEIGHT_INCREASE} sessions). ${sessionsLeft} more before weight increases — target ${repRange.max} reps again.`;
      }
    } else {
      recommendedWeight = currentWeight;
      recommendedReps = Math.min(lastReps + 1, repRange.max);
      progressionType = "NORMAL";
      reasoning = `Add 1 rep — target ${recommendedReps} reps at ${currentWeight}kg.`;
    }

    if (volumeSuggestion === "add_set") {
      reasoning += ` (${weeksAtCurrentSets} weeks at ${setCount} sets — consider adding a set)`;
    } else if (volumeSuggestion === "add_exercise") {
      reasoning += ` (at 5-set cap — consider adding a complementary exercise)`;
    }

    return {
      exerciseId,
      recommendedWeight,
      recommendedReps,
      recommendedRPE: currentRPE,
      progressionType,
      reasoning,
      setRecommendations: buildSets(recommendedWeight, recommendedReps, progressionType),
      volumeSuggestion,
    };
  }

  /**
   * Update UserExerciseProgression state after a muscle building workout is saved.
   * Called for each exercise in saveWorkoutAndCalculateProgression.
   */
  private static async updateMuscleBuildingProgressionState(
    userId: string,
    userProgramId: string,
    exerciseId: string,
    actualSets: WorkoutSetData[],
    programmeReps: string,
  ): Promise<void> {
    const repRange = this.parseRepRange(programmeReps);
    const mainSets = actualSets.filter((s) => !s.isDropSet && s.completed);
    if (mainSets.length === 0) return;

    const allHitMax = mainSets.every((s) => s.reps >= repRange.max);

    const progression = await this.getOrCreateExerciseProgression(userId, userProgramId, exerciseId);

    const updateData: Record<string, unknown> = {};

    if (allHitMax) {
      updateData.consecutiveSessionsAtMaxReps = progression.consecutiveSessionsAtMaxReps + 1;
      updateData.progressionPhase =
        progression.consecutiveSessionsAtMaxReps + 1 >= 3
          ? "weight_increase"
          : "rep_progression";
    } else {
      updateData.consecutiveSessionsAtMaxReps = 0;
      updateData.progressionPhase = "rep_progression";
      if (progression.progressionPhase === "weight_increase") {
        updateData.lastWeightIncreaseAt = new Date();
      }
    }

    await prisma.userExerciseProgression.update({
      where: { id: progression.id },
      data: updateData,
    });
  }

  private static async evaluateStrengthCycleOutcome(
    userProgramId: string,
    exerciseId: string,
    cycleStartWeek: number,
  ): Promise<{ week1Hit: boolean; week2Hit: boolean; week3Hit: boolean }> {
    const cycleEndWeek = cycleStartWeek + 3;
    const history = await prisma.workoutExercise.findMany({
      where: {
        exerciseId,
        workout: {
          userProgramId,
          weekNumber: {
            gte: cycleStartWeek,
            lte: cycleEndWeek,
          },
        },
      },
      include: {
        workout: {
          select: {
            weekNumber: true,
          },
        },
        sets: {
          orderBy: {
            setNumber: "asc",
          },
        },
      },
      orderBy: {
        workout: {
          completedAt: "desc",
        },
      },
    });

    const repsTargetByWeek: Record<number, number> = {
      1: 5,
      2: 3,
      3: 1,
    };

    const requiredSetsByWeek: Record<number, number> = {
      1: 3,
      2: 3,
      3: 1,
    };

    const bestSetHitsByCycleWeek: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
    };

    history.forEach((workoutExercise) => {
      const cycleWeek = workoutExercise.workout.weekNumber - cycleStartWeek + 1;
      if (cycleWeek < 1 || cycleWeek > 3) return;

      const targetReps = repsTargetByWeek[cycleWeek];
      const mainSets = workoutExercise.sets.filter(
        (set) => this.parseWorkoutSetDefinition(set.notes).type === "main",
      );
      const candidateSets = mainSets.length > 0 ? mainSets : workoutExercise.sets;

      const hitCount = candidateSets.filter(
        (set) => set.completed && (set.reps || 0) >= targetReps,
      ).length;

      bestSetHitsByCycleWeek[cycleWeek] = Math.max(
        bestSetHitsByCycleWeek[cycleWeek],
        hitCount,
      );
    });

    return {
      week1Hit: bestSetHitsByCycleWeek[1] >= requiredSetsByWeek[1],
      week2Hit: bestSetHitsByCycleWeek[2] >= requiredSetsByWeek[2],
      week3Hit: bestSetHitsByCycleWeek[3] >= requiredSetsByWeek[3],
    };
  }

  private static async calculateStrengthMainLiftRecommendation(
    userProgramId: string,
    exerciseId: string,
    currentWeek: number,
    exerciseName: string,
    muscleGroup: string,
    lastWorkoutSets: WorkoutSetHistory[],
  ): Promise<ProgressionRecommendation> {
    const cycleWeek = this.getStrengthCycleWeek(currentWeek);
    const cycleTemplate = this.getStrengthCycleTemplate(cycleWeek);

    const mainSets = lastWorkoutSets.filter((set) => set.setType === "main");
    const candidateSets = mainSets.length > 0 ? mainSets : lastWorkoutSets;

    const estimated1RM = candidateSets.reduce((best, set) => {
      const estimate = this.estimateOneRepMax(set.weight, set.reps);
      return Math.max(best, estimate);
    }, 0);

    if (estimated1RM <= 0) {
      return {
        exerciseId,
        recommendedWeight: 0,
        recommendedReps: 0,
        recommendedRPE: cycleTemplate.rpe,
        progressionType: "INITIAL",
        reasoning:
          "Strength setup: complete your first logged session to establish a reliable 1RM baseline.",
        setRecommendations: [],
      };
    }

    let adjusted1RM = estimated1RM;
    let incrementReasoning = "";

    if (cycleWeek === 1 && currentWeek > 1) {
      const previousCycleStartWeek = currentWeek - 4;
      const outcome = await this.evaluateStrengthCycleOutcome(
        userProgramId,
        exerciseId,
        previousCycleStartWeek,
      );

      const fullIncrement = this.getMainLiftIncrementKg(exerciseName, muscleGroup);

      if (outcome.week3Hit) {
        adjusted1RM += fullIncrement;
        incrementReasoning = `Previous cycle completed successfully. Applying +${fullIncrement}kg to working 1RM.`;
      } else if (outcome.week1Hit && outcome.week2Hit) {
        const halfIncrement = fullIncrement / 2;
        adjusted1RM += halfIncrement;
        incrementReasoning = `Previous cycle missed heavy singles but early weeks were hit. Applying +${halfIncrement}kg to working 1RM.`;
      } else {
        incrementReasoning =
          "Previous cycle did not meet progression criteria. Repeating cycle at the same working 1RM.";
      }
    }

    const prescribedWeight = this.roundToNearestIncrement(
      adjusted1RM * cycleTemplate.percent,
      2.5,
    );

    const setRecommendations: SetProgressionRecommendation[] = Array.from(
      { length: cycleTemplate.sets },
      (_, index) => ({
        setNumber: index + 1,
        recommendedWeight: prescribedWeight,
        recommendedReps: cycleTemplate.reps,
      }),
    );

    const baseReasoning =
      cycleWeek === 1
        ? "Strength cycle week 1: 3x5 @ 70% of working 1RM."
        : cycleWeek === 2
          ? "Strength cycle week 2: 3x3 @ 80% of working 1RM."
          : cycleWeek === 3
            ? "Strength cycle week 3: 3x1 @ 90% of working 1RM. Optional back-off work can be added manually."
            : "Strength cycle week 4 deload: 3x5 @ 60% of working 1RM.";

    return {
      exerciseId,
      recommendedWeight: prescribedWeight,
      recommendedReps: cycleTemplate.reps,
      recommendedRPE: cycleTemplate.rpe,
      progressionType: cycleTemplate.progressionType,
      reasoning: incrementReasoning
        ? `${baseReasoning} ${incrementReasoning}`
        : baseReasoning,
      setRecommendations,
    };
  }

  /**
   * Get current program details for a user
   */
  private static async getUserProgramDetails(userId: string) {
    const userProgram = await prisma.userProgram.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        programme: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!userProgram) {
      throw new Error("No active program found for user");
    }

    // Use persisted progression state; this is advanced only when workouts are completed.
    const currentWeek = userProgram.currentWeek || 1;
    const currentDay = userProgram.currentDay || 1;

    return {
      userProgram,
      currentWeek,
      programLength: userProgram.programme.weeks,
      currentDay,
      progressionFocus: userProgram.programme.progressionFocus,
    };
  }

  /**
   * Main method to calculate progression recommendations
   * Follows the updated progressive overload rules exactly
   */
  static async getProgressionRecommendations(
    userId: string,
    exerciseIds: string[],
    setCounts: number[] = [],
    setLayouts: ExerciseSetLayout[] = [],
  ): Promise<ProgressionRecommendation[]> {
    const recommendations: ProgressionRecommendation[] = [];

    try {
      // Get user's current program details
      const { userProgram, currentWeek, currentDay, programLength, progressionFocus } =
        await this.getUserProgramDetails(userId);

      const isStrengthFocus = progressionFocus === "STRENGTH";

      const strengthExerciseMetaMap = new Map<string, StrengthExerciseMeta>();
      if (isStrengthFocus) {
        const strengthDayExercises = await prisma.programmeExercise.findMany({
          where: {
            programmeId: userProgram.programmeId,
            dayNumber: currentDay,
            exerciseId: {
              in: exerciseIds,
            },
          },
          include: {
            exercise: {
              select: {
                name: true,
                muscleGroup: true,
              },
            },
          },
        });

        strengthDayExercises.forEach((exercise) => {
          strengthExerciseMetaMap.set(exercise.exerciseId, {
            role: exercise.strengthRole as StrengthExerciseRole,
            name: exercise.exercise.name,
            muscleGroup: exercise.exercise.muscleGroup,
          });
        });
      }

      // For muscle building: fetch programme exercise rep ranges and compute volume context
      const programmeExerciseMap = new Map<string, { reps: string; sets: number }>();
      const exerciseMuscleGroupMap = new Map<string, string>();

      if (!isStrengthFocus) {
        const [programmeExercises, exerciseDetails] = await Promise.all([
          prisma.programmeExercise.findMany({
            where: {
              programmeId: userProgram.programmeId,
              dayNumber: currentDay,
              exerciseId: { in: exerciseIds },
            },
            select: { exerciseId: true, reps: true, sets: true },
          }),
          prisma.exercise.findMany({
            where: { id: { in: exerciseIds } },
            select: { id: true, muscleGroup: true },
          }),
        ]);

        programmeExercises.forEach((pe) => {
          programmeExerciseMap.set(pe.exerciseId, { reps: pe.reps, sets: pe.sets });
        });
        exerciseDetails.forEach((e) => {
          exerciseMuscleGroupMap.set(e.id, e.muscleGroup);
        });
      }

      // Compute volume context once (before the loop)
      const totalWorkoutSets = setCounts.reduce((sum, count) => sum + (count || 3), 0);

      const muscleGroupSetsMap = new Map<string, number>();
      exerciseIds.forEach((id, i) => {
        const group = exerciseMuscleGroupMap.get(id) ?? "unknown";
        muscleGroupSetsMap.set(group, (muscleGroupSetsMap.get(group) ?? 0) + (setCounts[i] || 3));
      });

      // Generate RPE table for the program (used by strength path)
      const rpeTable = this.generateRPETable(programLength);
      const currentRPE = rpeTable[Math.min(currentWeek - 1, rpeTable.length - 1)];
      const isDeloadWeek = currentWeek === programLength + 1;

      for (let index = 0; index < exerciseIds.length; index += 1) {
        const exerciseId = exerciseIds[index];
        const setCount = setCounts[index] && setCounts[index] > 0 ? setCounts[index] : 3;
        const currentSetDefinitions = this.normalizeCurrentSetDefinitions(
          setLayouts.find((layout) => layout.exerciseId === exerciseId)?.setDefinitions,
          setCount,
        );

        const history = await this.getPerformanceHistory(userId, exerciseId, 3);
        const lastWorkoutSets = await this.getLastWorkoutSetsForExercise(userId, exerciseId);

        const strengthMeta = isStrengthFocus
          ? strengthExerciseMetaMap.get(exerciseId)
          : undefined;

        // ── Strength main lift path (unchanged) ──────────────────────────────
        if (isStrengthFocus && strengthMeta?.role === "MAIN_LIFT") {
          if (history.length === 0 || lastWorkoutSets.length === 0) {
            recommendations.push({
              exerciseId,
              recommendedWeight: 0,
              recommendedReps: 0,
              recommendedRPE: currentRPE,
              progressionType: "INITIAL",
              reasoning: `Week ${currentWeek} setup: choose a load that lands around RPE ${currentRPE}.`,
              setRecommendations: [],
            });
            continue;
          }
          recommendations.push(
            await this.calculateStrengthMainLiftRecommendation(
              userProgram.id,
              exerciseId,
              currentWeek,
              strengthMeta.name,
              strengthMeta.muscleGroup,
              lastWorkoutSets,
            ),
          );
          continue;
        }

        // ── Muscle building path ──────────────────────────────────────────────
        const muscleGroup = exerciseMuscleGroupMap.get(exerciseId) ?? "unknown";
        if (!isStrengthFocus) {
          const pe = programmeExerciseMap.get(exerciseId);
          const muscleGroupTotalSets = muscleGroupSetsMap.get(muscleGroup) ?? setCount;

          recommendations.push(
            await this.calculateMuscleBuildingRecommendation(
              userId,
              userProgram.id,
              exerciseId,
              currentWeek,
              programLength,
              lastWorkoutSets,
              history,
              setCount,
              currentSetDefinitions,
              pe?.reps ?? "8-12",
              muscleGroupTotalSets,
              totalWorkoutSets,
              muscleGroup,
            ),
          );
          continue;
        }

        // ── Strength supplemental / accessory path (generic) ─────────────────
        const lowerBodyGroupsStr = ["Quads", "Hamstrings", "Glutes", "Back", "quads", "hamstrings", "glutes", "back"];
        const strengthWeightIncrement = lowerBodyGroupsStr.includes(muscleGroup) ? 5 : 2.5;
        if (history.length === 0 || lastWorkoutSets.length === 0) {
          recommendations.push({
            exerciseId,
            recommendedWeight: 0,
            recommendedReps: 0,
            recommendedRPE: currentRPE,
            progressionType: "INITIAL",
            reasoning: `Week ${currentWeek} setup: choose a load that lands around RPE ${currentRPE}.`,
            setRecommendations: [],
          });
          continue;
        }

        const lastSession = history[history.length - 1];
        const currentWeight = lastSession.weight;
        const lastReps = lastSession.actualReps;
        const lastTargetReps = lastSession.targetReps || lastReps;

        let recommendedWeight = currentWeight;
        let recommendedReps = lastTargetReps;
        let progressionType: ProgressionRecommendation["progressionType"] = "NORMAL";
        let reasoning = "";

        if (isDeloadWeek) {
          recommendedWeight = currentWeight * 0.55;
          recommendedReps = Math.max(1, Math.floor(lastTargetReps));
          progressionType = "DELOAD";
          reasoning = `Deload week: reduce load to ~55% and cut sets by ~50%.`;
        }

        let manualIncrease = false;
        if (history.length >= 2) {
          const previousWeight = history[history.length - 2].weight;
          manualIncrease =
            previousWeight > 0 && currentWeight / previousWeight > this.MANUAL_INCREASE_THRESHOLD;
        }

        if (!isDeloadWeek && manualIncrease) {
          const preJumpHistory = history[history.length - 2];
          const preJumpReps = preJumpHistory?.actualReps ?? 0;
          if (preJumpReps > 0 && lastReps < preJumpReps * 0.85) {
            recommendedWeight = currentWeight;
            recommendedReps = lastReps;
            progressionType = "MANUAL_JUMP";
            reasoning = `Manual weight increase detected. Focus on RPE ${currentRPE} this week.`;
          }
          // else: performance held — fall through to normal progression
        } else if (!isDeloadWeek && history.length >= 2) {
          const last2Weeks = history.slice(-2);
          const overperformed = last2Weeks.every(
            (week) =>
              week.targetReps > 0 && week.actualReps > week.targetReps * this.OVERPERFORMANCE_THRESHOLD,
          );
          if (overperformed) {
            recommendedWeight = this.roundToNearestIncrement(currentWeight * (1 + this.WEIGHT_INCREASE_PERCENT), strengthWeightIncrement);
            recommendedReps = this.calculateVolumePreservingReps(
              currentWeight, lastReps, recommendedWeight, setCount,
            );
            progressionType = "OVERPERFORMANCE";
            reasoning = `Consistently exceeding targets by >10% for 2 weeks. Increasing weight by 5%.`;
          }
        }

        if (progressionType === "NORMAL" && lastReps < this.REP_FAIL) {
          recommendedWeight = this.roundToNearestIncrement(currentWeight * (1 - this.WEIGHT_DECREASE_PERCENT), strengthWeightIncrement);
          recommendedReps = this.REP_FAIL;
          progressionType = "FAILURE";
          reasoning = `Rep count too low (<${this.REP_FAIL}). Reducing weight 10%, resetting to ${this.REP_FAIL} reps.`;
        } else if (progressionType === "NORMAL" && lastReps >= this.REP_CAP) {
          recommendedWeight = this.roundToNearestIncrement(currentWeight * (1 + this.WEIGHT_INCREASE_PERCENT), strengthWeightIncrement);
          recommendedReps = this.calculateVolumePreservingReps(
            currentWeight, lastReps, recommendedWeight, setCount,
          );
          progressionType = "REP_CAP";
          reasoning = `Rep cap reached (≥${this.REP_CAP}). Increasing weight 5%.`;
        } else if (progressionType === "NORMAL") {
          recommendedWeight = currentWeight;
          recommendedReps = Math.min(lastReps + 1, this.REP_CAP);
          reasoning = `[Strength ${strengthMeta?.role?.toLowerCase() ?? "accessory"}] Add +1 rep. Target RPE ${currentRPE}.`;
        }

        if (progressionType !== "NORMAL") {
          const roleSuffix = strengthMeta?.role ? ` (${strengthMeta.role.toLowerCase()})` : "";
          reasoning = `[Strength${roleSuffix}] ${reasoning}`;
        }

        const setRecommendations = this.buildSetRecommendations(
          lastWorkoutSets, currentSetDefinitions, currentRPE, progressionType,
        );
        const topRecommendation = setRecommendations[0] || {
          setNumber: 1, recommendedWeight, recommendedReps,
        };

        recommendations.push({
          exerciseId,
          recommendedWeight: topRecommendation.recommendedWeight,
          recommendedReps: topRecommendation.recommendedReps,
          recommendedRPE: currentRPE,
          progressionType,
          reasoning,
          setRecommendations,
        });
      }

      return recommendations;
    } catch (error) {
      console.error("Error calculating progression recommendations:", error);
      return recommendations;
    }
  }

  /**
   * Auto-add a complementary exercise to the programme when an exercise hits the 5-set cap.
   * Picks the first complementary exercise not already in the programme on the same day.
   */
  private static async autoAddComplementaryExercise(
    programmeId: string,
    exerciseId: string,
  ): Promise<void> {
    const sourceProgrammeExercises = await prisma.programmeExercise.findMany({
      where: { programmeId, exerciseId },
      select: { dayNumber: true, orderIndex: true, reps: true },
    });
    if (sourceProgrammeExercises.length === 0) return;

    // Find exercises that list this exercise in their complementaryExerciseIds (reverse lookup)
    const candidates = await prisma.exercise.findMany({
      where: { complementaryExerciseIds: { contains: exerciseId } },
      select: { id: true },
    });
    if (candidates.length === 0) return;

    for (const sourcePe of sourceProgrammeExercises) {
      const existingOnDay = await prisma.programmeExercise.findMany({
        where: { programmeId, dayNumber: sourcePe.dayNumber },
        select: { exerciseId: true, orderIndex: true },
      });
      const existingIds = new Set(existingOnDay.map((e) => e.exerciseId));
      const maxOrderIndex = existingOnDay.reduce((m, e) => Math.max(m, e.orderIndex), 0);

      const newExerciseId = candidates.find((c) => !existingIds.has(c.id))?.id;
      if (!newExerciseId) continue;

      await prisma.programmeExercise.create({
        data: {
          programmeId,
          exerciseId: newExerciseId,
          dayNumber: sourcePe.dayNumber,
          orderIndex: maxOrderIndex + 1,
          sets: 3,
          reps: sourcePe.reps,
          strengthRole: "ACCESSORY",
          isSelected: true,
        },
      });

      // Reset the original exercise back to 3 sets now that volume is split
      await prisma.programmeExercise.updateMany({
        where: { programmeId, exerciseId, dayNumber: sourcePe.dayNumber },
        data: { sets: 3 },
      });
    }
  }

  /**
   * Save workout and calculate next session progression
   * NOTE: RPE is NOT recorded by users anymore - it's only provided as a recommendation
   */
  static async saveWorkoutAndCalculateProgression(
    userId: string,
    workoutData: WorkoutData[],
  ): Promise<{
    workoutId: string;
    recommendations: ProgressionRecommendation[];
    weeklySummary?: WeeklySummary;
  }> {
    try {
      // Get user program details
      const { userProgram } = await this.getUserProgramDetails(userId);

      // Use the current program position for this workout
      const weekNumber = userProgram.currentWeek;
      const dayNumber = userProgram.currentDay;

      // Create workout record with current program position
      const workout = await prisma.workout.create({
        data: {
          userProgramId: userProgram.id,
          weekNumber,
          dayNumber,
          completedAt: new Date(),
        },
        select: {
          id: true,
        },
      });

      // Save workout exercises and sets
      for (const exercise of workoutData) {
        const workoutExercise = await prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exercise.exerciseId,
            orderIndex: 0,
          },
        });

        // Save sets - targetReps is stored for next session comparison
        // RPE is NOT saved as it's not user-recorded
        for (let i = 0; i < exercise.sets.length; i++) {
          const set = exercise.sets[i];
          await prisma.workoutSet.create({
            data: {
              workoutExerciseId: workoutExercise.id,
              setNumber: i + 1,
              weight: set.weight,
              reps: set.reps,
              targetReps: set.targetReps ?? set.reps,
              rpe: null, // RPE is no longer user-recorded
              notes: JSON.stringify({
                type: set.isDropSet ? "drop" : "main",
                groupId: set.dropSetGroupId,
              }),
              completed: set.completed,
            },
          });
        }
      }

      // Get all exercise IDs for next session recommendations
      const exerciseIds = workoutData.map((ex) => ex.exerciseId);
      const setLayouts = workoutData.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        setDefinitions: exercise.sets.map((set) => ({
          type: (set.isDropSet ? "drop" : "main") as "main" | "drop",
          groupId: set.dropSetGroupId,
        })),
      }));

      // Check if this workout completes the current week
      const isEndOfWeek = dayNumber >= (userProgram.programme.daysPerWeek || 3);

      // Update muscle building progression state for each exercise
      if (userProgram.programme.progressionFocus !== "STRENGTH") {
        const programmeExercisesForDay = await prisma.programmeExercise.findMany({
          where: {
            programmeId: userProgram.programmeId,
            dayNumber,
            exerciseId: { in: exerciseIds },
          },
          select: { exerciseId: true, reps: true },
        });
        const programmeRepsMap = new Map(programmeExercisesForDay.map((pe) => [pe.exerciseId, pe.reps]));

        await Promise.all(
          workoutData.map((exercise) =>
            this.updateMuscleBuildingProgressionState(
              userId,
              userProgram.id,
              exercise.exerciseId,
              exercise.sets,
              programmeRepsMap.get(exercise.exerciseId) ?? "8-12",
            ),
          ),
        );

        // At end of week, increment weeksAtCurrentSetCount for ALL exercises in the programme
        // (not just today's) so every exercise accumulates the counter regardless of which day it's on.
        if (isEndOfWeek) {
          const allProgrammeExerciseIds = await prisma.programmeExercise.findMany({
            where: { programmeId: userProgram.programmeId },
            select: { exerciseId: true },
          });
          const uniqueExerciseIds = [...new Set(allProgrammeExerciseIds.map((pe) => pe.exerciseId))];

          // Upsert progression records for any exercises that haven't been tracked yet
          await Promise.all(
            uniqueExerciseIds.map((exId) =>
              this.getOrCreateExerciseProgression(userId, userProgram.id, exId),
            ),
          );

          await prisma.userExerciseProgression.updateMany({
            where: { userProgramId: userProgram.id, exerciseId: { in: uniqueExerciseIds } },
            data: { weeksAtCurrentSetCount: { increment: 1 } },
          });
        }
      }

      // Update user program progress
      const nextDay = dayNumber >= (userProgram.programme.daysPerWeek || 3) 
        ? 1 
        : dayNumber + 1;
      const nextWeek = dayNumber >= (userProgram.programme.daysPerWeek || 3) 
        ? weekNumber + 1 
        : weekNumber;

      // Check if program is completed
      const isProgramCompleted = nextWeek > ((userProgram.programme.weeks || 4) + 1);
      
      await prisma.userProgram.update({
        where: { id: userProgram.id },
        data: {
          currentDay: isProgramCompleted ? userProgram.programme.daysPerWeek || 3 : nextDay,
          currentWeek: isProgramCompleted ? (userProgram.programme.weeks || 4) + 1 : nextWeek,
          status: isProgramCompleted ? "COMPLETED" : "ACTIVE",
          endDate: isProgramCompleted ? new Date() : null,
        },
      });

      let recommendations: ProgressionRecommendation[] = [];
      if (isEndOfWeek) {
        recommendations = await this.getProgressionRecommendations(
          userId,
          exerciseIds,
          workoutData.map((exercise) => exercise.sets.length),
          setLayouts,
        );

        // Auto-apply add_set for today's exercises (already have recommendations)
        for (const rec of recommendations) {
          if (rec.volumeSuggestion === "add_set") {
            const programmeExercises = await prisma.programmeExercise.findMany({
              where: { programmeId: userProgram.programmeId, exerciseId: rec.exerciseId },
            });
            for (const pe of programmeExercises) {
              if (pe.sets < 5) {
                await prisma.programmeExercise.update({
                  where: { id: pe.id },
                  data: { sets: pe.sets + 1 },
                });
              }
            }
            await prisma.userExerciseProgression.updateMany({
              where: { userProgramId: userProgram.id, exerciseId: rec.exerciseId },
              data: { weeksAtCurrentSetCount: 0 },
            });
          }

          if (rec.volumeSuggestion === "add_exercise") {
            await this.autoAddComplementaryExercise(userProgram.programmeId, rec.exerciseId);
            await prisma.userExerciseProgression.updateMany({
              where: { userProgramId: userProgram.id, exerciseId: rec.exerciseId },
              data: { weeksAtCurrentSetCount: 0 },
            });
          }
        }

        // Also apply add_set / add_exercise for exercises on other days that hit the threshold
        const otherProgressions = await prisma.userExerciseProgression.findMany({
          where: {
            userProgramId: userProgram.id,
            weeksAtCurrentSetCount: { gte: 6 },
            exerciseId: { notIn: exerciseIds },
          },
        });
        for (const progression of otherProgressions) {
          const programmeExercises = await prisma.programmeExercise.findMany({
            where: { programmeId: userProgram.programmeId, exerciseId: progression.exerciseId },
          });
          for (const pe of programmeExercises) {
            if (pe.sets < 5) {
              await prisma.programmeExercise.update({
                where: { id: pe.id },
                data: { sets: pe.sets + 1 },
              });
            } else {
              // Already at 5-set cap — add a complementary exercise instead
              await this.autoAddComplementaryExercise(userProgram.programmeId, progression.exerciseId);
            }
          }
          await prisma.userExerciseProgression.update({
            where: { id: progression.id },
            data: { weeksAtCurrentSetCount: 0 },
          });
        }
      } else {
        // Not end of week yet: return empty recommendations and do not perform progression logic
        recommendations = [];
      }

      // Return post-workout summary for every completed workout
      // (weekly comparisons may be null when there is insufficient history).
      const weeklySummary = await this.getWeeklySummary(
        userId,
        weekNumber,
        exerciseIds,
        workout.id,
        isEndOfWeek,
      );

      return {
        workoutId: workout.id,
        recommendations,
        weeklySummary,
      };
    } catch (error) {
      console.error("Error saving workout:", error);
      throw error;
    }
  }

  /**
   * Calculate weekly summary stats (strength gain %, new PRs, etc.)
   * Called at end of week to show post-workout completion message
   */
  static async getWeeklySummary(
    userId: string,
    currentWeek: number,
    exerciseIds: string[],
    currentWorkoutId: string,
    isEndOfWeek: boolean,
  ): Promise<WeeklySummary> {
    try {
      const currentWorkout = await prisma.workout.findUnique({
        where: { id: currentWorkoutId },
        select: {
          id: true,
          userProgramId: true,
          dayNumber: true,
          exercises: {
            include: {
              exercise: {
                select: {
                  name: true,
                },
              },
              sets: {
                where: { completed: true },
              },
            },
          },
        },
      });

      const hasComparisonBaseline = currentWeek > 1;

      const summary: WeeklySummary = {
        strengthGainVsLastWeek: null,
        strengthGainVsProgramStart: null,
        weekOnWeekVsWeek1: null,
        previousWorkoutComparison: null,
        personalRecords: [],
        newRepMaxes: [],
        isEndOfWeek,
      };

      if (!currentWorkout) {
        return summary;
      }

      const comparisonDayNumber = currentWorkout.dayNumber || null;

      // Get only the weeks needed for comparisons so stats are available every workout:
      // current week, previous week, and week 1 baseline.
      const weeksToFetch = Array.from(
        new Set([currentWeek, Math.max(currentWeek - 1, 1), 1]),
      );

      const workoutsForComparisons = await prisma.workout.findMany({
        where: {
          userProgramId: currentWorkout.userProgramId,
          weekNumber: {
            in: weeksToFetch,
          },
        },
        select: {
          weekNumber: true,
          dayNumber: true,
          completedAt: true,
          exercises: {
            include: {
              exercise: {
                select: {
                  name: true,
                },
              },
              sets: {
                where: { completed: true },
                orderBy: { setNumber: "asc" },
              },
            },
          },
        },
        orderBy: [{ weekNumber: "desc" }, { completedAt: "desc" }],
      });

      // Organize by week
      const weeklyData: Record<number, any[]> = {};
      workoutsForComparisons.forEach((workout) => {
        const week = workout.weekNumber || 0;
        if (!weeklyData[week]) weeklyData[week] = [];
        weeklyData[week].push(workout);
      });

      // Calculate volume for the matching workout day only.
      // Users interpret 'Vs week 1' as today's session vs the same session in week 1,
      // not cumulative volume across the week up to this point.
      const getDayVolume = (week: number, dayNumber: number | null): number => {
        const workouts = (weeklyData[week] || []).filter((workout) => {
          if (!dayNumber || !workout.dayNumber) return true;
          return workout.dayNumber === dayNumber;
        });

        // Keep only the latest logged workout for each day in the week.
        // Test/retry sessions can otherwise double count a day and invert comparisons.
        const latestWorkoutByDay = new Map<number, any>();
        workouts.forEach((workout) => {
          const workoutDay = workout.dayNumber || 0;
          const existing = latestWorkoutByDay.get(workoutDay);
          if (
            !existing ||
            new Date(workout.completedAt).getTime() >
              new Date(existing.completedAt).getTime()
          ) {
            latestWorkoutByDay.set(workoutDay, workout);
          }
        });

        let totalVolume = 0;
        Array.from(latestWorkoutByDay.values()).forEach((workout) => {
          workout.exercises.forEach((ex: any) => {
            (ex.sets || []).forEach((set: any) => {
              totalVolume += (set.weight || 0) * (set.reps || 0);
            });
          });
        });
        return totalVolume;
      };

      // Strength gain vs last week (only from week 2 onward)
      if (
        hasComparisonBaseline &&
        weeklyData[currentWeek] &&
        weeklyData[currentWeek - 1]
      ) {
        const totalCurrentVolume = getDayVolume(
          currentWeek,
          comparisonDayNumber,
        );
        const totalLastVolume = getDayVolume(
          currentWeek - 1,
          comparisonDayNumber,
        );

        if (totalLastVolume > 0) {
          summary.strengthGainVsLastWeek =
            ((totalCurrentVolume - totalLastVolume) / totalLastVolume) * 100;
        }
      }

      // Strength gain vs programme start (week 1), only when not currently in week 1
      if (hasComparisonBaseline && weeklyData[currentWeek] && weeklyData[1]) {
        const totalCurrentVolume = getDayVolume(
          currentWeek,
          comparisonDayNumber,
        );
        const totalWeek1Volume = getDayVolume(1, comparisonDayNumber);

        if (totalWeek1Volume > 0) {
          summary.strengthGainVsProgramStart =
            ((totalCurrentVolume - totalWeek1Volume) / totalWeek1Volume) * 100;
          summary.weekOnWeekVsWeek1 = summary.strengthGainVsProgramStart;
        }
      }

      // Compare each exercise against its most recent previous session.
      // Comparisons are intentionally disabled during week 1.
      if (hasComparisonBaseline && currentWorkout) {
        const previousWorkouts = await prisma.workout.findMany({
          where: {
            id: { not: currentWorkoutId },
            userProgramId: currentWorkout.userProgramId,
          },
          select: {
            exercises: {
              include: {
                exercise: {
                  select: {
                    name: true,
                  },
                },
                sets: {
                  where: { completed: true },
                },
              },
            },
          },
          orderBy: { completedAt: "desc" },
          take: 30,
        });

        const getExerciseVolume = (sets: any[]) =>
          (sets || []).reduce(
            (total: number, set: any) => total + (set.weight || 0) * (set.reps || 0),
            0,
          );

        const getExtraWeightMovedKg = (currentSets: any[], previousSets: any[]) => {
          // Compare aligned sets only to avoid false positives when sets were added/removed/reordered.
          const sortedCurrent = [...(currentSets || [])].sort(
            (a, b) => (a.setNumber || 0) - (b.setNumber || 0),
          );
          const sortedPrevious = [...(previousSets || [])].sort(
            (a, b) => (a.setNumber || 0) - (b.setNumber || 0),
          );

          const comparableCount = Math.min(sortedCurrent.length, sortedPrevious.length);
          let total = 0;

          for (let index = 0; index < comparableCount; index += 1) {
            const currentSet = sortedCurrent[index];
            const previousSet = sortedPrevious[index];
            const currentReps = currentSet?.reps || 0;
            const previousReps = previousSet?.reps || 0;
            const repDelta = currentReps - previousReps;

            total += repDelta * (currentSet?.weight || 0);
          }

          return total;
        };

        const exerciseDeltas = currentWorkout.exercises.map((currentExercise: any) => {
          const exerciseId = currentExercise.exerciseId;
          const exerciseName = currentExercise.exercise?.name || "Unknown";
          const currentVolume = getExerciseVolume(currentExercise.sets || []);

          let previousVolume = 0;
          let previousSets: any[] = [];
          for (const previousWorkout of previousWorkouts) {
            const matched = previousWorkout.exercises.find(
              (prevEx: any) => prevEx.exerciseId === exerciseId,
            );
            if (matched) {
              previousVolume = getExerciseVolume(matched.sets || []);
              previousSets = matched.sets || [];
              break;
            }
          }

          const extraWeightMovedKg = getExtraWeightMovedKg(
            currentExercise.sets || [],
            previousSets,
          );

          const changePct =
            previousVolume > 0
              ? ((currentVolume - previousVolume) / previousVolume) * 100
              : null;

          return {
            exerciseId,
            exerciseName,
            currentVolume,
            previousVolume,
            changePct,
            extraWeightMovedKg,
          };
        });

        const totalCurrentVolume = exerciseDeltas.reduce(
          (sum, item) => sum + item.currentVolume,
          0,
        );
        const totalPreviousVolume = exerciseDeltas.reduce(
          (sum, item) => sum + item.previousVolume,
          0,
        );
        const totalExtraWeightMovedKg = exerciseDeltas.reduce(
          (sum, item) => sum + item.extraWeightMovedKg,
          0,
        );

        summary.previousWorkoutComparison = {
          totalVolumeChangePct:
            totalPreviousVolume > 0
              ? ((totalCurrentVolume - totalPreviousVolume) / totalPreviousVolume) *
                100
              : null,
          totalCurrentVolume,
          totalPreviousVolume,
          totalExtraWeightMovedKg,
          exerciseDeltas,
        };
      }

      // Detect true personal records from this workout (vs all prior workouts)
      const currentWorkoutDetails = await prisma.workout.findUnique({
        where: { id: currentWorkoutId },
        select: {
          id: true,
          exercises: {
            include: {
              exercise: {
                select: {
                  name: true,
                },
              },
              sets: {
                where: { completed: true },
              },
            },
          },
        },
      });

      if (currentWorkoutDetails) {
        for (const exercise of currentWorkoutDetails.exercises) {
          const completedSets = exercise.sets || [];
          if (completedSets.length === 0) continue;

          const currentBestReps = completedSets.reduce(
            (max, set) => Math.max(max, set.reps || 0),
            0,
          );
          const currentBestWeight = completedSets.reduce(
            (max, set) => Math.max(max, set.weight || 0),
            0,
          );
          const currentBestVolume = completedSets.reduce(
            (max, set) => Math.max(max, (set.weight || 0) * (set.reps || 0)),
            0,
          );

          const historicalSets = await prisma.workoutSet.findMany({
            where: {
              completed: true,
              workoutExercise: {
                exerciseId: exercise.exerciseId,
                workout: {
                  id: { not: currentWorkoutDetails.id },
                  userProgram: {
                    userId,
                  },
                },
              },
            },
            select: {
              reps: true,
              weight: true,
            },
          });

          const previousBestReps = historicalSets.reduce(
            (max, set) => Math.max(max, set.reps || 0),
            0,
          );
          const previousBestWeight = historicalSets.reduce(
            (max, set) => Math.max(max, set.weight || 0),
            0,
          );
          const previousBestVolume = historicalSets.reduce(
            (max, set) => Math.max(max, (set.weight || 0) * (set.reps || 0)),
            0,
          );

          if (currentBestReps > previousBestReps) {
            summary.personalRecords.push({
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exercise?.name || "Unknown",
              metric: "reps",
              value: currentBestReps,
              previousBest: previousBestReps,
            });

            const repsBestSet = completedSets.reduce((best, current) =>
              (current.reps || 0) > (best.reps || 0) ? current : best,
            );
            summary.newRepMaxes.push({
              exerciseName: exercise.exercise?.name || "Unknown",
              reps: currentBestReps,
              weight: repsBestSet?.weight || 0,
            });
          }

          if (currentBestWeight > previousBestWeight) {
            summary.personalRecords.push({
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exercise?.name || "Unknown",
              metric: "weight",
              value: currentBestWeight,
              previousBest: previousBestWeight,
            });
          }

          if (currentBestVolume > previousBestVolume) {
            summary.personalRecords.push({
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exercise?.name || "Unknown",
              metric: "volume",
              value: currentBestVolume,
              previousBest: previousBestVolume,
            });
          }

          // Reps-at-weight PR: most reps ever performed at the same load.
          const historicalBestRepsByWeight = new Map<number, number>();
          historicalSets.forEach((set) => {
            const weight = set.weight || 0;
            const reps = set.reps || 0;
            const currentBest = historicalBestRepsByWeight.get(weight) || 0;
            if (reps > currentBest) {
              historicalBestRepsByWeight.set(weight, reps);
            }
          });

          // Emit a reps-at-weight PR for each weight where the user beat their
          // historical best reps at that exact load in this workout.
          const currentBestRepsByWeight = new Map<number, number>();
          completedSets.forEach((set) => {
            const weight = set.weight || 0;
            const reps = set.reps || 0;
            const bestForWeight = currentBestRepsByWeight.get(weight) || 0;
            if (reps > bestForWeight) {
              currentBestRepsByWeight.set(weight, reps);
            }
          });

          const repsAtWeightRecords = Array.from(
            currentBestRepsByWeight.entries(),
          )
            .map(([weight, reps]) => {
              const previousBestAtWeight =
                historicalBestRepsByWeight.get(weight) || 0;
              return {
                weight,
                reps,
                previousBestAtWeight,
                improvement: reps - previousBestAtWeight,
              };
            })
            .filter((record) => record.improvement > 0)
            .sort((a, b) => b.weight - a.weight);

          repsAtWeightRecords.forEach((record) => {
            summary.personalRecords.push({
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exercise?.name || "Unknown",
              metric: "repsAtWeight",
              value: record.reps,
              previousBest: record.previousBestAtWeight,
              contextWeightKg: record.weight,
            });
          });
        }
      }

      if (isEndOfWeek) {
        // Count working sets per muscle group across all workouts this week
        const weekWorkouts = await prisma.workout.findMany({
          where: {
            userProgramId: currentWorkout.userProgramId,
            weekNumber: currentWeek,
          },
          select: {
            exercises: {
              select: {
                exercise: { select: { muscleGroup: true } },
                sets: { where: { completed: true } },
              },
            },
          },
        });

        const setsByMuscle: Record<string, number> = {};
        for (const workout of weekWorkouts) {
          for (const ex of workout.exercises) {
            const mg = ex.exercise?.muscleGroup || "Unknown";
            setsByMuscle[mg] = (setsByMuscle[mg] ?? 0) + ex.sets.length;
          }
        }
        summary.weeklySetsByMuscleGroup = setsByMuscle;
      }

      return summary;
    } catch (error) {
      console.error("Error calculating weekly summary:", error);
      return {
        strengthGainVsLastWeek: null,
        strengthGainVsProgramStart: null,
        weekOnWeekVsWeek1: null,
        previousWorkoutComparison: null,
        personalRecords: [],
        newRepMaxes: [],
        isEndOfWeek,
      };
    }
  }
}
