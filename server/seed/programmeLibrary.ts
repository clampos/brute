// server/seed/programmeLibrary.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Exercise data with proper muscle groups and categories
const exerciseData = [
  // Compound Movements
  { name: 'Barbell Squat', muscleGroup: 'Legs', category: 'Compound', equipment: 'Barbell', instructions: 'Stand with feet shoulder-width apart, lower by sitting back and down, keeping chest up' },
  { name: 'Deadlift', muscleGroup: 'Back', category: 'Compound', equipment: 'Barbell', instructions: 'Lift bar from floor by extending hips and knees, keep back neutral' },
  { name: 'Bench Press', muscleGroup: 'Chest', category: 'Compound', equipment: 'Barbell', instructions: 'Lie on bench, lower bar to chest, press up explosively' },
  { name: 'Overhead Press', muscleGroup: 'Shoulders', category: 'Compound', equipment: 'Barbell', instructions: 'Press bar from shoulders overhead, keep core tight' },
  { name: 'Bent-Over Row', muscleGroup: 'Back', category: 'Compound', equipment: 'Barbell', instructions: 'Hinge at hips, pull bar to lower chest, squeeze shoulder blades' },
  { name: 'Pull-ups', muscleGroup: 'Back', category: 'Compound', equipment: 'Bodyweight', instructions: 'Hang from bar, pull body up until chin clears bar' },
  { name: 'Dips', muscleGroup: 'Chest', category: 'Compound', equipment: 'Bodyweight', instructions: 'Lower body by bending arms, push back up' },
  
  // Isolation Movements
  { name: 'Dumbbell Bicep Curls', muscleGroup: 'Arms', category: 'Isolation', equipment: 'Dumbbell', instructions: 'Curl dumbbells up by flexing biceps, control the descent' },
  { name: 'Tricep Dips', muscleGroup: 'Arms', category: 'Isolation', equipment: 'Bodyweight', instructions: 'Lower body by bending arms behind you, push back up' },
  { name: 'Lateral Raises', muscleGroup: 'Shoulders', category: 'Isolation', equipment: 'Dumbbell', instructions: 'Raise arms out to sides until parallel with floor' },
  { name: 'Leg Curls', muscleGroup: 'Legs', category: 'Isolation', equipment: 'Machine', instructions: 'Curl heels toward glutes, control the return' },
  { name: 'Leg Extensions', muscleGroup: 'Legs', category: 'Isolation', equipment: 'Machine', instructions: 'Extend legs from seated position, squeeze quads' },
  { name: 'Calf Raises', muscleGroup: 'Legs', category: 'Isolation', equipment: 'Bodyweight', instructions: 'Rise up on toes, hold briefly, lower slowly' },
  { name: 'Plank', muscleGroup: 'Core', category: 'Isolation', equipment: 'Bodyweight', instructions: 'Hold body in straight line from head to heels' },
  
  // Additional Compound Movements
  { name: 'Romanian Deadlift', muscleGroup: 'Legs', category: 'Compound', equipment: 'Barbell', instructions: 'Hinge at hips, lower bar while keeping legs relatively straight' },
  { name: 'Incline Bench Press', muscleGroup: 'Chest', category: 'Compound', equipment: 'Barbell', instructions: 'Press bar from inclined position, targets upper chest' },
  { name: 'Decline Bench Press', muscleGroup: 'Chest', category: 'Compound', equipment: 'Barbell', instructions: 'Press bar from declined position, targets lower chest' },
  { name: 'Front Squat', muscleGroup: 'Legs', category: 'Compound', equipment: 'Barbell', instructions: 'Squat with bar in front rack position, keep torso upright' },
  { name: 'Lunges', muscleGroup: 'Legs', category: 'Compound', equipment: 'Bodyweight', instructions: 'Step forward into lunge, alternate legs' },
  { name: 'Bulgarian Split Squats', muscleGroup: 'Legs', category: 'Compound', equipment: 'Bodyweight', instructions: 'Rear foot elevated, lunge with front leg' },
];

