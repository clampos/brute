// server/programmes.ts
import express, { Request, Response } from 'express';
import { authenticateToken } from './authMiddleware';
import { prisma } from './prisma';

const router = express.Router();

// Get all available programmes
router.get('/programmes', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const programmes = await prisma.programme.findMany({
      include: {
        exercises: {
          include: {
            exercise: true
          },
          orderBy: [
            { dayNumber: 'asc' },
            { orderIndex: 'asc' }
          ]
        }
      }
    });

    res.json(programmes);
  } catch (error) {
    console.error('Error fetching programmes:', error);
    res.status(500).json({ error: 'Failed to fetch programmes' });
  }
});

// Get programme details by ID
router.get('/programmes/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    const programme = await prisma.programme.findUnique({
      where: { id },
      include: {
        exercises: {
          include: {
            exercise: true
          },
          orderBy: [
            { dayNumber: 'asc' },
            { orderIndex: 'asc' }
          ]
        }
      }
    });

    if (!programme) {
      return res.status(404).json({ error: 'Programme not found' });
    }

    res.json(programme);
  } catch (error) {
    console.error('Error fetching programme:', error);
    res.status(500).json({ error: 'Failed to fetch programme' });
  }
});

// Start a programme for a user
router.post('/programmes/:id/start', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Check if user already has an active programme
    const existingActiveProgram = await prisma.userProgram.findFirst({
      where: {
        userId,
        status: 'ACTIVE'
      }
    });

    if (existingActiveProgram) {
      return res.status(400).json({ error: 'You already have an active programme. Please complete or cancel it first.' });
    }

    // Verify programme exists
    const programme = await prisma.programme.findUnique({
      where: { id }
    });

    if (!programme) {
      return res.status(404).json({ error: 'Programme not found' });
    }

    // Create user program
    const userProgram = await prisma.userProgram.create({
      data: {
        userId,
        programmeId: id,
        startDate: new Date(),
        status: 'ACTIVE'
      },
      include: {
        programme: {
          include: {
            exercises: {
              include: {
                exercise: true
              },
              orderBy: [
                { dayNumber: 'asc' },
                { orderIndex: 'asc' }
              ]
            }
          }
        }
      }
    });

    res.json(userProgram);
  } catch (error) {
    console.error('Error starting programme:', error);
    res.status(500).json({ error: 'Failed to start programme' });
  }
});

// Get user's current programme
router.get('/my-programme', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;

    const userProgram = await prisma.userProgram.findFirst({
      where: {
        userId,
        status: 'ACTIVE'
      },
      include: {
        programme: {
          include: {
            exercises: {
              include: {
                exercise: true
              },
              orderBy: [
                { dayNumber: 'asc' },
                { orderIndex: 'asc' }
              ]
            }
          }
        }
      }
    });

    if (!userProgram) {
      return res.status(404).json({ error: 'No active programme found' });
    }

    res.json(userProgram);
  } catch (error) {
    console.error('Error fetching user programme:', error);
    res.status(500).json({ error: 'Failed to fetch user programme' });
  }
});

// Get today's workout
router.get('/today-workout', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;

    const userProgram = await prisma.userProgram.findFirst({
      where: {
        userId,
        status: 'ACTIVE'
      },
      include: {
        programme: {
          include: {
            exercises: {
              include: {
                exercise: true
              },
              where: {
                dayNumber: { in: [1, 2, 3, 4, 5, 6, 7] } // Will filter by currentDay
              },
              orderBy: {
                orderIndex: 'asc'
              }
            }
          }
        }
      }
    });

    if (!userProgram) {
      return res.status(404).json({ error: 'No active programme found' });
    }

    // Get exercises for current day
    const todayExercises = userProgram.programme.exercises.filter(
      ex => ex.dayNumber === userProgram.currentDay
    );

    // Calculate progression weights based on previous workouts
    const progressionData = await calculateProgressionWeights(userProgram.id, userProgram.currentWeek, userProgram.currentDay);

    res.json({
      userProgram,
      exercises: todayExercises,
      progressionData,
      weekNumber: userProgram.currentWeek,
      dayNumber: userProgram.currentDay
    });
  } catch (error) {
    console.error('Error fetching today workout:', error);
    res.status(500).json({ error: 'Failed to fetch today workout' });
  }
});

