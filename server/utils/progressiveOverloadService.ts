// server/utils/progressiveOverloadService.ts
import { prisma } from '../prisma';

export interface WorkoutSetData {
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
}

export interface WorkoutData {
  exerciseId: string;
  sets: WorkoutSetData[];
}

export interface ProgressionRecommendation {
  exerciseId: string;
  recommendedWeight: number;
  recommendedReps: number;
  recommendedRPE: number;
  progressionType: 'NORMAL' | 'REP_CAP' | 'FAILURE' | 'MANUAL_JUMP' | 'UNDERPERFORMANCE' | 'OVERPERFORMANCE' | 'INITIAL';
  reasoning: string;
}

interface PerformanceHistory {
  weekNumber: number;
  actualReps: number;
  targetReps: number;
  weight: number;
}

export class ProgressiveOverloadService {
  // Constants
  private static readonly REP_CAP = 15;
  private static readonly REP_FAIL = 5;
  private static readonly WEIGHT_INCREASE_PERCENT = 0.05;
  private static readonly WEIGHT_DECREASE_PERCENT = 0.10;
  private static readonly MANUAL_INCREASE_THRESHOLD = 1.10;
  private static readonly OVERPERFORMANCE_THRESHOLD = 1.10;
  
  /**
   * Generate RPE progression table based on program length
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
    weeks: number = 2
  ): Promise<PerformanceHistory[]> {
    const workouts = await prisma.workout.findMany({
      where: {
        userProgram: {
          userId,
          status: 'ACTIVE'
        },
        exercises: {
          some: {
            exerciseId
          }
        }
      },
      include: {
        exercises: {
          where: {
            exerciseId
          },
          include: {
            sets: {
              where: {
                completed: true
              },
              orderBy: {
                setNumber: 'asc'
              }
            }
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: weeks
    });

    return workouts.map(workout => {
      const exercise = workout.exercises[0];
      if (!exercise || exercise.sets.length === 0) {
        return {
          weekNumber: workout.weekNumber || 0,
          actualReps: 0,
          targetReps: 0,
          weight: 0
        };
      }

      // Get best set (highest volume)
      const bestSet = exercise.sets.reduce((best, current) => {
        const bestVolume = (best.weight || 0) * (best.reps || 0);
        const currentVolume = (current.weight || 0) * (current.reps || 0);
        return currentVolume > bestVolume ? current : best;
      });

      return {
        weekNumber: workout.weekNumber || 0,
        actualReps: bestSet.reps || 0,
        targetReps: bestSet.targetReps || bestSet.reps || 0,
        weight: bestSet.weight || 0
      };
    }).reverse(); // Reverse to get chronological order
  }

  /**
   * Calculate volume-preserving reps when weight changes
   */
  private static calculateVolumePreservingReps(
    previousWeight: number,
    previousReps: number,
    newWeight: number,
    sets: number
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
        status: 'ACTIVE'
      },
      include: {
        programme: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!userProgram) {
      throw new Error('No active program found for user');
    }