// Programme templates
const programmeTemplates = [
  {
    name: 'Full Body 3 Day',
    daysPerWeek: 3,
    weeks: 8,
    bodyPartFocus: 'Full Body',
    description: 'Perfect for beginners or those returning to training. Hits all major muscle groups 3 times per week.',
    exercises: [
      // Day 1
      { dayNumber: 1, orderIndex: 1, exerciseName: 'Barbell Squat', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 2, exerciseName: 'Bench Press', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 3, exerciseName: 'Bent-Over Row', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 4, exerciseName: 'Overhead Press', sets: 3, reps: '10-12', restSeconds: 120 },
      { dayNumber: 1, orderIndex: 5, exerciseName: 'Dumbbell Bicep Curls', sets: 3, reps: '12-15', restSeconds: 90 },
      { dayNumber: 1, orderIndex: 6, exerciseName: 'Plank', sets: 3, reps: '30-60s', restSeconds: 90 },
      
      // Day 2
      { dayNumber: 2, orderIndex: 1, exerciseName: 'Deadlift', sets: 3, reps: '6-8', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 2, exerciseName: 'Incline Bench Press', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 3, exerciseName: 'Pull-ups', sets: 3, reps: '8-12', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 4, exerciseName: 'Lunges', sets: 3, reps: '12-15', restSeconds: 120 },
      { dayNumber: 2, orderIndex: 5, exerciseName: 'Lateral Raises', sets: 3, reps: '12-15', restSeconds: 90 },
      { dayNumber: 2, orderIndex: 6, exerciseName: 'Tricep Dips', sets: 3, reps: '10-15', restSeconds: 90 },
      
      // Day 3
      { dayNumber: 3, orderIndex: 1, exerciseName: 'Front Squat', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 2, exerciseName: 'Decline Bench Press', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 3, exerciseName: 'Romanian Deadlift', sets: 3, reps: '10-12', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 4, exerciseName: 'Dips', sets: 3, reps: '10-15', restSeconds: 120 },
      { dayNumber: 3, orderIndex: 5, exerciseName: 'Bulgarian Split Squats', sets: 3, reps: '12-15', restSeconds: 90 },
      { dayNumber: 3, orderIndex: 6, exerciseName: 'Calf Raises', sets: 3, reps: '15-20', restSeconds: 90 },
    ]
  },
  
  {
    name: 'Full Body 4 Day',
    daysPerWeek: 4,
    weeks: 8,
    bodyPartFocus: 'Full Body',
    description: 'Increased frequency for faster progress. Great for intermediate lifters.',
    exercises: [
      // Day 1 - Lower Focus
      { dayNumber: 1, orderIndex: 1, exerciseName: 'Barbell Squat', sets: 4, reps: '6-8', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 2, exerciseName: 'Romanian Deadlift', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 3, exerciseName: 'Bench Press', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 4, exerciseName: 'Bent-Over Row', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 5, exerciseName: 'Leg Curls', sets: 3, reps: '12-15', restSeconds: 90 },
      { dayNumber: 1, orderIndex: 6, exerciseName: 'Calf Raises', sets: 4, reps: '15-20', restSeconds: 90 },
      
      // Day 2 - Upper Focus
      { dayNumber: 2, orderIndex: 1, exerciseName: 'Overhead Press', sets: 4, reps: '6-8', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 2, exerciseName: 'Pull-ups', sets: 4, reps: '8-12', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 3, exerciseName: 'Incline Bench Press', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 4, exerciseName: 'Lunges', sets: 3, reps: '12-15', restSeconds: 120 },
      { dayNumber: 2, orderIndex: 5, exerciseName: 'Lateral Raises', sets: 4, reps: '12-15', restSeconds: 90 },
      { dayNumber: 2, orderIndex: 6, exerciseName: 'Dumbbell Bicep Curls', sets: 3, reps: '12-15', restSeconds: 90 },
      
      // Day 3 - Power Focus
      { dayNumber: 3, orderIndex: 1, exerciseName: 'Deadlift', sets: 4, reps: '5-6', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 2, exerciseName: 'Front Squat', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 3, exerciseName: 'Decline Bench Press', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 4, exerciseName: 'Bulgarian Split Squats', sets: 3, reps: '12-15', restSeconds: 120 },
      { dayNumber: 3, orderIndex: 5, exerciseName: 'Tricep Dips', sets: 3, reps: '10-15', restSeconds: 90 },
      { dayNumber: 3, orderIndex: 6, exerciseName: 'Plank', sets: 3, reps: '45-90s', restSeconds: 90 },
      
      // Day 4 - Volume Focus
      { dayNumber: 4, orderIndex: 1, exerciseName: 'Barbell Squat', sets: 3, reps: '10-12', restSeconds: 180 },
      { dayNumber: 4, orderIndex: 2, exerciseName: 'Bench Press', sets: 3, reps: '10-12', restSeconds: 180 },
      { dayNumber: 4, orderIndex: 3, exerciseName: 'Bent-Over Row', sets: 3, reps: '10-12', restSeconds: 180 },
      { dayNumber: 4, orderIndex: 4, exerciseName: 'Overhead Press', sets: 3, reps: '10-12', restSeconds: 120 },
      { dayNumber: 4, orderIndex: 5, exerciseName: 'Leg Extensions', sets: 3, reps: '15-20', restSeconds: 90 },
      { dayNumber: 4, orderIndex: 6, exerciseName: 'Dips', sets: 3, reps: '12-18', restSeconds: 90 },
    ]
  },
  
  {
    name: 'Full Body 5 Day',
    daysPerWeek: 5,
    weeks: 8,
    bodyPartFocus: 'Full Body',
    description: 'High frequency training for advanced lifters. Maximum muscle stimulation.',
    exercises: [
      // Day 1 - Strength Focus
      { dayNumber: 1, orderIndex: 1, exerciseName: 'Barbell Squat', sets: 5, reps: '5', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 2, exerciseName: 'Bench Press', sets: 5, reps: '5', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 3, exerciseName: 'Bent-Over Row', sets: 4, reps: '6-8', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 4, exerciseName: 'Overhead Press', sets: 3, reps: '8-10', restSeconds: 120 },
      { dayNumber: 1, orderIndex: 5, exerciseName: 'Dumbbell Bicep Curls', sets: 3, reps: '12-15', restSeconds: 90 },
      
      // Day 2 - Volume Lower
      { dayNumber: 2, orderIndex: 1, exerciseName: 'Deadlift', sets: 4, reps: '6-8', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 2, exerciseName: 'Romanian Deadlift', sets: 3, reps: '10-12', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 3, exerciseName: 'Lunges', sets: 3, reps: '12-15', restSeconds: 120 },
      { dayNumber: 2, orderIndex: 4, exerciseName: 'Bulgarian Split Squats', sets: 3, reps: '12-15', restSeconds: 120 },
      { dayNumber: 2, orderIndex: 5, exerciseName: 'Leg Curls', sets: 3, reps: '15-20', restSeconds: 90 },
      { dayNumber: 2, orderIndex: 6, exerciseName: 'Calf Raises', sets: 4, reps: '20-25', restSeconds: 90 },
      
      // Day 3 - Upper Power
      { dayNumber: 3, orderIndex: 1, exerciseName: 'Incline Bench Press', sets: 4, reps: '6-8', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 2, exerciseName: 'Pull-ups', sets: 4, reps: '8-12', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 3, exerciseName: 'Decline Bench Press', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 4, exerciseName: 'Lateral Raises', sets: 4, reps: '12-15', restSeconds: 90 },
      { dayNumber: 3, orderIndex: 5, exerciseName: 'Tricep Dips', sets: 3, reps: '12-18', restSeconds: 90 },
      { dayNumber: 3, orderIndex: 6, exerciseName: 'Plank', sets: 3, reps: '60-90s', restSeconds: 90 },
      
      // Day 4 - Hypertrophy Focus
      { dayNumber: 4, orderIndex: 1, exerciseName: 'Front Squat', sets: 4, reps: '8-10', restSeconds: 180 },
      { dayNumber: 4, orderIndex: 2, exerciseName: 'Bench Press', sets: 4, reps: '8-10', restSeconds: 180 },
      { dayNumber: 4, orderIndex: 3, exerciseName: 'Bent-Over Row', sets: 4, reps: '8-10', restSeconds: 180 },
      { dayNumber: 4, orderIndex: 4, exerciseName: 'Overhead Press', sets: 3, reps: '10-12', restSeconds: 120 },
      { dayNumber: 4, orderIndex: 5, exerciseName: 'Dips', sets: 3, reps: '12-18', restSeconds: 90 },
      { dayNumber: 4, orderIndex: 6, exerciseName: 'Leg Extensions', sets: 3, reps: '15-20', restSeconds: 90 },
      
      // Day 5 - Volume/Conditioning
      { dayNumber: 5, orderIndex: 1, exerciseName: 'Deadlift', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 5, orderIndex: 2, exerciseName: 'Barbell Squat', sets: 3, reps: '12-15', restSeconds: 180 },
      { dayNumber: 5, orderIndex: 3, exerciseName: 'Pull-ups', sets: 3, reps: '10-15', restSeconds: 180 },
      { dayNumber: 5, orderIndex: 4, exerciseName: 'Lunges', sets: 3, reps: '15-20', restSeconds: 120 },
      { dayNumber: 5, orderIndex: 5, exerciseName: 'Lateral Raises', sets: 3, reps: '15-20', restSeconds: 90 },
      { dayNumber: 5, orderIndex: 6, exerciseName: 'Dumbbell Bicep Curls', sets: 3, reps: '15-20', restSeconds: 90 },
    ]
  },
  
  {
    name: 'Upper Body Focus 3 Day',
    daysPerWeek: 3,
    weeks: 6,
    bodyPartFocus: 'Upper Body',
    description: 'Specialized programme for upper body development with minimal lower body work.',
    exercises: [
      // Day 1 - Chest & Triceps
      { dayNumber: 1, orderIndex: 1, exerciseName: 'Bench Press', sets: 4, reps: '6-8', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 2, exerciseName: 'Incline Bench Press', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 3, exerciseName: 'Decline Bench Press', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 4, exerciseName: 'Dips', sets: 3, reps: '10-15', restSeconds: 120 },
      { dayNumber: 1, orderIndex: 5, exerciseName: 'Tricep Dips', sets: 3, reps: '12-18', restSeconds: 90 },
      { dayNumber: 1, orderIndex: 6, exerciseName: 'Barbell Squat', sets: 3, reps: '12-15', restSeconds: 180 },
      
      // Day 2 - Back & Biceps
      { dayNumber: 2, orderIndex: 1, exerciseName: 'Pull-ups', sets: 4, reps: '8-12', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 2, exerciseName: 'Bent-Over Row', sets: 4, reps: '8-10', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 3, exerciseName: 'Deadlift', sets: 3, reps: '8-10', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 4, exerciseName: 'Dumbbell Bicep Curls', sets: 4, reps: '12-15', restSeconds: 90 },
      { dayNumber: 2, orderIndex: 5, exerciseName: 'Romanian Deadlift', sets: 3, reps: '10-12', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 6, exerciseName: 'Plank', sets: 3, reps: '45-75s', restSeconds: 90 },
      
      // Day 3 - Shoulders & Arms
      { dayNumber: 3, orderIndex: 1, exerciseName: 'Overhead Press', sets: 4, reps: '6-8', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 2, exerciseName: 'Lateral Raises', sets: 4, reps: '12-15', restSeconds: 90 },
      { dayNumber: 3, orderIndex: 3, exerciseName: 'Bench Press', sets: 3, reps: '10-12', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 4, exerciseName: 'Pull-ups', sets: 3, reps: '10-15', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 5, exerciseName: 'Dumbbell Bicep Curls', sets: 3, reps: '12-15', restSeconds: 90 },
      { dayNumber: 3, orderIndex: 6, exerciseName: 'Lunges', sets: 3, reps: '12-15', restSeconds: 120 },
    ]
  },
  
  {
    name: 'Lower Body Focus 3 Day',
    daysPerWeek: 3,
    weeks: 6,
    bodyPartFocus: 'Lower Body',
    description: 'Specialized programme for lower body strength and muscle development.',
    exercises: [
      // Day 1 - Squat Focus
      { dayNumber: 1, orderIndex: 1, exerciseName: 'Barbell Squat', sets: 5, reps: '5', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 2, exerciseName: 'Romanian Deadlift', sets: 4, reps: '8-10', restSeconds: 180 },
      { dayNumber: 1, orderIndex: 3, exerciseName: 'Lunges', sets: 3, reps: '12-15', restSeconds: 120 },
      { dayNumber: 1, orderIndex: 4, exerciseName: 'Leg Extensions', sets: 3, reps: '15-20', restSeconds: 90 },
      { dayNumber: 1, orderIndex: 5, exerciseName: 'Calf Raises', sets: 4, reps: '20-25', restSeconds: 90 },
      { dayNumber: 1, orderIndex: 6, exerciseName: 'Bench Press', sets: 3, reps: '8-10', restSeconds: 180 },
      
      // Day 2 - Deadlift Focus
      { dayNumber: 2, orderIndex: 1, exerciseName: 'Deadlift', sets: 5, reps: '5', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 2, exerciseName: 'Front Squat', sets: 4, reps: '8-10', restSeconds: 180 },
      { dayNumber: 2, orderIndex: 3, exerciseName: 'Bulgarian Split Squats', sets: 3, reps: '12-15', restSeconds: 120 },
      { dayNumber: 2, orderIndex: 4, exerciseName: 'Leg Curls', sets: 3, reps: '15-20', restSeconds: 90 },
      { dayNumber: 2, orderIndex: 5, exerciseName: 'Calf Raises', sets: 4, reps: '20-25', restSeconds: 90 },
      { dayNumber: 2, orderIndex: 6, exerciseName: 'Pull-ups', sets: 3, reps: '8-12', restSeconds: 180 },
      
      // Day 3 - Volume & Conditioning
      { dayNumber: 3, orderIndex: 1, exerciseName: 'Barbell Squat', sets: 4, reps: '10-12', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 2, exerciseName: 'Romanian Deadlift', sets: 4, reps: '12-15', restSeconds: 180 },
      { dayNumber: 3, orderIndex: 3, exerciseName: 'Lunges', sets: 4, reps: '15-20', restSeconds: 120 },
      { dayNumber: 3, orderIndex: 4, exerciseName: 'Bulgarian Split Squats', sets: 3, reps: '15-20', restSeconds: 120 },
      { dayNumber: 3, orderIndex: 5, exerciseName: 'Leg Extensions', sets: 3, reps: '20-25', restSeconds: 90 },
      { dayNumber: 3, orderIndex: 6, exerciseName: 'Overhead Press', sets: 3, reps: '8-10', restSeconds: 180 },
    ]
  }
];