// Complete a workout
router.post('/workouts/complete', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { userProgramId, exercises, duration, notes } = req.body;
    const userId = (req as any).user.userId;

    // Verify user program belongs to user
    const userProgram = await prisma.userProgram.findFirst({
      where: {
        id: userProgramId,
        userId,
        status: 'ACTIVE'
      }
    });

    if (!userProgram) {
      return res.status(404).json({ error: 'User program not found' });
    }

    // Create workout record
    const workout = await prisma.workout.create({
      data: {
        userProgramId,
        weekNumber: userProgram.currentWeek,
        dayNumber: userProgram.currentDay,
        completedAt: new Date(),
        duration,
        notes
      }
    });

    // Create workout exercises and sets
    for (const exercise of exercises) {
      const workoutExercise = await prisma.workoutExercise.create({
        data: {
          workoutId: workout.id,
          exerciseId: exercise.exerciseId,
          orderIndex: exercise.orderIndex
        }
      });

      // Create sets
      for (const set of exercise.sets) {
        await prisma.workoutSet.create({
          data: {
            workoutExerciseId: workoutExercise.id,
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            restSeconds: set.restSeconds,
            notes: set.notes,
            completed: set.completed
          }
        });
      }
    }

    // Update user program progress
    const { currentWeek, currentDay } = userProgram;
    const programme = await prisma.programme.findUnique({
      where: { id: userProgram.programmeId }
    });

    if (!programme) {
      return res.status(404).json({ error: 'Programme not found' });
    }

    let newWeek = currentWeek;
    let newDay = currentDay;
    let newStatus = userProgram.status;

    // Calculate next day/week
    if (currentDay < programme.daysPerWeek) {
      newDay = currentDay + 1;
    } else {
      newDay = 1;
      newWeek = currentWeek + 1;
      
      // Check if programme is completed
      if (newWeek > programme.weeks) {
        newStatus = 'COMPLETED';
      }
    }

    await prisma.userProgram.update({
      where: { id: userProgramId },
      data: {
        currentWeek: newWeek,
        currentDay: newDay,
        status: newStatus,
        ...(newStatus === 'COMPLETED' && { endDate: new Date() })
      }
    });

    res.json({
      workout,
      nextWeek: newWeek,
      nextDay: newDay,
      programmeCompleted: newStatus === 'COMPLETED'
    });
  } catch (error) {
    console.error('Error completing workout:', error);
    res.status(500).json({ error: 'Failed to complete workout' });
  }
});

// Get workout history
router.get('/workouts/history', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const workouts = await prisma.workout.findMany({
      where: {
        userProgram: {
          userId
        }
      },
      include: {
        userProgram: {
          include: {
            programme: true
          }
        },
        exercises: {
          include: {
            exercise: true,
            sets: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      skip,
      take: Number(limit)
    });

    const totalWorkouts = await prisma.workout.count({
      where: {
        userProgram: {
          userId
        }
      }
    });

    res.json({
      workouts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalWorkouts,
        totalPages: Math.ceil(totalWorkouts / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching workout history:', error);
    res.status(500).json({ error: 'Failed to fetch workout history' });
  }
});

// Helper function to calculate progression weights
async function calculateProgressionWeights(userProgramId: string, currentWeek: number, currentDay: number) {
  if (currentWeek === 1) {
    return {}; // No progression for first week
  }

  try {
    // Get the most recent workout for this day from previous week
    const previousWorkout = await prisma.workout.findFirst({
      where: {
        userProgramId,
        weekNumber: currentWeek - 1,
        dayNumber: currentDay
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: {
              orderBy: {
                setNumber: 'asc'
              }
            }
          }
        }
      }
    });

    if (!previousWorkout) {
      return {};
    }

    const progressionData: any = {};

    // Calculate progression for each exercise
    for (const workoutExercise of previousWorkout.exercises) {
      const exerciseId = workoutExercise.exerciseId;
      const sets = workoutExercise.sets;

      if (sets.length > 0) {
        // Find the best set (highest weight * reps)
        const bestSet = sets.reduce((best, current) => {
          const bestScore = (best.weight || 0) * best.reps;
          const currentScore = (current.weight || 0) * current.reps;
          return currentScore > bestScore ? current : best;
        });

        // Calculate progression (typically 2.5kg for upper body, 5kg for lower body)
        const exercise = workoutExercise.exercise;
        const isLowerBody = ['legs', 'quadriceps', 'hamstrings', 'glutes', 'calves'].includes(exercise.muscleGroup.toLowerCase());
        const progression = isLowerBody ? 5 : 2.5;

        progressionData[exerciseId] = {
          suggestedWeight: (bestSet.weight || 0) + progression,
          previousWeight: bestSet.weight || 0,
          previousReps: bestSet.reps,
          targetReps: bestSet.reps >= 12 ? bestSet.reps : bestSet.reps + 1 // Increase reps if under 12
        };
      }
    }

    return progressionData;
  } catch (error) {
    console.error('Error calculating progression:', error);
    return {};
  }
}

export default router;