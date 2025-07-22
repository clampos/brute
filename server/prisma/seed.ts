// seed-complete.ts - Complete seed script for exercises and programmes

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedExercises() {
  const existingCount = await prisma.exercise.count();
  if (existingCount > 0) {
    console.log('Exercises already seeded.');
    return;
  }

const exercises = [
  // CHEST EXERCISES
  {
    name: "Barbell Bench Press",
    muscleGroup: "Chest",
    category: "Compound",
    equipment: "Barbell",
    instructions: "Lie on bench, grip bar wider than shoulders, lower to chest, press up explosively"
  },
  {
    name: "Dumbbell Bench Press",
    muscleGroup: "Chest",
    category: "Compound",
    equipment: "Dumbbell",
    instructions: "Lie on bench with dumbbells, press up and together, lower with control"
  },
  {
    name: "Push-ups",
    muscleGroup: "Chest",
    category: "Compound",
    equipment: "Bodyweight",
    instructions: "Start in plank position, lower chest to floor, push back up"
  },
  {
    name: "Incline Dumbbell Press",
    muscleGroup: "Chest",
    category: "Compound",
    equipment: "Dumbbell",
    instructions: "Set bench to 30-45 degrees, press dumbbells up and together"
  },
  {
    name: "Dumbbell Flyes",
    muscleGroup: "Chest",
    category: "Isolation",
    equipment: "Dumbbell",
    instructions: "Lie on bench, arc dumbbells out and down, squeeze chest to bring together"
  },
  {
    name: "Chest Dips",
    muscleGroup: "Chest",
    category: "Compound",
    equipment: "Bodyweight",
    instructions: "Lean forward on dip bars, lower body down, press back up"
  },
  {
    name: "Cable Chest Flyes",
    muscleGroup: "Chest",
    category: "Isolation",
    equipment: "Cable",
    instructions: "Set cables at chest height, bring handles together in arc motion"
  },
  {
    name: "Incline Barbell Press",
    muscleGroup: "Chest",
    category: "Compound",
    equipment: "Barbell",
    instructions: "Set bench to 30-45 degrees, press barbell from chest"
  },

  // BACK EXERCISES
  {
    name: "Deadlifts",
    muscleGroup: "Back",
    category: "Compound",
    equipment: "Barbell",
    instructions: "Stand over bar, grip with hands outside legs, lift by extending hips and knees"
  },
  {
    name: "Pull-ups",
    muscleGroup: "Back",
    category: "Compound",
    equipment: "Bodyweight",
    instructions: "Hang from bar with overhand grip, pull chest to bar, lower with control"
  },
  {
    name: "Bent Over Barbell Rows",
    muscleGroup: "Back",
    category: "Compound",
    equipment: "Barbell",
    instructions: "Hinge at hips, pull bar to lower chest, squeeze shoulder blades together"
  },
  {
    name: "Dumbbell Rows",
    muscleGroup: "Back",
    category: "Compound",
    equipment: "Dumbbell",
    instructions: "Support yourself on bench, pull dumbbell to hip, squeeze lat"
  },
  {
    name: "Lat Pulldowns",
    muscleGroup: "Back",
    category: "Compound",
    equipment: "Cable",
    instructions: "Pull bar to upper chest, lean back slightly, focus on lats"
  },
  {
    name: "Seated Cable Rows",
    muscleGroup: "Back",
    category: "Compound",
    equipment: "Cable",
    instructions: "Pull handle to torso, squeeze shoulder blades, keep chest up"
  },
  {
    name: "T-Bar Rows",
    muscleGroup: "Back",
    category: "Compound",
    equipment: "T-Bar",
    instructions: "Straddle bar, pull handles to chest, keep back straight"
  },
  {
    name: "Chin-ups",
    muscleGroup: "Back",
    category: "Compound",
    equipment: "Bodyweight",
    instructions: "Hang from bar with underhand grip, pull chest to bar"
  },

  // SHOULDER EXERCISES
  {
    name: "Overhead Press",
    muscleGroup: "Shoulders",
    category: "Compound",
    equipment: "Barbell",
    instructions: "Press bar from shoulders overhead, keep core tight"
  },
  {
    name: "Dumbbell Shoulder Press",
    muscleGroup: "Shoulders",
    category: "Compound",
    equipment: "Dumbbell",
    instructions: "Press dumbbells overhead, keep core engaged, control the descent"
  },
  {
    name: "Lateral Raises",
    muscleGroup: "Shoulders",
    category: "Isolation",
    equipment: "Dumbbell",
    instructions: "Raise dumbbells to sides until parallel to floor, control the descent"
  },
  {
    name: "Front Raises",
    muscleGroup: "Shoulders",
    category: "Isolation",
    equipment: "Dumbbell",
    instructions: "Raise dumbbell in front to shoulder height, keep slight bend in elbow"
  },
  {
    name: "Rear Delt Flyes",
    muscleGroup: "Shoulders",
    category: "Isolation",
    equipment: "Dumbbell",
    instructions: "Bend forward, raise dumbbells to sides, squeeze rear delts"
  },
  {
    name: "Arnold Press",
    muscleGroup: "Shoulders",
    category: "Compound",
    equipment: "Dumbbell",
    instructions: "Start with palms facing you, rotate and press overhead"
  },
  {
    name: "Pike Push-ups",
    muscleGroup: "Shoulders",
    category: "Compound",
    equipment: "Bodyweight",
    instructions: "Start in downward dog position, lower head toward ground, push back up"
  },
  {
    name: "Face Pulls",
    muscleGroup: "Shoulders",
    category: "Isolation",
    equipment: "Cable",
    instructions: "Pull cable to face, separate hands at face level, squeeze rear delts"
  },

  // LEG EXERCISES
  {
    name: "Squats",
    muscleGroup: "Legs",
    category: "Compound",
    equipment: "Barbell",
    instructions: "Descend until thighs parallel to floor, drive through heels to stand"
  },
  {
    name: "Leg Press",
    muscleGroup: "Legs",
    category: "Compound",
    equipment: "Machine",
    instructions: "Place feet on platform, lower until knees at 90 degrees, press back up"
  },
  {
    name: "Lunges",
    muscleGroup: "Legs",
    category: "Compound",
    equipment: "Dumbbell",
    instructions: "Step forward into lunge, lower back knee toward ground, return to start"
  },
  {
    name: "Romanian Deadlifts",
    muscleGroup: "Legs",
    category: "Compound",
    equipment: "Barbell",
    instructions: "Hinge at hips, lower bar along legs, feel stretch in hamstrings"
  },
  {
    name: "Leg Curls",
    muscleGroup: "Legs",
    category: "Isolation",
    equipment: "Machine",
    instructions: "Curl heels toward glutes, squeeze hamstrings, control the descent"
  },
  {
    name: "Leg Extensions",
    muscleGroup: "Legs",
    category: "Isolation",
    equipment: "Machine",
    instructions: "Extend legs until straight, squeeze quads, lower with control"
  },
  {
    name: "Bulgarian Split Squats",
    muscleGroup: "Legs",
    category: "Compound",
    equipment: "Bodyweight",
    instructions: "Rear foot elevated, lower into lunge position, drive through front heel"
  },
  {
    name: "Calf Raises",
    muscleGroup: "Legs",
    category: "Isolation",
    equipment: "Bodyweight",
    instructions: "Rise up on toes, squeeze calves, lower with control"
  },
  {
    name: "Walking Lunges",
    muscleGroup: "Legs",
    category: "Compound",
    equipment: "Dumbbell",
    instructions: "Step forward alternating legs, lower into lunge each step"
  },
  {
    name: "Goblet Squats",
    muscleGroup: "Legs",
    category: "Compound",
    equipment: "Dumbbell",
    instructions: "Hold dumbbell at chest, squat down keeping chest up"
  },

  // ARM EXERCISES - BICEPS
  {
    name: "Barbell Curls",
    muscleGroup: "Arms",
    category: "Isolation",
    equipment: "Barbell",
    instructions: "Curl bar toward chest, squeeze biceps, lower with control"
  },
  {
    name: "Dumbbell Curls",
    muscleGroup: "Arms",
    category: "Isolation",
    equipment: "Dumbbell",
    instructions: "Curl dumbbells alternating or together, focus on bicep contraction"
  },
  {
    name: "Hammer Curls",
    muscleGroup: "Arms",
    category: "Isolation",
    equipment: "Dumbbell",
    instructions: "Keep neutral grip, curl dumbbells, targets biceps and forearms"
  },
  {
    name: "Preacher Curls",
    muscleGroup: "Arms",
    category: "Isolation",
    equipment: "Barbell",
    instructions: "Use preacher bench, curl bar with strict form, focus on biceps"
  },
  {
    name: "Cable Curls",
    muscleGroup: "Arms",
    category: "Isolation",
    equipment: "Cable",
    instructions: "Use cable machine, curl with constant tension"
  },
  {
    name: "Chin-ups",
    muscleGroup: "Arms",
    category: "Compound",
    equipment: "Bodyweight",
    instructions: "Underhand grip pull-ups, focus on bicep engagement"
  },

  // ARM EXERCISES - TRICEPS
  {
    name: "Close Grip Bench Press",
    muscleGroup: "Arms",
    category: "Compound",
    equipment: "Barbell",
    instructions: "Narrow grip on bar, press focusing on triceps engagement"
  },
  {
    name: "Tricep Dips",
    muscleGroup: "Arms",
    category: "Compound",
    equipment: "Bodyweight",
    instructions: "Lower body by bending elbows, press back up, focus on triceps"
  },
  {
    name: "Overhead Tricep Extension",
    muscleGroup: "Arms",
    category: "Isolation",
    equipment: "Dumbbell",
    instructions: "Lower dumbbell behind head, extend arms to starting position"
  },
  {
    name: "Tricep Pushdowns",
    muscleGroup: "Arms",
    category: "Isolation",
    equipment: "Cable",
    instructions: "Push cable down, squeeze triceps, control the return"
  },
  {
    name: "Diamond Push-ups",
    muscleGroup: "Arms",
    category: "Compound",
    equipment: "Bodyweight",
    instructions: "Make diamond shape with hands, focus on triceps during push-up"
  },

  // CORE EXERCISES
  {
    name: "Planks",
    muscleGroup: "Core",
    category: "Isometric",
    equipment: "Bodyweight",
    instructions: "Hold plank position, keep straight line from head to heels"
  },
  {
    name: "Crunches",
    muscleGroup: "Core",
    category: "Isolation",
    equipment: "Bodyweight",
    instructions: "Lie on back, crunch up engaging abs, lower with control"
  },
  {
    name: "Russian Twists",
    muscleGroup: "Core",
    category: "Isolation",
    equipment: "Bodyweight",
    instructions: "Sit with feet elevated, rotate torso side to side"
  },
  {
    name: "Mountain Climbers",
    muscleGroup: "Core",
    category: "Compound",
    equipment: "Bodyweight",
    instructions: "Plank position, alternate bringing knees to chest quickly"
  },
  {
    name: "Dead Bug",
    muscleGroup: "Core",
    category: "Isolation",
    equipment: "Bodyweight",
    instructions: "Lie on back, extend opposite arm and leg, return to start"
  },
  {
    name: "Bicycle Crunches",
    muscleGroup: "Core",
    category: "Isolation",
    equipment: "Bodyweight",
    instructions: "Alternate elbow to opposite knee in cycling motion"
  },
  {
    name: "Leg Raises",
    muscleGroup: "Core",
    category: "Isolation",
    equipment: "Bodyweight",
    instructions: "Lie on back, raise straight legs up, lower with control"
  },

  // GLUTES EXERCISES
  {
    name: "Hip Thrusts",
    muscleGroup: "Glutes",
    category: "Compound",
    equipment: "Barbell",
    instructions: "Upper back on bench, thrust hips up squeezing glutes"
  },
  {
    name: "Glute Bridges",
    muscleGroup: "Glutes",
    category: "Isolation",
    equipment: "Bodyweight",
    instructions: "Lie on back, lift hips up squeezing glutes, lower with control"
  },
  {
    name: "Single Leg Glute Bridges",
    muscleGroup: "Glutes",
    category: "Isolation",
    equipment: "Bodyweight",
    instructions: "One leg glute bridge, focus on single glute activation"
  },
  {
    name: "Clamshells",
    muscleGroup: "Glutes",
    category: "Isolation",
    equipment: "Bodyweight",
    instructions: "Side lying, lift top knee while keeping feet together"
  }
];
// Insert exercises into database
  for (const exercise of exercises) {
    await prisma.exercise.create({
      data: exercise
    });
  }

  console.log(`Seeded ${exercises.length} exercises.`);
}