export async function seedProgrammeLibrary() {
  console.log('🌱 Starting programme library seed...');
  
  try {
    // First, create all exercises
    console.log('Creating exercises...');
    const createdExercises = new Map();
    
    for (const exerciseData of exerciseData) {
      const exercise = await prisma.exercise.upsert({
        where: { name: exerciseData.name },
        update: {},
        create: {
          name: exerciseData.name,
          muscleGroup: exerciseData.muscleGroup,
          category: exerciseData.category,
          equipment: exerciseData.equipment,
          instructions: exerciseData.instructions,
        }
      });
      createdExercises.set(exerciseData.name, exercise);
    }
    
    console.log(`✅ Created ${createdExercises.size} exercises`);
    
    // Then, create programmes with their exercises
    console.log('Creating programmes...');
    
    for (const programmeTemplate of programmeTemplates) {
      const programme = await prisma.programme.upsert({
        where: { name: programmeTemplate.name },
        update: {},
        create: {
          name: programmeTemplate.name,
          daysPerWeek: programmeTemplate.daysPerWeek,
          weeks: programmeTemplate.weeks,
          bodyPartFocus: programmeTemplate.bodyPartFocus,
          description: programmeTemplate.description,
        }
      });
      
      // Clear existing programme exercises if any
      await prisma.programmeExercise.deleteMany({
        where: { programmeId: programme.id }
      });
      
      // Create programme exercises
      for (const exerciseTemplate of programmeTemplate.exercises) {
        const exercise = createdExercises.get(exerciseTemplate.exerciseName);
        if (!exercise) {
          console.warn(`⚠️ Exercise not found: ${exerciseTemplate.exerciseName}`);
          continue;
        }
        
        await prisma.programmeExercise.create({
          data: {
            programmeId: programme.id,
            exerciseId: exercise.id,
            dayNumber: exerciseTemplate.dayNumber,
            orderIndex: exerciseTemplate.orderIndex,
            sets: exerciseTemplate.sets,
            reps: exerciseTemplate.reps,
            restSeconds: exerciseTemplate.restSeconds,
          }
        });
      }
      
      console.log(`✅ Created programme: ${programme.name}`);
    }
    
    console.log('🎉 Programme library seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding programme library:', error);
    throw error;
  }
}

// Run this function manually or as part of a seed script
export default seedProgrammeLibrary;