    return {
      userProgram,
      currentWeek: userProgram.currentWeek,
      programLength: userProgram.programme.weeks,
      currentDay: userProgram.currentDay
    };
  }

  /**
   * Main method to calculate progression recommendations
   */
  static async getProgressionRecommendations(
    userId: string,
    exerciseIds: string[]
  ): Promise<ProgressionRecommendation[]> {
    const recommendations: ProgressionRecommendation[] = [];
    
    try {
      // Get user's current program details
      const { currentWeek, programLength } = await this.getUserProgramDetails(userId);
      
      // Generate RPE table for the program
      const rpeTable = this.generateRPETable(programLength);
      const currentRPE = rpeTable[Math.min(currentWeek - 1, rpeTable.length - 1)];
      
      for (const exerciseId of exerciseIds) {
        // Get performance history
        const history = await this.getPerformanceHistory(userId, exerciseId, 3);
        
        // If no history, provide initial recommendations
        if (history.length === 0) {
          recommendations.push({
            exerciseId,
            recommendedWeight: 20, // Default starting weight
            recommendedReps: 8,
            recommendedRPE: currentRPE,
            progressionType: 'INITIAL',
            reasoning: `Starting weight for Week ${currentWeek}. Aim for RPE ${currentRPE}.`
          });
          continue;
        }
        
        // Get last session data
        const lastSession = history[history.length - 1];
        const currentWeight = lastSession.weight;
        const lastReps = lastSession.actualReps;
        const lastTargetReps = lastSession.targetReps || lastReps;
        
        // Assume 3 sets as default (you can make this configurable)
        const sets = 3;
        
        // Check for manual weight increase (if we have previous session)
        let manualIncrease = false;
        if (history.length >= 2) {
          const previousWeight = history[history.length - 2].weight;
          manualIncrease = previousWeight > 0 && (currentWeight / previousWeight) > this.MANUAL_INCREASE_THRESHOLD;
        }
        
        let recommendedWeight = currentWeight;
        let recommendedReps = lastTargetReps;
        let progressionType: ProgressionRecommendation['progressionType'] = 'NORMAL';
        let reasoning = '';
        
        // Step 1: Manual Weight Jump
        if (manualIncrease) {
          recommendedWeight = currentWeight; // Keep user's manual weight
          recommendedReps = lastTargetReps; // Maintain target
          progressionType = 'MANUAL_JUMP';
          reasoning = `Manual weight increase detected. Focus on RPE ${currentRPE} for this week.`;
        }
        
        // Step 2: Check for consistent underperformance (last 2 weeks)
        else if (history.length >= 2) {
          const underperformed = history.slice(-2).every(week => 
            week.targetReps > 0 && week.actualReps < week.targetReps
          );
          
          if (underperformed) {
            recommendedWeight = currentWeight * (1 - this.WEIGHT_DECREASE_PERCENT);
            recommendedReps = Math.max(1, Math.floor(lastTargetReps * 0.9));
            progressionType = 'UNDERPERFORMANCE';
            reasoning = `Underperformance detected. Reducing weight by 10% and target reps by 10%.`;
          }
          
          // Step 3: Check for consistent overperformance
          else {
            const overperformed = history.slice(-2).every(week => 
              week.targetReps > 0 && week.actualReps > week.targetReps * this.OVERPERFORMANCE_THRESHOLD
            );
            
            if (overperformed) {
              recommendedWeight = currentWeight * (1 + this.WEIGHT_INCREASE_PERCENT);
              recommendedReps = this.calculateVolumePreservingReps(
                currentWeight,
                lastReps,
                recommendedWeight,
                sets
              );
              progressionType = 'OVERPERFORMANCE';
              reasoning = `Consistently exceeding targets! Increasing weight by 5% with volume-preserving reps.`;
            }
          }
        }
        
        // Step 4: Low rep failure
        if (progressionType === 'NORMAL' && lastReps < this.REP_FAIL) {
          recommendedWeight = currentWeight * (1 - this.WEIGHT_DECREASE_PERCENT);
          recommendedReps = this.REP_FAIL;
          progressionType = 'FAILURE';
          reasoning = `Rep count too low. Reducing weight by 10% and resetting to ${this.REP_FAIL} reps.`;
        }
        
        // Step 5: Rep cap reached
        else if (progressionType === 'NORMAL' && lastReps >= this.REP_CAP) {
          recommendedWeight = currentWeight * (1 + this.WEIGHT_INCREASE_PERCENT);
          recommendedReps = this.calculateVolumePreservingReps(
            currentWeight,
            lastReps,
            recommendedWeight,
            sets
          );
          progressionType = 'REP_CAP';
          reasoning = `Rep cap reached! Increasing weight by 5% with volume-preserving reps.`;
        }
        
        // Step 6: Normal progression
        else if (progressionType === 'NORMAL') {
          recommendedWeight = currentWeight;
          recommendedReps = Math.min(lastReps + 1, this.REP_CAP);
          reasoning = `Standard progression: Add 1 rep per set. Target RPE ${currentRPE}.`;
        }
        
        // Round weight to nearest 0.5kg
        recommendedWeight = Math.round(recommendedWeight * 2) / 2;
        
        recommendations.push({
          exerciseId,
          recommendedWeight,
          recommendedReps,
          recommendedRPE: currentRPE,
          progressionType,
          reasoning
        });
      }
      
      return recommendations;
    } catch (error) {
      console.error('Error calculating progression recommendations:', error);
      return recommendations;
    }
  }

  /**
   * Save workout and calculate next session progression
   */
  static async saveWorkoutAndCalculateProgression(
    userId: string,
    workoutData: WorkoutData[]
  ): Promise<{ workoutId: string; recommendations: ProgressionRecommendation[] }> {
    try {
      // Get user program
      const { userProgram, currentWeek, currentDay } = await this.getUserProgramDetails(userId);
      
      // Create workout record
      const workout = await prisma.workout.create({
        data: {
          userProgramId: userProgram.id,
          weekNumber: currentWeek,
          dayNumber: currentDay,
          completedAt: new Date()
        }
      });
      
      // Save workout exercises and sets
      for (const exercise of workoutData) {
        const workoutExercise = await prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exercise.exerciseId,
            orderIndex: 0
          }
        });
        
        // Save sets with target reps for tracking
        for (let i = 0; i < exercise.sets.length; i++) {
          const set = exercise.sets[i];
          await prisma.workoutSet.create({
            data: {
              workoutExerciseId: workoutExercise.id,
              setNumber: i + 1,
              weight: set.weight,
              reps: set.reps,
              targetReps: set.reps, // Store as target for next session comparison
              rpe: set.rpe,
              completed: set.completed
            }
          });
        }
      }
      
      // Get all exercise IDs for next session recommendations
      const exerciseIds = workoutData.map(ex => ex.exerciseId);
      
      // Calculate recommendations for next session
      const recommendations = await this.getProgressionRecommendations(userId, exerciseIds);
      
      return {
        workoutId: workout.id,
        recommendations
      };
    } catch (error) {
      console.error('Error saving workout:', error);
      throw error;
    }
  }
}