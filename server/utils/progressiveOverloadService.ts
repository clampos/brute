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
   * - Week 1 = RPE 7
   * - Penultimate week = RPE 10
   * - Last week = RPE 5 (deload)
   * - Intermediate weeks spread evenly between 7 and 10, rounded down
   */
  private static generateRPETable(programLength: number): number[] {
    const rpeTable: number[] = [];

    // Week 1 always starts at RPE 7
    rpeTable[0] = 7;

    // Handle edge cases
    if (programLength === 1) return [7];
    if (programLength === 2) return [7, 5];
    if (programLength === 3) return [7, 10, 5];

    // Penultimate week = RPE 10
    rpeTable[programLength - 2] = 10;

    // Last week = RPE 5 (deload)
    rpeTable[programLength - 1] = 5;

    // Calculate intermediate weeks
    const numIntermediate = programLength - 3;
    const rpeRange = 10 - 7; // 3 RPE points to spread

    for (let i = 1; i <= numIntermediate; i++) {
      // Spread evenly between 7 and 10, rounded down
      const rpe = Math.floor(7 + (rpeRange / (numIntermediate + 1)) * i);
      rpeTable[i] = rpe;
    }

    return rpeTable;
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
      const baseline = {
        weight: 20,
        reps: 8,
        targetReps: 8,
        setNumber: 1,
        completed: true,
        setType: "main" as const,
      } as WorkoutSetHistory;

      let mainIndex = 0;
      return currentSetDefinitions.flatMap((definition, idx) => {
        if (definition.type === "drop") {
          return [];
        }

        mainIndex += 1;
        return {
          setNumber: idx + 1,
          recommendedWeight: baseline.weight,
          recommendedReps: baseline.reps,
        };
      });
    }

    const previousMainSets = previousSets.filter(
      (set) => set.setType !== "drop",
    );
    const previousDropSets = previousSets.filter(
      (set) => set.setType === "drop",
    );

    let mainIndex = 0;
    let dropIndex = 0;

    return currentSetDefinitions.flatMap((definition, idx) => {
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

    // Compute currentWeek and currentDay based on startDate and 7-day weeks
    const start = new Date(userProgram.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysSinceStart = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    const currentWeek = Math.floor(daysSinceStart / 7) + 1;

    // Current day within the user's programme week: day index within the 7-day window, capped to daysPerWeek
    const dayIndex = daysSinceStart % 7;
    const daysPerWeek = userProgram.programme.daysPerWeek || 3;
    const currentDay = Math.min(dayIndex + 1, daysPerWeek);

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
          const defaultSetRecommendations = currentSetDefinitions.flatMap(
            (definition, idx) =>
              definition.type === "drop"
                ? []
                : {
                    setNumber: idx + 1,
                    recommendedWeight: 20,
                    recommendedReps: 8,
                  },
          );

          recommendations.push({
            exerciseId,
            recommendedWeight: 20,
            recommendedReps: 8,
            recommendedRPE: currentRPE,
            progressionType: "INITIAL",
            reasoning: `Starting weight for Week ${currentWeek}. Aim for RPE ${currentRPE}.`,
            setRecommendations: defaultSetRecommendations,
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

        // STEP 1: Manual Weight Jump Rule
        // If user manually increases weight >10%, default to RPE schedule
        let manualIncrease = false;
        if (history.length >= 2) {
          const previousWeight = history[history.length - 2].weight;
          manualIncrease =
            previousWeight > 0 &&
            currentWeight / previousWeight > this.MANUAL_INCREASE_THRESHOLD;
        }

        if (manualIncrease) {
          recommendedWeight = currentWeight;
          recommendedReps = lastReps; // Keep same reps
          progressionType = "MANUAL_JUMP";
          reasoning = `Manual weight increase detected. The app cannot calculate a rep target. Focus on RPE ${currentRPE} for this week.`;
        }

        // STEP 2: Consistency-Based Adjustment - Underperformance
        // If user performs below target reps for 2 consecutive weeks
        else if (history.length >= 2) {
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
      const isProgramCompleted = nextWeek > (userProgram.programme.weeks || 4);
      
      await prisma.userProgram.update({
        where: { id: userProgram.id },
        data: {
          currentDay: isProgramCompleted ? userProgram.programme.daysPerWeek || 3 : nextDay,
          currentWeek: isProgramCompleted ? userProgram.programme.weeks || 4 : nextWeek,
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

      // Get weekly summary if at end of week
      let weeklySummary: WeeklySummary | undefined;
      if (isEndOfWeek) {
        const exerciseIds = workoutData.map((ex) => ex.exerciseId);
        weeklySummary = await this.getWeeklySummary(
          userId,
          weekNumber,
          exerciseIds,
        );
      }

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
  ): Promise<WeeklySummary> {
    try {
      const summary: WeeklySummary = {
        strengthGainVsLastWeek: null,
        strengthGainVsProgramStart: null,
        newRepMaxes: [],
        isEndOfWeek: true,
      };

      // Get workout history: current week and previous week
      const workoutsPastThreeWeeks = await prisma.workout.findMany({
        where: {
          userProgram: {
            userId,
            status: "ACTIVE",
          },
        },
        include: {
          exercises: {
            include: {
              sets: {
                where: { completed: true },
                orderBy: { setNumber: "asc" },
              },
            },
          },
        },
        orderBy: { weekNumber: "desc" },
        take: 3,
      });

      // Organize by week
      const weeklyData: Record<number, any[]> = {};
      workoutsPastThreeWeeks.forEach((workout) => {
        const week = workout.weekNumber || 0;
        if (!weeklyData[week]) weeklyData[week] = [];
        weeklyData[week].push(workout);
      });

      // Calculate volume for each exercise per week
      const getWeekVolume = (week: number, exId: string): number => {
        const workouts = weeklyData[week] || [];
        let totalVolume = 0;
        workouts.forEach((workout) => {
          const ex = workout.exercises.find((e: any) => e.exerciseId === exId);
          if (ex && ex.sets.length > 0) {
            const bestSet = ex.sets.reduce((best: any, current: any) => {
              const bestVol = (best.weight || 0) * (best.reps || 0);
              const currVol = (current.weight || 0) * (current.reps || 0);
              return currVol > bestVol ? current : best;
            });
            totalVolume += (bestSet.weight || 0) * (bestSet.reps || 0);
          }
        });
        return totalVolume;
      };

      // Strength gain vs last week
      if (weeklyData[currentWeek] && weeklyData[currentWeek - 1]) {
        let totalCurrentVolume = 0;
        let totalLastVolume = 0;
        exerciseIds.forEach((exId) => {
          totalCurrentVolume += getWeekVolume(currentWeek, exId);
          totalLastVolume += getWeekVolume(currentWeek - 1, exId);
        });

        if (totalLastVolume > 0) {
          summary.strengthGainVsLastWeek = Math.round(
            ((totalCurrentVolume - totalLastVolume) / totalLastVolume) * 100,
          );
        }
      }

      // Strength gain vs programme start (week 1)
      if (weeklyData[currentWeek] && weeklyData[1]) {
        let totalCurrentVolume = 0;
        let totalWeek1Volume = 0;
        exerciseIds.forEach((exId) => {
          totalCurrentVolume += getWeekVolume(currentWeek, exId);
          totalWeek1Volume += getWeekVolume(1, exId);
        });

        if (totalWeek1Volume > 0) {
          summary.strengthGainVsProgramStart = Math.round(
            ((totalCurrentVolume - totalWeek1Volume) / totalWeek1Volume) * 100,
          );
        }
      }

      // Detect new rep maxes
      if (weeklyData[currentWeek]) {
        for (const exId of exerciseIds) {
          const currentWorkouts = weeklyData[currentWeek] || [];
          const previousWorkouts = weeklyData[currentWeek - 1] || [];

          let currentMaxReps = 0;
          let previousMaxReps = 0;

          // Current week max
          currentWorkouts.forEach((workout) => {
            const ex = workout.exercises.find(
              (e: any) => e.exerciseId === exId,
            );
            if (ex && ex.sets.length > 0) {
              const maxSet = ex.sets.reduce((best: any, current: any) =>
                (current.reps || 0) > (best.reps || 0) ? current : best,
              );
              currentMaxReps = Math.max(currentMaxReps, maxSet.reps || 0);
            }
          });

          // Previous week max
          previousWorkouts.forEach((workout) => {
            const ex = workout.exercises.find(
              (e: any) => e.exerciseId === exId,
            );
            if (ex && ex.sets.length > 0) {
              const maxSet = ex.sets.reduce((best: any, current: any) =>
                (current.reps || 0) > (best.reps || 0) ? current : best,
              );
              previousMaxReps = Math.max(previousMaxReps, maxSet.reps || 0);
            }
          });

          // New rep max detected
          if (currentMaxReps > previousMaxReps) {
            const exercise = await prisma.exercise.findUnique({
              where: { id: exId },
            });
            summary.newRepMaxes.push({
              exerciseName: exercise?.name || "Unknown",
              reps: currentMaxReps,
              weight: 0, // We could calculate this but keeping it simple
            });
          }
        }
      }

      return summary;
    } catch (error) {
      console.error("Error calculating weekly summary:", error);
      return {
        strengthGainVsLastWeek: null,
        strengthGainVsProgramStart: null,
        newRepMaxes: [],
        isEndOfWeek: true,
      };
    }
  }
}
