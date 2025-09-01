// server/services/progressiveOverloadService.ts
import { prisma } from "../prisma";

export interface WorkoutData {
  exerciseId: string;
  sets: Array<{
    weight: number;
    reps: number;
    rpe?: number; // Rate of Perceived Exertion (1-10)
    completed: boolean;
  }>;
}

export interface ProgressiveOverloadRecommendation {
  exerciseId: string;
  recommendedWeight: number;
  recommendedReps: number;
  progressionType: 'weight' | 'reps' | 'both';
  reasoning: string;
}

export class ProgressiveOverloadService {
  
  /**
   * Save workout data and calculate next session recommendations
   */
  static async saveWorkoutAndCalculateProgression(
    userId: string,
    workoutData: WorkoutData[]
  ): Promise<{ 
    workoutId: string; 
    recommendations: ProgressiveOverloadRecommendation[] 
  }> {
    
    // Create workout entry
    const workout = await prisma.workout.create({
      data: {
        userProgramId: await this.getCurrentUserProgramId(userId),
        weekNumber: await this.getCurrentWeek(userId),
        dayNumber: await this.getCurrentDay(userId),
        completedAt: new Date(),
        duration: null, // Can be calculated from timer data
      }
    });

    const recommendations: ProgressiveOverloadRecommendation[] = [];

    // Process each exercise
    for (const exerciseData of workoutData) {
      // Save workout exercise and sets
      const workoutExercise = await prisma.workoutExercise.create({
        data: {
          workoutId: workout.id,
          exerciseId: exerciseData.exerciseId,
          orderIndex: 0, // You might want to track this properly
        }
      });

      // Save individual sets
      for (let i = 0; i < exerciseData.sets.length; i++) {
        const set = exerciseData.sets[i];
        await prisma.workoutSet.create({
          data: {
            workoutExerciseId: workoutExercise.id,
            setNumber: i + 1,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            completed: set.completed,
          }
        });
      }

      // Calculate progression for next workout
      const recommendation = await this.calculateProgression(
        userId,
        exerciseData.exerciseId
      );
      recommendations.push(recommendation);
    }

    return {
      workoutId: workout.id,
      recommendations
    };
  }