async function seedProgrammes() {
  const existingCount = await prisma.programme.count();
  if (existingCount > 0) {
    console.log('Programmes already seeded.');
    return;
  }

  const exercises = await prisma.exercise.findMany();
  const byName = (name: string) => exercises.find(e => e.name === name);
// Programme templates
const programmes = [
  // FULL BODY PROGRAMMES
  {
    name: "Full Body Beginner",
    daysPerWeek: 3,
    weeks: 8,
    bodyPartFocus: "Full Body",
    description: "Perfect starter programme focusing on compound movements and building strength foundation.",
    exercises: [
      // Day 1
      { exerciseName: "Squats", dayNumber: 1, orderIndex: 1, sets: 3, reps: "8-12" },
      { exerciseName: "Push-ups", dayNumber: 1, orderIndex: 2, sets: 3, reps: "8-15" },
      { exerciseName: "Dumbbell Rows", dayNumber: 1, orderIndex: 3, sets: 3, reps: "8-12" },
      { exerciseName: "Dumbbell Shoulder Press", dayNumber: 1, orderIndex: 4, sets: 3, reps: "8-12" },
      { exerciseName: "Planks", dayNumber: 1, orderIndex: 5, sets: 3, reps: "30-60s" },
      
      // Day 2
      { exerciseName: "Deadlifts", dayNumber: 2, orderIndex: 1, sets: 3, reps: "6-10" },
      { exerciseName: "Dumbbell Bench Press", dayNumber: 2, orderIndex: 2, sets: 3, reps: "8-12" },
      { exerciseName: "Lat Pulldowns", dayNumber: 2, orderIndex: 3, sets: 3, reps: "8-12" },
      { exerciseName: "Lunges", dayNumber: 2, orderIndex: 4, sets: 3, reps: "10-15" },
      { exerciseName: "Dumbbell Curls", dayNumber: 2, orderIndex: 5, sets: 2, reps: "10-15" },
      
      // Day 3
      { exerciseName: "Goblet Squats", dayNumber: 3, orderIndex: 1, sets: 3, reps: "12-15" },
      { exerciseName: "Pike Push-ups", dayNumber: 3, orderIndex: 2, sets: 3, reps: "8-12" },
      { exerciseName: "Pull-ups", dayNumber: 3, orderIndex: 3, sets: 3, reps: "5-10" },
      { exerciseName: "Romanian Deadlifts", dayNumber: 3, orderIndex: 4, sets: 3, reps: "8-12" },
      { exerciseName: "Tricep Dips", dayNumber: 3, orderIndex: 5, sets: 2, reps: "8-15" }
    ]
  },
  {
    name: "Full Body Intermediate",
    daysPerWeek: 4,
    weeks: 10,
    bodyPartFocus: "Full Body",
    description: "Intermediate programme with increased volume and exercise variety.",
    exercises: [
      // Day 1
      { exerciseName: "Barbell Bench Press", dayNumber: 1, orderIndex: 1, sets: 4, reps: "6-10" },
      { exerciseName: "Bent Over Barbell Rows", dayNumber: 1, orderIndex: 2, sets: 4, reps: "6-10" },
      { exerciseName: "Overhead Press", dayNumber: 1, orderIndex: 3, sets: 3, reps: "8-12" },
      { exerciseName: "Barbell Curls", dayNumber: 1, orderIndex: 4, sets: 3, reps: "10-15" },
      { exerciseName: "Close Grip Bench Press", dayNumber: 1, orderIndex: 5, sets: 3, reps: "8-12" },
      
      // Day 2
      { exerciseName: "Squats", dayNumber: 2, orderIndex: 1, sets: 4, reps: "6-10" },
      { exerciseName: "Romanian Deadlifts", dayNumber: 2, orderIndex: 2, sets: 4, reps: "8-12" },
      { exerciseName: "Walking Lunges", dayNumber: 2, orderIndex: 3, sets: 3, reps: "12-16" },
      { exerciseName: "Calf Raises", dayNumber: 2, orderIndex: 4, sets: 4, reps: "15-20" },
      { exerciseName: "Planks", dayNumber: 2, orderIndex: 5, sets: 3, reps: "45-90s" },
      
      // Day 3
      { exerciseName: "Pull-ups", dayNumber: 3, orderIndex: 1, sets: 4, reps: "6-12" },
      { exerciseName: "Incline Dumbbell Press", dayNumber: 3, orderIndex: 2, sets: 4, reps: "8-12" },
      { exerciseName: "Lateral Raises", dayNumber: 3, orderIndex: 3, sets: 3, reps: "12-15" },
      { exerciseName: "Hammer Curls", dayNumber: 3, orderIndex: 4, sets: 3, reps: "10-15" },
      { exerciseName: "Overhead Tricep Extension", dayNumber: 3, orderIndex: 5, sets: 3, reps: "10-15" },
      
      // Day 4
      { exerciseName: "Deadlifts", dayNumber: 4, orderIndex: 1, sets: 4, reps: "5-8" },
      { exerciseName: "Bulgarian Split Squats", dayNumber: 4, orderIndex: 2, sets: 3, reps: "10-15" },
      { exerciseName: "Hip Thrusts", dayNumber: 4, orderIndex: 3, sets: 3, reps: "12-15" },
      { exerciseName: "Russian Twists", dayNumber: 4, orderIndex: 4, sets: 3, reps: "20-30" },
      { exerciseName: "Mountain Climbers", dayNumber: 4, orderIndex: 5, sets: 3, reps: "20-30" }
    ]
  },
  {
    name: "Full Body Advanced",
    daysPerWeek: 5,
    weeks: 12,
    bodyPartFocus: "Full Body",
    description: "Advanced full body programme with high volume and intensity.",
    exercises: [
      // Day 1 - Push Focus
      { exerciseName: "Barbell Bench Press", dayNumber: 1, orderIndex: 1, sets: 5, reps: "5-8" },
      { exerciseName: "Overhead Press", dayNumber: 1, orderIndex: 2, sets: 4, reps: "6-10" },
      { exerciseName: "Incline Dumbbell Press", dayNumber: 1, orderIndex: 3, sets: 4, reps: "8-12" },
      { exerciseName: "Close Grip Bench Press", dayNumber: 1, orderIndex: 4, sets: 3, reps: "8-12" },
      { exerciseName: "Lateral Raises", dayNumber: 1, orderIndex: 5, sets: 4, reps: "12-15" },
      
      // Day 2 - Pull Focus
      { exerciseName: "Deadlifts", dayNumber: 2, orderIndex: 1, sets: 5, reps: "5-8" },
      { exerciseName: "Pull-ups", dayNumber: 2, orderIndex: 2, sets: 4, reps: "8-12" },
      { exerciseName: "Bent Over Barbell Rows", dayNumber: 2, orderIndex: 3, sets: 4, reps: "8-12" },
      { exerciseName: "Barbell Curls", dayNumber: 2, orderIndex: 4, sets: 3, reps: "10-15" },
      { exerciseName: "Face Pulls", dayNumber: 2, orderIndex: 5, sets: 3, reps: "15-20" },
      
      // Day 3 - Legs
      { exerciseName: "Squats", dayNumber: 3, orderIndex: 1, sets: 5, reps: "5-8" },
      { exerciseName: "Romanian Deadlifts", dayNumber: 3, orderIndex: 2, sets: 4, reps: "8-12" },
      { exerciseName: "Bulgarian Split Squats", dayNumber: 3, orderIndex: 3, sets: 3, reps: "10-15" },
      { exerciseName: "Hip Thrusts", dayNumber: 3, orderIndex: 4, sets: 3, reps: "12-15" },
      { exerciseName: "Calf Raises", dayNumber: 3, orderIndex: 5, sets: 4, reps: "15-20" },
      
      // Day 4 - Upper Body
      { exerciseName: "Dumbbell Bench Press", dayNumber: 4, orderIndex: 1, sets: 4, reps: "8-12" },
      { exerciseName: "Seated Cable Rows", dayNumber: 4, orderIndex: 2, sets: 4, reps: "8-12" },
      { exerciseName: "Arnold Press", dayNumber: 4, orderIndex: 3, sets: 3, reps: "10-15" },
      { exerciseName: "Hammer Curls", dayNumber: 4, orderIndex: 4, sets: 3, reps: "10-15" },
      { exerciseName: "Tricep Pushdowns", dayNumber: 4, orderIndex: 5, sets: 3, reps: "10-15" },
      
      // Day 5 - Full Body Conditioning
      { exerciseName: "Goblet Squats", dayNumber: 5, orderIndex: 1, sets: 3, reps: "15-20" },
      { exerciseName: "Push-ups", dayNumber: 5, orderIndex: 2, sets: 3, reps: "15-25" },
      { exerciseName: "Mountain Climbers", dayNumber: 5, orderIndex: 3, sets: 3, reps: "30-45" },
      { exerciseName: "Bicycle Crunches", dayNumber: 5, orderIndex: 4, sets: 3, reps: "20-30" },
      { exerciseName: "Planks", dayNumber: 5, orderIndex: 5, sets: 3, reps: "60-120s" }
    ]
  },

  // UPPER/LOWER SPLIT PROGRAMMES
  {
    name: "Upper/Lower Split",
    daysPerWeek: 4,
    weeks: 10,
    bodyPartFocus: "Upper/Lower Split",
    description: "Classic upper/lower split for balanced muscle development.",
    exercises: [
      // Day 1 - Upper
      { exerciseName: "Barbell Bench Press", dayNumber: 1, orderIndex: 1, sets: 4, reps: "6-10" },
      { exerciseName: "Bent Over Barbell Rows", dayNumber: 1, orderIndex: 2, sets: 4, reps: "6-10" },
      { exerciseName: "Overhead Press", dayNumber: 1, orderIndex: 3, sets: 3, reps: "8-12" },
      { exerciseName: "Pull-ups", dayNumber: 1, orderIndex: 4, sets: 3, reps: "8-12" },
      { exerciseName: "Barbell Curls", dayNumber: 1, orderIndex: 5, sets: 3, reps: "10-15" },
      { exerciseName: "Close Grip Bench Press", dayNumber: 1, orderIndex: 6, sets: 3, reps: "8-12" },
      
      // Day 2 - Lower
      { exerciseName: "Squats", dayNumber: 2, orderIndex: 1, sets: 4, reps: "6-10" },
      { exerciseName: "Romanian Deadlifts", dayNumber: 2, orderIndex: 2, sets: 4, reps: "8-12" },
      { exerciseName: "Bulgarian Split Squats", dayNumber: 2, orderIndex: 3, sets: 3, reps: "10-15" },
      { exerciseName: "Leg Curls", dayNumber: 2, orderIndex: 4, sets: 3, reps: "12-15" },
      { exerciseName: "Calf Raises", dayNumber: 2, orderIndex: 5, sets: 4, reps: "15-20" },
      { exerciseName: "Planks", dayNumber: 2, orderIndex: 6, sets: 3, reps: "45-90s" },
      
      // Day 3 - Upper
      { exerciseName: "Incline Dumbbell Press", dayNumber: 3, orderIndex: 1, sets: 4, reps: "8-12" },
      { exerciseName: "Seated Cable Rows", dayNumber: 3, orderIndex: 2, sets: 4, reps: "8-12" },
      { exerciseName: "Lateral Raises", dayNumber: 3, orderIndex: 3, sets: 3, reps: "12-15" },
      { exerciseName: "Lat Pulldowns", dayNumber: 3, orderIndex: 4, sets: 3, reps: "10-15" },
      { exerciseName: "Hammer Curls", dayNumber: 3, orderIndex: 5, sets: 3, reps: "10-15" },
      { exerciseName: "Overhead Tricep Extension", dayNumber: 3, orderIndex: 6, sets: 3, reps: "10-15" },
      
      // Day 4 - Lower
      { exerciseName: "Deadlifts", dayNumber: 4, orderIndex: 1, sets: 4, reps: "5-8" },
      { exerciseName: "Lunges", dayNumber: 4, orderIndex: 2, sets: 3, reps: "12-16" },
      { exerciseName: "Leg Extensions", dayNumber: 4, orderIndex: 3, sets: 3, reps: "12-15" },
      { exerciseName: "Hip Thrusts", dayNumber: 4, orderIndex: 4, sets: 3, reps: "12-15" },
      { exerciseName: "Russian Twists", dayNumber: 4, orderIndex: 5, sets: 3, reps: "20-30" },
      { exerciseName: "Dead Bug", dayNumber: 4, orderIndex: 6, sets: 3, reps: "10-15" }
    ]
  }
]

  // Insert programmes and their exercises
  for (const programme of programmes) {
    const createdProgramme = await prisma.programme.create({
      data: {
        name: programme.name,
        daysPerWeek: programme.daysPerWeek,
        weeks: programme.weeks,
        bodyPartFocus: programme.bodyPartFocus,
        description: programme.description
      }
    });

    // Create programme exercises
    for (const exerciseData of programme.exercises) {
      const exercise = byName(exerciseData.exerciseName);
      if (exercise) {
        await prisma.programmeExercise.create({
          data: {
            programmeId: createdProgramme.id,
            exerciseId: exercise.id,
            dayNumber: exerciseData.dayNumber,
            orderIndex: exerciseData.orderIndex,
            sets: exerciseData.sets,
            reps: exerciseData.reps
          }
        });
      }
    }
  }

  console.log(`Seeded ${programmes.length} programmes.`);
}


  async function main() {
  await seedExercises();
  await seedProgrammes();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

