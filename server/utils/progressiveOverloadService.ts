// server/utils/progressiveOverloadService.ts
import { prisma } from "../prisma.js";

export interface WorkoutSetData {
  weight: number;
  reps: number;
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
    | "REP_CAP"
    | "FAILURE"
    | "MANUAL_JUMP"
    | "UNDERPERFORMANCE"
    | "OVERPERFORMANCE"
    | "DELOAD"
    | "INITIAL";
  reasoning: string;
  setRecommendations: SetProgressionRecommendation[];
}

interface PerformanceHistory {
  weekNumber: number;
  actualReps: number;
  targetReps: number;
  weight: number;
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
      include: {
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
      include: {
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
    let recommendedReps = previousSet.targetReps || previousSet.reps;

    if (progressionType === "MANUAL_JUMP") {
      recommendedWeight = previousSet.weight;
      recommendedReps = previousSet.reps;
    } else if (progressionType === "UNDERPERFORMANCE") {
      recommendedWeight = previousSet.weight * (1 - this.WEIGHT_DECREASE_PERCENT);
      recommendedReps = Math.max(
        1,
        Math.floor((previousSet.targetReps || previousSet.reps) * 0.9),
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
      recommendedReps = previousSet.targetReps || previousSet.reps;
    } else if (progressionType === "NORMAL") {
      recommendedWeight = previousSet.weight;
      recommendedReps = Math.min(
        (previousSet.targetReps || previousSet.reps) + 1,
        this.REP_CAP,
      );
    }

    recommendedWeight = Math.round(recommendedWeight * 2) / 2;

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
      const { currentWeek, programLength } =
        await this.getUserProgramDetails(userId);

      // Generate RPE table for the program
      const rpeTable = this.generateRPETable(programLength);
      const currentRPE =
        rpeTable[Math.min(currentWeek - 1, rpeTable.length - 1)];
      const isDeloadWeek = currentWeek === programLength + 1;

      for (let index = 0; index < exerciseIds.length; index += 1) {
        const exerciseId = exerciseIds[index];
        const setCount =
          setCounts[index] && setCounts[index] > 0 ? setCounts[index] : 3;
        const currentSetDefinitions = this.normalizeCurrentSetDefinitions(
          setLayouts.find((layout) => layout.exerciseId === exerciseId)
            ?.setDefinitions,
          setCount,
        );

        // Get performance history (last 3 weeks for consistency checks)
        const history = await this.getPerformanceHistory(userId, exerciseId, 3);
        const lastWorkoutSets = await this.getLastWorkoutSetsForExercise(
          userId,
          exerciseId,
        );

        // If no history, provide initial recommendations (Week 1 Setup)
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

        // Get last session data
        const lastSession = history[history.length - 1];
        const currentWeight = lastSession.weight;
        const lastReps = lastSession.actualReps;
        const lastTargetReps = lastSession.targetReps || lastReps;

        let recommendedWeight = currentWeight;
        let recommendedReps = lastTargetReps;
        let progressionType: ProgressionRecommendation["progressionType"] =
          "NORMAL";
        let reasoning = "";

        if (isDeloadWeek) {
          recommendedWeight = currentWeight * 0.55;
          recommendedReps = Math.max(1, Math.floor(lastTargetReps));
          progressionType = "DELOAD";
          reasoning = `Deload week: reduce load to ~50-60% of 1RM (using 55%) and cut total sets by about 50%.`; 
        }

        // STEP 1: Manual Weight Jump Rule
        // If user manually increases weight >10%, default to RPE schedule
        let manualIncrease = false;
        if (history.length >= 2) {
          const previousWeight = history[history.length - 2].weight;
          manualIncrease =
            previousWeight > 0 &&
            currentWeight / previousWeight > this.MANUAL_INCREASE_THRESHOLD;
        }

        if (!isDeloadWeek && manualIncrease) {
          recommendedWeight = currentWeight;
          recommendedReps = lastReps; // Keep same reps
          progressionType = "MANUAL_JUMP";
          reasoning = `Manual weight increase detected. The app cannot calculate a rep target. Focus on RPE ${currentRPE} for this week.`;
        }

        // STEP 2: Consistency-Based Adjustment - Underperformance
        // If user performs below target reps for 2 consecutive weeks
        else if (!isDeloadWeek && history.length >= 2) {
          const last2Weeks = history.slice(-2);
          const underperformed = last2Weeks.every(
            (week) => week.targetReps > 0 && week.actualReps < week.targetReps,
          );

          if (underperformed) {
            // Reduce weight by 10%
            recommendedWeight =
              currentWeight * (1 - this.WEIGHT_DECREASE_PERCENT);
            // Reduce target reps by 10%, rounded down, minimum 1
            recommendedReps = Math.max(1, Math.floor(lastTargetReps * 0.9));
            progressionType = "UNDERPERFORMANCE";
            reasoning = `Consistent underperformance detected for 2 weeks. Reducing weight by 10% and target reps by 10% for the 3rd week.`;
          }

          // STEP 3: Consistency-Based Adjustment - Overperformance
          // If user performs >10% above target reps for 2 consecutive weeks
          else {
            const overperformed = last2Weeks.every(
              (week) =>
                week.targetReps > 0 &&
                week.actualReps >
                  week.targetReps * this.OVERPERFORMANCE_THRESHOLD,
            );

            if (overperformed) {
              recommendedWeight =
                currentWeight * (1 + this.WEIGHT_INCREASE_PERCENT);
              recommendedReps = this.calculateVolumePreservingReps(
                currentWeight,
                lastReps,
                recommendedWeight,
                setCount,
              );
              progressionType = "OVERPERFORMANCE";
              reasoning = `Consistently exceeding targets by >10% for 2 weeks! Increasing weight by 5% with volume-preserving reps for the 3rd week.`;
            }
          }
        }

        // STEP 4: Low Rep Rule
        // If reps <5, reduce weight 10% and reset target reps to 5
        if (progressionType === "NORMAL" && lastReps < this.REP_FAIL) {
          recommendedWeight =
            currentWeight * (1 - this.WEIGHT_DECREASE_PERCENT);
          recommendedReps = this.REP_FAIL;
          progressionType = "FAILURE";
          reasoning = `Rep count too low (<${this.REP_FAIL}). Reducing weight by 10% and resetting to ${this.REP_FAIL} reps.`;
        }

        // STEP 5: Rep Cap Rule
        // If reps >=15, increase weight 5% and recalculate reps
        else if (progressionType === "NORMAL" && lastReps >= this.REP_CAP) {
          recommendedWeight =
            currentWeight * (1 + this.WEIGHT_INCREASE_PERCENT);
          recommendedReps = this.calculateVolumePreservingReps(
            currentWeight,
            lastReps,
            recommendedWeight,
            setCount,
          );
          progressionType = "REP_CAP";
          reasoning = `Rep cap reached (≥${this.REP_CAP})! Increasing weight by 5% with volume-preserving reps.`;
        }

        // STEP 6: Normal Weekly Progression
        // Add +1 rep per set until rep cap
        else if (progressionType === "NORMAL") {
          recommendedWeight = currentWeight;
          recommendedReps = Math.min(lastReps + 1, this.REP_CAP);
          reasoning = `Normal progression: Add +1 rep per set. Target RPE ${currentRPE}.`;
        }

        const setRecommendations = this.buildSetRecommendations(
          lastWorkoutSets,
          currentSetDefinitions,
          currentRPE,
          progressionType,
        );

        const topRecommendation = setRecommendations[0] || {
          setNumber: 1,
          recommendedWeight,
          recommendedReps,
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
              targetReps: set.reps, // Store actual reps as target for next session comparison
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
        include: {
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
        include: {
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

      // Calculate week-to-date volume at the same day index as the current workout.
      const getWeekToDateVolume = (week: number, dayNumber: number | null): number => {
        const workouts = (weeklyData[week] || []).filter((workout) => {
          if (!dayNumber || !workout.dayNumber) return true;
          return workout.dayNumber <= dayNumber;
        });

        let totalVolume = 0;
        workouts.forEach((workout) => {
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
        const totalCurrentVolume = getWeekToDateVolume(
          currentWeek,
          comparisonDayNumber,
        );
        const totalLastVolume = getWeekToDateVolume(
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
        const totalCurrentVolume = getWeekToDateVolume(
          currentWeek,
          comparisonDayNumber,
        );
        const totalWeek1Volume = getWeekToDateVolume(1, comparisonDayNumber);

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
          include: {
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
        include: {
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