  /**
   * Get progression recommendations for upcoming workout
   */
  static async getProgressionRecommendations(
    userId: string,
    exerciseIds: string[]
  ): Promise<ProgressiveOverloadRecommendation[]> {
    const recommendations: ProgressiveOverloadRecommendation[] = [];

    for (const exerciseId of exerciseIds) {
      const recommendation = await this.calculateProgression(userId, exerciseId);
      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * Core progression calculation algorithm
   */
  private static async calculateProgression(
    userId: string,
    exerciseId: string
  ): Promise<ProgressiveOverloadRecommendation> {
    
    // Get user's workout history for this exercise (last 3 sessions)
    const recentWorkouts = await prisma.workoutSet.findMany({
      where: {
        workoutExercise: {
          exerciseId,
          workout: {
            userProgram: {
              userId
            }
          }
        },
        completed: true
      },
      include: {
        workoutExercise: {
          include: {
            workout: {
              select: {
                completedAt: true
              }
            }
          }
        }
      },
      orderBy: {
        workoutExercise: {
          workout: {
            completedAt: 'desc'
          }
        }
      },
      take: 15 // Last 5 workouts * ~3 sets each
    });

    if (recentWorkouts.length === 0) {
      // First time doing this exercise - use program defaults
      return {
        exerciseId,
        recommendedWeight: 0, // User should input starting weight
        recommendedReps: 8,
        progressionType: 'both',
        reasoning: 'First time performing this exercise. Start with a comfortable weight.'
      };
    }

    // Group sets by workout session
    const workoutSessions = this.groupSetsByWorkout(recentWorkouts);
    const lastSession = workoutSessions[0]; // Most recent
    
    // Calculate best performance metrics
    const lastSessionBest = this.getBestSetFromSession(lastSession);
    const allTimeBest = this.getBestSetFromAllSessions(workoutSessions);
    
    // Determine progression strategy
    return this.determineProgression(
      exerciseId,
      lastSessionBest,
      allTimeBest,
      workoutSessions
    );
  }

  /**
   * Group workout sets by session
   */
  private static groupSetsByWorkout(sets: any[]): any[][] {
    const grouped: { [key: string]: any[] } = {};
    
    sets.forEach(set => {
      const workoutId = set.workoutExercise.workout.id;
      if (!grouped[workoutId]) {
        grouped[workoutId] = [];
      }
      grouped[workoutId].push(set);
    });

    // Return as array sorted by date (most recent first)
    return Object.values(grouped).sort((a, b) => 
      new Date(b[0].workoutExercise.workout.completedAt).getTime() - 
      new Date(a[0].workoutExercise.workout.completedAt).getTime()
    );
  }

  /**
   * Get best set from a session (highest volume = weight * reps)
   */
  private static getBestSetFromSession(sets: any[]): any {
    return sets.reduce((best, current) => {
      const currentVolume = current.weight * current.reps;
      const bestVolume = best.weight * best.reps;
      return currentVolume > bestVolume ? current : best;
    });
  }

  /**
   * Get best set from all sessions
   */
  private static getBestSetFromAllSessions(sessions: any[][]): any {
    const allSets = sessions.flat();
    return this.getBestSetFromSession(allSets);
  }

  /**
   * Core progression logic
   */
  private static determineProgression(
    exerciseId: string,
    lastBest: any,
    allTimeBest: any,
    sessions: any[][]
  ): ProgressiveOverloadRecommendation {
    
    const lastWeight = lastBest.weight;
    const lastReps = lastBest.reps;
    const lastRpe = lastBest.rpe;
    
    // Progressive overload rules:
    
    // 1. If RPE < 7 and completed all reps: increase weight by 2.5-5%
    if (lastRpe && lastRpe < 7 && this.completedTargetReps(sessions[0], lastReps)) {
      const increase = lastWeight * 0.025; // 2.5% increase
      const newWeight = Math.round((lastWeight + increase) * 4) / 4; // Round to nearest 0.25kg
      
      return {
        exerciseId,
        recommendedWeight: newWeight,
        recommendedReps: lastReps,
        progressionType: 'weight',
        reasoning: `RPE was ${lastRpe}/10 - increase weight by ${increase.toFixed(1)}kg`
      };
    }
    
    // 2. If RPE 7-8 and completed all reps: add reps first, then weight
    if (lastRpe && lastRpe >= 7 && lastRpe <= 8 && this.completedTargetReps(sessions[0], lastReps)) {
      if (lastReps < 12) {
        return {
          exerciseId,
          recommendedWeight: lastWeight,
          recommendedReps: lastReps + 1,
          progressionType: 'reps',
          reasoning: `RPE was ${lastRpe}/10 - add 1 rep before increasing weight`
        };
      } else {
        // At 12+ reps, increase weight and drop reps
        const increase = lastWeight * 0.025;
        const newWeight = Math.round((lastWeight + increase) * 4) / 4;
        
        return {
          exerciseId,
          recommendedWeight: newWeight,
          recommendedReps: Math.max(6, lastReps - 2),
          progressionType: 'both',
          reasoning: `At high reps (${lastReps}) - increase weight and reduce reps`
        };
      }
    }
    
    // 3. If RPE 9-10 or failed to complete target reps: maintain or reduce
    if (lastRpe && lastRpe >= 9 || !this.completedTargetReps(sessions[0], lastReps)) {
      return {
        exerciseId,
        recommendedWeight: lastWeight,
        recommendedReps: lastReps,
        progressionType: 'both',
        reasoning: lastRpe >= 9 ? 
          `RPE was ${lastRpe}/10 - maintain current load` : 
          'Did not complete all target reps - maintain current load'
      };
    }
    
    // 4. No RPE data - use conservative progression
    if (this.completedTargetReps(sessions[0], lastReps)) {
      if (lastReps < 10) {
        return {
          exerciseId,
          recommendedWeight: lastWeight,
          recommendedReps: lastReps + 1,
          progressionType: 'reps',
          reasoning: 'No RPE data - conservative rep progression'
        };
      } else {
        const increase = lastWeight * 0.02; // 2% increase
        const newWeight = Math.round((lastWeight + increase) * 4) / 4;
        
        return {
          exerciseId,
          recommendedWeight: newWeight,
          recommendedReps: Math.max(6, lastReps - 1),
          progressionType: 'both',
          reasoning: 'No RPE data - small weight increase with rep reduction'
        };
      }
    }
    
    // Default: maintain current load
    return {
      exerciseId,
      recommendedWeight: lastWeight,
      recommendedReps: lastReps,
      progressionType: 'both',
      reasoning: 'Maintain current load - assess form and recovery'
    };
  }

  /**
   * Check if user completed target reps in most sets
   */
  private static completedTargetReps(sessionSets: any[], targetReps: number): boolean {
    const completedSets = sessionSets.filter(set => set.reps >= targetReps);
    return completedSets.length >= (sessionSets.length * 0.7); // 70% of sets completed
  }

  /**
   * Helper methods for getting user context
   */
  private static async getCurrentUserProgramId(userId: string): Promise<string> {
    const userProgram = await prisma.userProgram.findFirst({
      where: { 
        userId,
        status: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!userProgram) {
      throw new Error('No active program found for user');
    }
    
    return userProgram.id;
  }

  private static async getCurrentWeek(userId: string): Promise<number> {
    const userProgram = await prisma.userProgram.findFirst({
      where: { 
        userId,
        status: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return userProgram?.currentWeek || 1;
  }

  private static async getCurrentDay(userId: string): Promise<number> {
    const userProgram = await prisma.userProgram.findFirst({
      where: { 
        userId,
        status: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return userProgram?.currentDay || 1;
  }
}