// seed-complete.ts - Complete seed script for exercises and programmes

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedExercises() {
  const existingCount = await prisma.exercise.count();
  if (existingCount > 0) {
    await prisma.exercise.deleteMany(); // clears the table
    console.log("Cleared existing exercises.");
  }

  const exercises = [
    // ABDOMINAL EXERCISES
    {
      name: "Landmine Twist",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Other",
      instructions:
        "Hold landmine bar, rotate torso side to side keeping core tight",
    },
    {
      name: "Elbow Plank",
      muscleGroup: "Abdominals",
      category: "Isometric",
      equipment: "Body Only",
      instructions:
        "Rest on forearms, keep body straight, hold position without sagging hips",
    },
    {
      name: "Bottoms Up",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions:
        "Lie flat, lift legs and hips upward, lower slowly under control",
    },
    {
      name: "Suspended Ab Fall-Out",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Other",
      instructions:
        "Using suspension straps, extend arms forward, resist core collapse, return to start",
    },
    {
      name: "Dumbbell V-Sit Cross Jab",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Dumbbell",
      instructions:
        "Sit in V-position, hold dumbbells, jab across body alternating sides",
    },
    {
      name: "Standing Cable Low-to-High Twist",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Cable",
      instructions:
        "Pull cable diagonally upward across body, rotate torso fully",
    },
    {
      name: "Dumbbell Spell Caster",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Dumbbell",
      instructions:
        "Hold dumbbells, swing side to side in controlled arc engaging obliques",
    },
    {
      name: "Decline Reverse Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Other",
      instructions:
        "On decline bench, lift hips and knees toward chest, lower slowly",
    },
    {
      name: "Spider Crawl",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Body Only",
      instructions:
        "Crawl forward on hands and feet, bring knees toward elbows",
    },
    {
      name: "Cocoons",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions:
        "Lie flat, extend arms overhead, crunch bringing knees and elbows together",
    },
    {
      name: "Cross-Body Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions: "Crunch diagonally bringing elbow toward opposite knee",
    },
    {
      name: "Single-Arm High-Cable Side Bend",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Cable",
      instructions:
        "Hold cable overhead, bend sideways, return upright under control",
    },
    {
      name: "Elbow-to-Knee Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions: "Crunch forward bringing elbows to knees simultaneously",
    },
    {
      name: "Decline Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions:
        "Perform crunch on decline bench, lift shoulders toward knees",
    },
    {
      name: "Hanging Toes-to-Bar",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Hang from bar, lift legs to touch toes to bar",
    },
    {
      name: "Kneeling Cable Oblique Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Kneel, pull cable down diagonally engaging obliques",
    },
    {
      name: "Hanging Oblique Knee Raise",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Hang from bar, raise knees to side engaging obliques",
    },
    {
      name: "Dumbbell Suitcase Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Medicine Ball",
      instructions:
        "Hold dumbbell at side, crunch upward bringing knees toward chest",
    },
    {
      name: "Plate Twist",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Other",
      instructions: "Hold plate, twist torso side to side keeping core tight",
    },
    {
      name: "Gorilla Chin/Crunch",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Perform chin-up, then crunch knees toward chest at top",
    },
    {
      name: "Kneeling Cable Crunch With Alternating Oblique Twists",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Cable",
      instructions: "Kneel, crunch forward, twist alternately to each side",
    },
    {
      name: "Weighted Crunches",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Other",
      instructions:
        "Hold weight on chest, crunch upward lifting shoulders off floor",
    },
    {
      name: "Barbell Roll-Out",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Barbell",
      instructions:
        "Roll barbell forward from knees, extend fully, pull back with core",
    },
    {
      name: "Kneeling Cable Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Kneel, pull cable down by contracting abs",
    },
    {
      name: "Exercise Ball Pull-In",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Exercise Ball",
      instructions: "Feet on ball, pull knees toward chest rolling ball inward",
    },
    {
      name: "Hanging Leg Raise",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions:
        "Hang from bar, raise legs straight up to hip height or higher",
    },
    {
      name: "Barbell Ab Rollout - On Knees",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Barbell",
      instructions:
        "Roll barbell forward from knees, extend, return with abs engaged",
    },
    {
      name: "Ab Roller",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Other",
      instructions:
        "Roll wheel forward from knees, extend, return with controlled core tension",
    },
    {
      name: "Otis-Up",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Other",
      instructions: "Hold weight overhead, sit up fully keeping arms extended",
    },
    {
      name: "Mountain Climber",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Body Only",
      instructions: "In plank, drive knees alternately toward chest quickly",
    },
    {
      name: "Ab Bicycle",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Body Only",
      instructions:
        "Lie flat, pedal legs while touching opposite elbow to knee",
    },
    {
      name: "3/4 Sit-Up",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions: "Perform sit-up stopping three-quarters of the way up",
    },
    {
      name: "Reverse Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions: "Lift hips off floor bringing knees toward chest",
    },
    {
      name: "Crunches",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions:
        "Lie flat, lift shoulders toward knees keeping lower back on floor",
    },
    {
      name: "Dumbbell Side Bend",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions:
        "Hold dumbbell at side, bend sideways lowering weight, return upright",
    },
    {
      name: "Captain's Chair Knee Raise",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Other",
      instructions: "Support body on chair arms, raise knees toward chest",
    },
    {
      name: "Dead Bug Reach",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions: "Lie flat, extend opposite arm and leg, keep core stable",
    },
    {
      name: "Rope Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Kneel, hold rope, crunch forward pulling rope down",
    },
    {
      name: "Sledgehammer Swing",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Other",
      instructions: "Swing sledgehammer down onto tire, rotate torso fully",
    },
    {
      name: "Standing Cable Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Stand, pull cable downward contracting abs",
    },
    {
      name: "Crunch - Hands Overhead",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "Body Only",
      instructions: "Perform crunch with arms extended overhead",
    },
    {
      name: "V-Up",
      muscleGroup: "Abdominals",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Lie flat, lift legs and torso together forming V-shape",
    },
    {
      name: "Decline Oblique Crunch",
      muscleGroup: "Abdominals",
      category: "Isolation",
      equipment: "None",
      instructions: "On decline bench, crunch diagonally engaging obliques",
    },
    {
      name: "Incline Hammer Curls",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions:
        "Sit on incline bench, curl dumbbells with neutral grip, lower slowly",
    },
    {
      name: "Wide-Grip Barbell Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Barbell",
      instructions:
        "Grip bar wide, curl upward keeping elbows tucked, lower under control",
    },
    {
      name: "EZ-Bar Spider Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Barbell",
      instructions:
        "Lie chest-down on incline bench, curl EZ-bar upward, squeeze biceps",
    },
    {
      name: "Smith Machine Calf Raise",
      muscleGroup: "Calves",
      category: "Isolation",
      equipment: "Machine",
      instructions: "Stand under Smith bar, raise heels upward, lower slowly",
    },
    {
      name: "Hip Circles (Prone)",
      muscleGroup: "Abductors",
      category: "Isolation",
      equipment: "Body Only",
      instructions:
        "Lie prone, lift leg and draw circles outward engaging hip abductors",
    },
    {
      name: "Hammer Curls",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Hold dumbbells neutral grip, curl upward, lower slowly",
    },
    {
      name: "EZ-Bar Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "E-Z Curl Bar",
      instructions:
        "Grip EZ-bar, curl upward keeping elbows close, lower under control",
    },
    {
      name: "Zottman Curl",
      muscleGroup: "Biceps",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Curl dumbbells palms up, rotate at top, lower palms down",
    },
    {
      name: "Biceps Curl to Shoulder Press",
      muscleGroup: "Biceps",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Curl dumbbells, then press overhead, lower back to start",
    },
    {
      name: "Barbell Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Barbell",
      instructions: "Grip bar shoulder-width, curl upward, lower slowly",
    },
    {
      name: "Concentration Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions:
        "Sit, brace elbow on thigh, curl dumbbell upward, squeeze biceps",
    },
    {
      name: "Flexor Incline Dumbbell Curls",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions:
        "Sit on incline bench, curl dumbbells palms up, lower slowly",
    },
    {
      name: "Thigh Adductor",
      muscleGroup: "Adductors",
      category: "Isolation",
      equipment: "Machine",
      instructions: "Sit on machine, press thighs inward, return slowly",
    },
    {
      name: "Machine Bicep Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Machine",
      instructions: "Sit on machine, curl handles upward, lower slowly",
    },
    {
      name: "Standing Calf Raises",
      muscleGroup: "Calves",
      category: "Isolation",
      equipment: "Machine",
      instructions:
        "Stand on platform, raise heels upward, lower under control",
    },
    {
      name: "Overhead Cable Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Hold cable overhead, curl toward head, squeeze biceps",
    },
    {
      name: "Dumbbell Bicep Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Hold dumbbells palms up, curl upward, lower slowly",
    },
    {
      name: "Close-Grip EZ-Bar Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Barbell",
      instructions: "Grip EZ-bar close, curl upward, lower under control",
    },
    {
      name: "Cross-Body Hammer Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Curl dumbbell across body toward opposite shoulder",
    },
    {
      name: "Preacher Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Barbell",
      instructions: "Sit on preacher bench, curl bar upward, lower slowly",
    },
    {
      name: "Barbell Curls Lying Against Incline",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Barbell",
      instructions: "Lie back on incline, curl bar upward, lower under control",
    },
    {
      name: "Standing Hip Circles",
      muscleGroup: "Abductors",
      category: "Isolation",
      equipment: "Body Only",
      instructions: "Stand, lift leg, draw circles outward engaging hips",
    },
    {
      name: "Clam",
      muscleGroup: "Abductors",
      category: "Isolation",
      equipment: "Body Only",
      instructions:
        "Lie on side, bend knees, lift top knee upward keeping feet together",
    },
    {
      name: "Seated Close-Grip Concentration Barbell Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Barbell",
      instructions: "Sit, grip bar close, curl upward, lower slowly",
    },
    {
      name: "Reverse Barbell Preacher Curls",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "E-Z Curl Bar",
      instructions: "On preacher bench, curl bar palms down, lower slowly",
    },
    {
      name: "Groiners",
      muscleGroup: "Adductors",
      category: "Compound",
      equipment: "Body Only",
      instructions: "From plank, step foot outside hand, alternate sides",
    },
    {
      name: "Standing One-Arm Cable Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Stand, curl cable handle upward with one arm",
    },
    {
      name: "Seated Calf Raise",
      muscleGroup: "Calves",
      category: "Isolation",
      equipment: "Machine",
      instructions:
        "Sit, place weight on thighs, raise heels upward, lower slowly",
    },
    {
      name: "Calf Press On Leg Press Machine",
      muscleGroup: "Calves",
      category: "Isolation",
      equipment: "Machine",
      instructions: "On leg press, push through toes raising heels",
    },
    {
      name: "Dumbbell Alternate Bicep Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Alternate curling dumbbells upward, lower slowly",
    },
    {
      name: "Single-Arm Dumbbell Preacher Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "On preacher bench, curl dumbbell upward with one arm",
    },
    {
      name: "Alternate Incline Dumbbell Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Sit on incline, alternate curling dumbbells upward",
    },
    {
      name: "Standing Concentration Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Stand, brace elbow on thigh, curl dumbbell upward",
    },
    {
      name: "Rocking Standing Calf Raise",
      muscleGroup: "Calves",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Hold barbell, rock forward/back while raising heels",
    },
    {
      name: "Reverse Cable Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Grip cable palms down, curl upward, lower slowly",
    },
    {
      name: "Alternating Incline Dumbbell Biceps Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Sit on incline, alternate curling dumbbells upward",
    },
    {
      name: "Alternate Hammer Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Alternate hammer curls with dumbbells",
    },
    {
      name: "Seated Dumbbell Biceps Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Sit, curl dumbbells upward palms up, lower slowly",
    },
    {
      name: "Band Hip Adductions",
      muscleGroup: "Adductors",
      category: "Isolation",
      equipment: "Bands",
      instructions: "Attach band, pull leg inward against resistance",
    },
    {
      name: "Preacher Hammer Dumbbell Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "On preacher bench, curl dumbbells neutral grip upward",
    },
    {
      name: "Standing One-Arm Dumbbell Curl Over Incline Bench",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Stand over incline, curl dumbbell upward with one arm",
    },
    {
      name: "Close-Grip Barbell Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Barbell",
      instructions: "Grip bar close, curl upward, lower slowly",
    },
    {
      name: "Standing Biceps Cable Curl",
      muscleGroup: "Biceps",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Stand, curl cable handles upward, lower slowly",
    },
    {
      name: "Rickshaw Carry",
      muscleGroup: "Forearms",
      category: "Compound",
      equipment: "Other",
      instructions:
        "Lift handles, walk forward keeping grip strong and posture upright",
    },
    {
      name: "Palms-Down Wrist Curl Over Bench",
      muscleGroup: "Forearms",
      category: "Isolation",
      equipment: "Barbell",
      instructions:
        "Rest forearms on bench palms down, curl bar upward with wrists",
    },
    {
      name: "Straight-Bar Wrist Roll-Up",
      muscleGroup: "Forearms",
      category: "Isolation",
      equipment: "Other",
      instructions: "Hold bar with rope, roll wrists upward winding rope",
    },
    {
      name: "Barbell Glute Bridge",
      muscleGroup: "Glutes",
      category: "Compound",
      equipment: "Barbell",
      instructions:
        "Lie on floor, barbell on hips, lift hips upward, squeeze glutes",
    },
    {
      name: "Dumbbell Farmer's Walk",
      muscleGroup: "Forearms",
      category: "Compound",
      equipment: "Other",
      instructions: "Hold dumbbells at sides, walk forward keeping grip tight",
    },
    {
      name: "Palms-Up Wrist Curl Over Bench",
      muscleGroup: "Forearms",
      category: "Isolation",
      equipment: "Barbell",
      instructions:
        "Rest forearms on bench palms up, curl bar upward with wrists",
    },
    {
      name: "Barbell Deadlift",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip bar on floor, lift with straight back, stand tall",
    },
    {
      name: "Romanian Deadlift With Dumbbells",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Dumbbell",
      instructions:
        "Hold dumbbells, hinge at hips lowering to mid-shin, return upright",
    },
    {
      name: "Clean Deadlift",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip bar wider, lift explosively keeping chest up",
    },
    {
      name: "Sumo Deadlift",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Stand wide stance, grip bar inside knees, lift upright",
    },
    {
      name: "Standing Behind-the-Back Wrist Curl",
      muscleGroup: "Forearms",
      category: "Isolation",
      equipment: "Barbell",
      instructions: "Hold bar behind back, curl upward with wrists",
    },
    {
      name: "Seated Finger Curl",
      muscleGroup: "Forearms",
      category: "Isolation",
      equipment: "Barbell",
      instructions:
        "Sit, hold barbell, extend fingers, curl bar back into grip",
    },
    {
      name: "Dumbbell Bench Press",
      muscleGroup: "Chest",
      category: "Compound",
      equipment: "Dumbbell",
      instructions:
        "Lie on bench, press dumbbells upward, lower slowly to chest",
    },
    {
      name: "Romanian Deadlift from Deficit",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Barbell",
      instructions:
        "Stand on platform, hinge hips lowering bar deeper, return upright",
    },
    {
      name: "Power Snatch",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip bar wide, lift explosively overhead in one motion",
    },
    {
      name: "Pushups",
      muscleGroup: "Chest",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Lower chest to floor, push back up keeping body straight",
    },
    {
      name: "Power Clean from Blocks",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Start bar on blocks, lift explosively to shoulders",
    },
    {
      name: "Seated Two-Arm Palms-Up Low-Pulley Wrist Curl",
      muscleGroup: "Forearms",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Sit, palms up, curl cable handles upward with wrists",
    },
    {
      name: "Close-Grip Bench Press",
      muscleGroup: "Chest",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip bar narrow, lower to chest, press upward",
    },
    {
      name: "Dumbbell Flyes",
      muscleGroup: "Chest",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions:
        "Lie on bench, open arms wide, bring dumbbells together overhead",
    },
    {
      name: "Incline Dumbbell Bench Press",
      muscleGroup: "Chest",
      category: "Compound",
      equipment: "Dumbbell",
      instructions:
        "Lie on incline bench, press dumbbells upward, lower slowly",
    },
    {
      name: "Low-Cable Cross-Over",
      muscleGroup: "Chest",
      category: "Isolation",
      equipment: "Cable",
      instructions:
        "Pull cables upward from low position crossing hands at chest",
    },
    {
      name: "Natural Glute Ham Raise",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Body Only",
      instructions:
        "Anchor feet, lower torso forward, pull back up with hamstrings",
    },
    {
      name: "Glute Ham Raise",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Machine",
      instructions:
        "On machine, lower torso forward, pull back up with hamstrings",
    },
    {
      name: "Wrist Roller",
      muscleGroup: "Forearms",
      category: "Isolation",
      equipment: "Other",
      instructions: "Roll rope with wrists lifting weight upward",
    },
    {
      name: "Barbell Hip Thrust",
      muscleGroup: "Glutes",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Sit on floor, barbell on hips, thrust hips upward",
    },
    {
      name: "Barbell Bench Press - Medium Grip",
      muscleGroup: "Chest",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip bar medium width, lower to chest, press upward",
    },
    {
      name: "Chest Dip",
      muscleGroup: "Chest",
      category: "Compound",
      equipment: "Other",
      instructions: "Lower body on dip bars, press upward with chest",
    },
    {
      name: "Decline Dumbbell Flyes",
      muscleGroup: "Chest",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions:
        "Lie on decline bench, open arms wide, bring dumbbells together",
    },
    {
      name: "Seated One-Arm Dumbbell Palms-Up Wrist Curl",
      muscleGroup: "Forearms",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Sit, rest forearm, curl dumbbell upward with wrist",
    },
    {
      name: "Seated Palms-Down Barbell Wrist Curl",
      muscleGroup: "Forearms",
      category: "Isolation",
      equipment: "Barbell",
      instructions: "Sit, forearms on thighs palms down, curl bar upward",
    },
    {
      name: "Bodyweight Flyes",
      muscleGroup: "Chest",
      category: "Isolation",
      equipment: "Body Only",
      instructions:
        "Perform push-up variation spreading arms wide, squeeze chest",
    },
    {
      name: "Incline Cable Chest Fly",
      muscleGroup: "Chest",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Pull cables together upward on incline angle",
    },
    {
      name: "Single-Leg Cable Hip Extension",
      muscleGroup: "Glutes",
      category: "Isolation",
      equipment: "Cable",
      instructions:
        "Attach cable to ankle, extend leg backward squeezing glutes",
    },
    {
      name: "Decline Barbell Bench Press",
      muscleGroup: "Chest",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Lie on decline bench, press bar upward, lower slowly",
    },
    {
      name: "Dumbbell Lying Supination",
      muscleGroup: "Forearms",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Lie flat, rotate wrist outward holding dumbbell",
    },
    {
      name: "Wide-Grip Bench Press",
      muscleGroup: "Chest",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip bar wide, lower to chest, press upward",
    },
    {
      name: "Wide-Grip Decline Barbell Bench Press",
      muscleGroup: "Chest",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Lie on decline bench, grip wide, press bar upward",
    },
    {
      name: "Snatch Deadlift",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip bar wide, lift explosively keeping chest up",
    },
    {
      name: "Lying Leg Curls",
      muscleGroup: "Hamstrings",
      category: "Isolation",
      equipment: "Machine",
      instructions: "Lie face down, curl legs upward toward glutes",
    },
    {
      name: "Reverse-Grip Incline Dumbbell Bench Press",
      muscleGroup: "Chest",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Lie on incline, grip dumbbells reverse, press upward",
    },
    {
      name: "Stiff-Legged Dumbbell Deadlift",
      muscleGroup: "Hamstrings",
      category: "Compound",
      equipment: "Dumbbell",
      instructions:
        "Hold dumbbells, hinge hips lowering to mid-shin, return upright",
    },
    {
      name: "Cable Crossover",
      muscleGroup: "Chest",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Pull cables together in front of chest, squeeze pecs",
    },
    {
      name: "Weighted Pull-Up",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Other",
      instructions:
        "Hang from bar with added weight, pull chin above bar, lower slowly",
    },
    {
      name: "T-Bar Row with Handle",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Other",
      instructions: "Grip T-bar handle, row toward chest keeping back flat",
    },
    {
      name: "Atlas Stones",
      muscleGroup: "Lower Back",
      category: "Compound",
      equipment: "Other",
      instructions:
        "Lift stone from ground, cradle to chest, extend hips to stand tall",
    },
    {
      name: "Barbell Deficit Deadlift",
      muscleGroup: "Lower Back",
      category: "Compound",
      equipment: "Barbell",
      instructions:
        "Stand on platform, grip bar, lift with straight back, extend hips fully",
    },
    {
      name: "Lying Face Down Plate Neck Resistance",
      muscleGroup: "Neck",
      category: "Isolation",
      equipment: "Other",
      instructions: "Lie face down, plate on back of head, extend neck upward",
    },
    {
      name: "Pull-Ups",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Hang from bar, pull chin above bar, lower slowly",
    },
    {
      name: "Reverse-Grip Bent-Over Row",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip bar underhand, hinge hips, row bar to waist",
    },
    {
      name: "Back Extension",
      muscleGroup: "Lower Back",
      category: "Isolation",
      equipment: "Body Only",
      instructions: "Lie face down, extend torso upward, lower slowly",
    },
    {
      name: "Axle Deadlift",
      muscleGroup: "Lower Back",
      category: "Compound",
      equipment: "Other",
      instructions: "Grip thick axle bar, lift with straight back, stand tall",
    },
    {
      name: "One-Arm Dumbbell Row",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Brace on bench, row dumbbell to waist, lower slowly",
    },
    {
      name: "Rocky Pull-Ups/Pulldowns",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Other",
      instructions:
        "Perform explosive pull-ups or pulldowns alternating grip styles",
    },
    {
      name: "One-Arm Long Bar Row",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip long bar with one hand, row toward waist",
    },
    {
      name: "Close-Grip Pull-Down",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Cable",
      instructions: "Grip bar close, pull down to chest, return slowly",
    },
    {
      name: "Pull-Up",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Hang from bar, pull chin above bar, lower slowly",
    },
    {
      name: "T-Bar Row",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Other",
      instructions: "Grip T-bar, row toward chest keeping elbows close",
    },
    {
      name: "Bent Over Two-Arm Long Bar Row",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip long bar, hinge hips, row bar to chest",
    },
    {
      name: "Muscle Up",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Body Only",
      instructions:
        "Pull up explosively, transition over bar, press to lockout",
    },
    {
      name: "Alternating Sit-Through with Crunch",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Other",
      instructions: "From plank, rotate torso sit-through, add crunch movement",
    },
    {
      name: "Rower",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Machine",
      instructions: "Row handle toward chest, extend legs, return smoothly",
    },
    {
      name: "Shotgun Row",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Cable",
      instructions: "Grip single handle, row diagonally toward chest",
    },
    {
      name: "Seated Cable Rows",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Cable",
      instructions: "Sit, pull cable handles to waist, squeeze shoulder blades",
    },
    {
      name: "Close-Grip Front Lat Pulldown",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Cable",
      instructions: "Grip bar close, pull down to chest, return slowly",
    },
    {
      name: "Incline Dumbbell Row",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Lie chest-down on incline bench, row dumbbells upward",
    },
    {
      name: "Bent Over Two-Dumbbell Row With Palms In",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Hold dumbbells neutral grip, hinge hips, row to waist",
    },
    {
      name: "Upside-Down Pull-Up",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Other",
      instructions: "Hang inverted, pull torso upward toward bar",
    },
    {
      name: "Hyperextensions With No Hyperextension Bench",
      muscleGroup: "Lower Back",
      category: "Isolation",
      equipment: "Body Only",
      instructions: "Lie prone, lift torso upward, lower slowly",
    },
    {
      name: "V-Bar Pull-Up",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Other",
      instructions: "Grip V-bar attachment, pull chin above bar, lower slowly",
    },
    {
      name: "Bent Over Barbell Row",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip bar, hinge hips, row bar to waist",
    },
    {
      name: "Rope Climb",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Climb rope using arms and legs, control descent",
    },
    {
      name: "Wide-Grip Rear Pull-Up",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Grip bar wide, pull chin above bar behind head",
    },
    {
      name: "Deadlift with Bands",
      muscleGroup: "Lower Back",
      category: "Compound",
      equipment: "Barbell",
      instructions:
        "Attach bands to bar, lift with resistance increasing at top",
    },
    {
      name: "Straight-Arm Rope Pull-Down",
      muscleGroup: "Lats",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Grip rope, pull straight down keeping arms extended",
    },
    {
      name: "Lat Pull-Down",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Cable",
      instructions: "Grip bar wide, pull down to chest, return slowly",
    },
    {
      name: "Deadlift with Chains",
      muscleGroup: "Lower Back",
      category: "Compound",
      equipment: "Barbell",
      instructions:
        "Attach chains to bar, lift with resistance increasing at top",
    },
    {
      name: "Reverse-Grip Lat Pull-Down",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Machine",
      instructions: "Grip bar underhand, pull down to chest, return slowly",
    },
    {
      name: "Single-Arm Cable Seated Row",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Cable",
      instructions: "Sit, row cable handle to waist with one arm",
    },
    {
      name: "Rack Pull with Bands",
      muscleGroup: "Lower Back",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Set bar on rack, attach bands, pull upward to lockout",
    },
    {
      name: "Kettlebell Alternating Renegade Row",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Kettlebells",
      instructions:
        "In plank, row kettlebell alternately while stabilizing core",
    },
    {
      name: "Gironda Sternum Chins",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Other",
      instructions: "Pull up leaning back, touch sternum to bar",
    },
    {
      name: "Man-Maker",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Perform push-up, row dumbbells, jump to press overhead",
    },
    {
      name: "Side To Side Chins",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Pull up, shift chin side to side over bar",
    },
    {
      name: "Machine Seated Row",
      muscleGroup: "Lats",
      category: "Compound",
      equipment: "Machine",
      instructions: "Sit, row machine handles to waist, squeeze back",
    },
    {
      name: "Lying Face Up Plate Neck Resistance",
      muscleGroup: "Neck",
      category: "Isolation",
      equipment: "Other",
      instructions: "Lie face up, plate on forehead, flex neck upward",
    },
    {
      name: "Dumbbell Bent-Over Row",
      muscleGroup: "Middle Back",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Hold dumbbells, hinge hips, row to waist",
    },
    {
      name: "Single-Leg Press",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Machine",
      instructions:
        "Sit on machine, press platform upward with one leg, lower slowly",
    },
    {
      name: "Dumbbell Front Raise to Lateral Raise",
      muscleGroup: "Shoulders",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions:
        "Raise dumbbells forward to shoulder height, then out to sides, lower slowly",
    },
    {
      name: "Clean from Blocks",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Start bar on blocks, lift explosively to shoulders",
    },
    {
      name: "Clean and Press",
      muscleGroup: "Shoulders",
      category: "Compound",
      equipment: "Barbell",
      instructions:
        "Clean bar to shoulders, press overhead, lower under control",
    },
    {
      name: "Triceps Dip",
      muscleGroup: "Triceps",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Lower body on dip bars, press upward extending elbows",
    },
    {
      name: "Barbell Full Squat",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Barbell",
      instructions:
        "Stand with barbell, squat deeply, drive upward to standing",
    },
    {
      name: "Single-Arm Palm-In Dumbbell Shoulder Press",
      muscleGroup: "Shoulders",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Press dumbbell overhead with neutral grip, lower slowly",
    },
    {
      name: "Tire Flip",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Other",
      instructions: "Squat low, grip tire, lift explosively flipping forward",
    },
    {
      name: "Barbell Back Squat to Box",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Squat back onto box, pause, drive upward to standing",
    },
    {
      name: "Clean and Jerk",
      muscleGroup: "Shoulders",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Clean bar to shoulders, jerk overhead explosively",
    },
    {
      name: "Single-Arm Kettlebell Push-Press",
      muscleGroup: "Shoulders",
      category: "Compound",
      equipment: "Kettlebells",
      instructions: "Dip knees, drive kettlebell overhead with one arm",
    },
    {
      name: "Push-Press",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Dip knees, drive barbell overhead explosively",
    },
    {
      name: "Military Press",
      muscleGroup: "Shoulders",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Press barbell overhead from shoulders, lower slowly",
    },
    {
      name: "Power Snatch",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Grip bar wide, lift explosively overhead in one motion",
    },
    {
      name: "Hang Clean",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Start bar at thighs, clean explosively to shoulders",
    },
    {
      name: "Reverse Band Box Squat",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Squat to box with band assistance, drive upward",
    },
    {
      name: "Standing Palms-In Shoulder Press",
      muscleGroup: "Shoulders",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Press dumbbells overhead with neutral grip, lower slowly",
    },
    {
      name: "Decline EZ-Bar Skullcrusher",
      muscleGroup: "Triceps",
      category: "Isolation",
      equipment: "E-Z Curl Bar",
      instructions:
        "Lie on decline bench, lower bar to forehead, extend elbows upward",
    },
    {
      name: "Dumbbell Floor Press",
      muscleGroup: "Triceps",
      category: "Compound",
      equipment: "Dumbbell",
      instructions:
        "Lie on floor, press dumbbells upward, lower elbows to floor",
    },
    {
      name: "Jumping Rope",
      muscleGroup: "Quadriceps",
      category: "Cardio",
      equipment: "Body Only",
      instructions: "Jump continuously over rope keeping rhythm steady",
    },
    {
      name: "Seated Barbell Shoulder Press",
      muscleGroup: "Shoulders",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Sit upright, press barbell overhead, lower slowly",
    },
    {
      name: "Smith Machine Shrug",
      muscleGroup: "Traps",
      category: "Isolation",
      equipment: "Machine",
      instructions: "Grip Smith bar, shrug shoulders upward, lower slowly",
    },
    {
      name: "Barbell Walking Lunge",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Step forward lunging with barbell on back, alternate legs",
    },
    {
      name: "Front Squats With Two Kettlebells",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Kettlebells",
      instructions: "Hold kettlebells at shoulders, squat deeply, drive upward",
    },
    {
      name: "Single Leg Push-Off",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Other",
      instructions: "Push off platform explosively with one leg",
    },
    {
      name: "Seated Dumbbell Press",
      muscleGroup: "Shoulders",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Sit upright, press dumbbells overhead, lower slowly",
    },
    {
      name: "Standing Dumbbell Shoulder Press",
      muscleGroup: "Shoulders",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Stand, press dumbbells overhead, lower slowly",
    },
    {
      name: "Olympic Squat",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Barbell",
      instructions:
        "Stand with barbell high on back, squat deeply, drive upward",
    },
    {
      name: "Single-Arm Lateral Raise",
      muscleGroup: "Shoulders",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Raise dumbbell out to side with one arm, lower slowly",
    },
    {
      name: "Power Partials",
      muscleGroup: "Shoulders",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions:
        "Raise dumbbells partially to shoulder height, lower under control",
    },
    {
      name: "Leverage Shrug",
      muscleGroup: "Traps",
      category: "Isolation",
      equipment: "Machine",
      instructions:
        "Grip machine handles, shrug shoulders upward, lower slowly",
    },
    {
      name: "Cable V-Bar Push-Down",
      muscleGroup: "Triceps",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Grip V-bar, push down extending elbows fully",
    },
    {
      name: "Incline Dumbbell Reverse Fly",
      muscleGroup: "Shoulders",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Lie chest-down on incline bench, raise dumbbells outward",
    },
    {
      name: "Stair Climber",
      muscleGroup: "Quadriceps",
      category: "Cardio",
      equipment: "Machine",
      instructions: "Step continuously on stair machine maintaining rhythm",
    },
    {
      name: "Kettlebell Pistol Squat",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Kettlebells",
      instructions: "Hold kettlebell, squat on one leg deeply, drive upward",
    },
    {
      name: "Overhead Dumbbell Front Raise",
      muscleGroup: "Shoulders",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Raise dumbbells forward overhead, lower slowly",
    },
    {
      name: "Weighted Bench Dip",
      muscleGroup: "Triceps",
      category: "Compound",
      equipment: "Body Only",
      instructions:
        "Place weight on lap, dip down, press upward extending elbows",
    },
    {
      name: "Forward Lunge",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Body Only",
      instructions: "Step forward lunging, lower knee, drive upward",
    },
    {
      name: "EZ-Bar Skullcrusher",
      muscleGroup: "Triceps",
      category: "Isolation",
      equipment: "E-Z Curl Bar",
      instructions: "Lie flat, lower bar to forehead, extend elbows upward",
    },
    {
      name: "Alternating Standing Shoulder Press",
      muscleGroup: "Shoulders",
      category: "Compound",
      equipment: "Dumbbell",
      instructions: "Alternate pressing dumbbells overhead one at a time",
    },
    {
      name: "Single-Arm Incline Rear Delt Raise",
      muscleGroup: "Shoulders",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions:
        "Lie chest-down on incline, raise dumbbell outward with one arm",
    },
    {
      name: "Alternating Dumbbell Front Raise",
      muscleGroup: "Shoulders",
      category: "Isolation",
      equipment: "Dumbbell",
      instructions: "Alternate raising dumbbells forward to shoulder height",
    },
    {
      name: "Narrow-Stance Squat",
      muscleGroup: "Quadriceps",
      category: "Compound",
      equipment: "Barbell",
      instructions: "Stand narrow stance, squat deeply, drive upward",
    },
    {
      name: "Reverse Grip Triceps Pushdown",
      muscleGroup: "Triceps",
      category: "Isolation",
      equipment: "Cable",
      instructions: "Grip bar underhand, push down extending elbows fully",
    },
  ];
  // Insert exercises into database
  for (const exercise of exercises) {
    await prisma.exercise.create({
      data: exercise,
    });
  }

  console.log(`Seeded ${exercises.length} exercises.`);
}

async function seedProgrammes() {
  const existingCount = await prisma.programme.count();
  if (existingCount > 0) {
    console.log("Programmes already seeded.");
    return;
  }

  const exercises = await prisma.exercise.findMany();
  // Two normalizations:
  // - compactNorm: removes all non-alphanumerics (used for strict contains/equals comparisons)
  // - tokenNorm: keeps spaces (replaces punctuation with spaces) and collapses whitespace (used for token overlap)
  const compactNorm = (s?: string) =>
    (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const tokenNorm = (s?: string) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ") // replace punctuation with spaces
      .replace(/\s+/g, " ")
      .trim();

  // Robust lookup: exact normalized match, then simple fuzzy strategies
  const fuzzyMatches: Record<string, string> = {};
  const missingNames = new Set<string>();

  const byName = (name: string) => {
    const targetCompact = compactNorm(name);
    const targetTokens = tokenNorm(name).split(" ").filter(Boolean);

    // 1) exact compact normalized
    let found = exercises.find((e) => compactNorm(e.name) === targetCompact);
    if (found) return found;

    // 2) contains (either direction) on compact normalization
    found = exercises.find(
      (e) =>
        compactNorm(e.name).includes(targetCompact) ||
        targetCompact.includes(compactNorm(e.name))
    );
    if (found) {
      fuzzyMatches[name] = found.name;
      return found;
    }

    // 3) token overlap: pick exercise with most shared tokens (on token-normalized strings)
    let best: { ex: any; score: number } | null = null;
    for (const ex of exercises) {
      const exTokens = tokenNorm(ex.name).split(" ").filter(Boolean);
      const common = targetTokens.filter((t) => exTokens.includes(t)).length;
      if (common > 0 && (!best || common > best.score)) {
        best = { ex, score: common };
      }
    }
    if (best) {
      // For multi-token targets, require at least 2 shared tokens to reduce noisy single-token matches.
      const required = targetTokens.length >= 2 ? 2 : 1;
      if (best.score >= required) {
        fuzzyMatches[name] = best.ex.name;
        return best.ex;
      }
    }

    // no match
    return undefined;
  };
  // Programme templates
  const programmes = [
    // FULL BODY PROGRAMMES
    {
      name: "Full Body Beginner",
      daysPerWeek: 3,
      weeks: 8,
      bodyPartFocus: "Full Body",
      description:
        "Perfect starter programme focusing on compound movements and building strength foundation.",
      exercises: [
        // Day 1
        {
          exerciseName: "Squats",
          dayNumber: 1,
          orderIndex: 1,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Push-ups",
          dayNumber: 1,
          orderIndex: 2,
          sets: 3,
          reps: "8-15",
        },
        {
          exerciseName: "Dumbbell Rows",
          dayNumber: 1,
          orderIndex: 3,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Dumbbell Shoulder Press",
          dayNumber: 1,
          orderIndex: 4,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Planks",
          dayNumber: 1,
          orderIndex: 5,
          sets: 3,
          reps: "30-60s",
        },

        // Day 2
        {
          exerciseName: "Deadlifts",
          dayNumber: 2,
          orderIndex: 1,
          sets: 3,
          reps: "6-10",
        },
        {
          exerciseName: "Dumbbell Bench Press",
          dayNumber: 2,
          orderIndex: 2,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Lat Pulldowns",
          dayNumber: 2,
          orderIndex: 3,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Lunges",
          dayNumber: 2,
          orderIndex: 4,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Dumbbell Curls",
          dayNumber: 2,
          orderIndex: 5,
          sets: 2,
          reps: "10-15",
        },

        // Day 3
        {
          exerciseName: "Goblet Squats",
          dayNumber: 3,
          orderIndex: 1,
          sets: 3,
          reps: "12-15",
        },
        {
          exerciseName: "Pike Push-ups",
          dayNumber: 3,
          orderIndex: 2,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Pull-ups",
          dayNumber: 3,
          orderIndex: 3,
          sets: 3,
          reps: "5-10",
        },
        {
          exerciseName: "Romanian Deadlifts",
          dayNumber: 3,
          orderIndex: 4,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Tricep Dips",
          dayNumber: 3,
          orderIndex: 5,
          sets: 2,
          reps: "8-15",
        },
      ],
    },
    {
      name: "Full Body Intermediate",
      daysPerWeek: 4,
      weeks: 10,
      bodyPartFocus: "Full Body",
      description:
        "Intermediate programme with increased volume and exercise variety.",
      exercises: [
        // Day 1
        {
          exerciseName: "Barbell Bench Press",
          dayNumber: 1,
          orderIndex: 1,
          sets: 4,
          reps: "6-10",
        },
        {
          exerciseName: "Bent Over Barbell Rows",
          dayNumber: 1,
          orderIndex: 2,
          sets: 4,
          reps: "6-10",
        },
        {
          exerciseName: "Overhead Press",
          dayNumber: 1,
          orderIndex: 3,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Barbell Curls",
          dayNumber: 1,
          orderIndex: 4,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Close Grip Bench Press",
          dayNumber: 1,
          orderIndex: 5,
          sets: 3,
          reps: "8-12",
        },

        // Day 2
        {
          exerciseName: "Squats",
          dayNumber: 2,
          orderIndex: 1,
          sets: 4,
          reps: "6-10",
        },
        {
          exerciseName: "Romanian Deadlifts",
          dayNumber: 2,
          orderIndex: 2,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Walking Lunges",
          dayNumber: 2,
          orderIndex: 3,
          sets: 3,
          reps: "12-16",
        },
        {
          exerciseName: "Calf Raises",
          dayNumber: 2,
          orderIndex: 4,
          sets: 4,
          reps: "15-20",
        },
        {
          exerciseName: "Planks",
          dayNumber: 2,
          orderIndex: 5,
          sets: 3,
          reps: "45-90s",
        },

        // Day 3
        {
          exerciseName: "Pull-ups",
          dayNumber: 3,
          orderIndex: 1,
          sets: 4,
          reps: "6-12",
        },
        {
          exerciseName: "Incline Dumbbell Press",
          dayNumber: 3,
          orderIndex: 2,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Lateral Raises",
          dayNumber: 3,
          orderIndex: 3,
          sets: 3,
          reps: "12-15",
        },
        {
          exerciseName: "Hammer Curls",
          dayNumber: 3,
          orderIndex: 4,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Overhead Tricep Extension",
          dayNumber: 3,
          orderIndex: 5,
          sets: 3,
          reps: "10-15",
        },

        // Day 4
        {
          exerciseName: "Deadlifts",
          dayNumber: 4,
          orderIndex: 1,
          sets: 4,
          reps: "5-8",
        },
        {
          exerciseName: "Bulgarian Split Squats",
          dayNumber: 4,
          orderIndex: 2,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Hip Thrusts",
          dayNumber: 4,
          orderIndex: 3,
          sets: 3,
          reps: "12-15",
        },
        {
          exerciseName: "Russian Twists",
          dayNumber: 4,
          orderIndex: 4,
          sets: 3,
          reps: "20-30",
        },
        {
          exerciseName: "Mountain Climbers",
          dayNumber: 4,
          orderIndex: 5,
          sets: 3,
          reps: "20-30",
        },
      ],
    },
    {
      name: "Full Body Advanced",
      daysPerWeek: 5,
      weeks: 12,
      bodyPartFocus: "Full Body",
      description:
        "Advanced full body programme with high volume and intensity.",
      exercises: [
        // Day 1 - Push Focus
        {
          exerciseName: "Barbell Bench Press",
          dayNumber: 1,
          orderIndex: 1,
          sets: 5,
          reps: "5-8",
        },
        {
          exerciseName: "Overhead Press",
          dayNumber: 1,
          orderIndex: 2,
          sets: 4,
          reps: "6-10",
        },
        {
          exerciseName: "Incline Dumbbell Press",
          dayNumber: 1,
          orderIndex: 3,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Close Grip Bench Press",
          dayNumber: 1,
          orderIndex: 4,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Lateral Raises",
          dayNumber: 1,
          orderIndex: 5,
          sets: 4,
          reps: "12-15",
        },

        // Day 2 - Pull Focus
        {
          exerciseName: "Deadlifts",
          dayNumber: 2,
          orderIndex: 1,
          sets: 5,
          reps: "5-8",
        },
        {
          exerciseName: "Pull-ups",
          dayNumber: 2,
          orderIndex: 2,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Bent Over Barbell Rows",
          dayNumber: 2,
          orderIndex: 3,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Barbell Curls",
          dayNumber: 2,
          orderIndex: 4,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Face Pulls",
          dayNumber: 2,
          orderIndex: 5,
          sets: 3,
          reps: "15-20",
        },

        // Day 3 - Legs
        {
          exerciseName: "Squats",
          dayNumber: 3,
          orderIndex: 1,
          sets: 5,
          reps: "5-8",
        },
        {
          exerciseName: "Romanian Deadlifts",
          dayNumber: 3,
          orderIndex: 2,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Bulgarian Split Squats",
          dayNumber: 3,
          orderIndex: 3,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Hip Thrusts",
          dayNumber: 3,
          orderIndex: 4,
          sets: 3,
          reps: "12-15",
        },
        {
          exerciseName: "Calf Raises",
          dayNumber: 3,
          orderIndex: 5,
          sets: 4,
          reps: "15-20",
        },

        // Day 4 - Upper Body
        {
          exerciseName: "Dumbbell Bench Press",
          dayNumber: 4,
          orderIndex: 1,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Seated Cable Rows",
          dayNumber: 4,
          orderIndex: 2,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Arnold Press",
          dayNumber: 4,
          orderIndex: 3,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Hammer Curls",
          dayNumber: 4,
          orderIndex: 4,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Tricep Pushdowns",
          dayNumber: 4,
          orderIndex: 5,
          sets: 3,
          reps: "10-15",
        },

        // Day 5 - Full Body Conditioning
        {
          exerciseName: "Goblet Squats",
          dayNumber: 5,
          orderIndex: 1,
          sets: 3,
          reps: "15-20",
        },
        {
          exerciseName: "Push-ups",
          dayNumber: 5,
          orderIndex: 2,
          sets: 3,
          reps: "15-25",
        },
        {
          exerciseName: "Mountain Climbers",
          dayNumber: 5,
          orderIndex: 3,
          sets: 3,
          reps: "30-45",
        },
        {
          exerciseName: "Bicycle Crunches",
          dayNumber: 5,
          orderIndex: 4,
          sets: 3,
          reps: "20-30",
        },
        {
          exerciseName: "Planks",
          dayNumber: 5,
          orderIndex: 5,
          sets: 3,
          reps: "60-120s",
        },
      ],
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
        {
          exerciseName: "Barbell Bench Press",
          dayNumber: 1,
          orderIndex: 1,
          sets: 4,
          reps: "6-10",
        },
        {
          exerciseName: "Bent Over Barbell Rows",
          dayNumber: 1,
          orderIndex: 2,
          sets: 4,
          reps: "6-10",
        },
        {
          exerciseName: "Overhead Press",
          dayNumber: 1,
          orderIndex: 3,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Pull-ups",
          dayNumber: 1,
          orderIndex: 4,
          sets: 3,
          reps: "8-12",
        },
        {
          exerciseName: "Barbell Curls",
          dayNumber: 1,
          orderIndex: 5,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Close Grip Bench Press",
          dayNumber: 1,
          orderIndex: 6,
          sets: 3,
          reps: "8-12",
        },

        // Day 2 - Lower
        {
          exerciseName: "Squats",
          dayNumber: 2,
          orderIndex: 1,
          sets: 4,
          reps: "6-10",
        },
        {
          exerciseName: "Romanian Deadlifts",
          dayNumber: 2,
          orderIndex: 2,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Bulgarian Split Squats",
          dayNumber: 2,
          orderIndex: 3,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Leg Curls",
          dayNumber: 2,
          orderIndex: 4,
          sets: 3,
          reps: "12-15",
        },
        {
          exerciseName: "Calf Raises",
          dayNumber: 2,
          orderIndex: 5,
          sets: 4,
          reps: "15-20",
        },
        {
          exerciseName: "Planks",
          dayNumber: 2,
          orderIndex: 6,
          sets: 3,
          reps: "45-90s",
        },

        // Day 3 - Upper
        {
          exerciseName: "Incline Dumbbell Press",
          dayNumber: 3,
          orderIndex: 1,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Seated Cable Rows",
          dayNumber: 3,
          orderIndex: 2,
          sets: 4,
          reps: "8-12",
        },
        {
          exerciseName: "Lateral Raises",
          dayNumber: 3,
          orderIndex: 3,
          sets: 3,
          reps: "12-15",
        },
        {
          exerciseName: "Lat Pulldowns",
          dayNumber: 3,
          orderIndex: 4,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Hammer Curls",
          dayNumber: 3,
          orderIndex: 5,
          sets: 3,
          reps: "10-15",
        },
        {
          exerciseName: "Overhead Tricep Extension",
          dayNumber: 3,
          orderIndex: 6,
          sets: 3,
          reps: "10-15",
        },

        // Day 4 - Lower
        {
          exerciseName: "Deadlifts",
          dayNumber: 4,
          orderIndex: 1,
          sets: 4,
          reps: "5-8",
        },
        {
          exerciseName: "Lunges",
          dayNumber: 4,
          orderIndex: 2,
          sets: 3,
          reps: "12-16",
        },
        {
          exerciseName: "Leg Extensions",
          dayNumber: 4,
          orderIndex: 3,
          sets: 3,
          reps: "12-15",
        },
        {
          exerciseName: "Hip Thrusts",
          dayNumber: 4,
          orderIndex: 4,
          sets: 3,
          reps: "12-15",
        },
        {
          exerciseName: "Russian Twists",
          dayNumber: 4,
          orderIndex: 5,
          sets: 3,
          reps: "20-30",
        },
        {
          exerciseName: "Dead Bug",
          dayNumber: 4,
          orderIndex: 6,
          sets: 3,
          reps: "10-15",
        },
      ],
    },
  ];

  // Insert programmes and their exercises
  for (const programme of programmes) {
    const createdProgramme = await prisma.programme.create({
      data: {
        name: programme.name,
        daysPerWeek: programme.daysPerWeek,
        weeks: programme.weeks,
        bodyPartFocus: programme.bodyPartFocus,
        description: programme.description,
      },
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
            reps: exerciseData.reps,
          },
        });
      } else {
        // Track missing names for diagnostic output after seeding
        missingNames.add(exerciseData.exerciseName);
      }
    }
  }
  // Auto-generate additional programmes using existing seeded exercises
  // This ensures the programme exercises are linked to exercises that actually exist
  const autoGenerate = 12; // up to 12 new programmes (adjustable, <= 20 requested)
  const bodyFocusOptions = [
    "Full Body",
    "Upper Body",
    "Lower Body",
    "Push",
    "Pull",
    "Legs",
    "Glutes",
    "Chest",
    "Back",
    "Strength",
  ];

  const shuffle = <T>(arr: T[]) => arr.sort(() => 0.5 - Math.random());

  // Name auto-generated programmes using the focus name + a per-focus counter
  const focusCounts: Record<string, number> = {};
  for (let i = 0; i < autoGenerate; i++) {
    const daysPerWeek = [3, 4, 5][i % 3];
    const weeks = [6, 8, 10, 12][i % 4];
    const focus = bodyFocusOptions[i % bodyFocusOptions.length];
    focusCounts[focus] = (focusCounts[focus] || 0) + 1;
    const programmeName = `${focus} ${focusCounts[focus]}`;

    const createdProgramme = await prisma.programme.create({
      data: {
        name: programmeName,
        daysPerWeek,
        weeks,
        bodyPartFocus: focus,
        description: `${focus} programme (${daysPerWeek} days/week)`,
      },
    });

    // For each day, pick a set of exercises that match likely muscle groups for the focus
    for (let day = 1; day <= daysPerWeek; day++) {
      // pick up to 5 exercises for the day
      const candidates = shuffle(exercises).slice(0, 20); // sample 20 then filter
      const selected = candidates.slice(0, Math.min(5, candidates.length));

      let orderIndex = 1;
      for (const ex of selected) {
        await prisma.programmeExercise.create({
          data: {
            programmeId: createdProgramme.id,
            exerciseId: ex.id,
            dayNumber: day,
            orderIndex: orderIndex++,
            sets: [3, 3, 4, 4, 5][orderIndex % 5],
            reps: "8-12",
          },
        });
      }
    }
  }

  console.log(
    `Seeded ${programmes.length} programmes and ${autoGenerate} auto-generated programmes.`
  );
  if (missingNames.size > 0) {
    console.warn(
      `Warning: ${missingNames.size} programme exercise names were not found in seeded exercises. Sample missing names:`
    );
    console.warn(Array.from(missingNames).slice(0, 20));
  }

  // If any fuzzy matches were used, show a sample mapping to help review
  const fuzzyKeys = Object.keys(fuzzyMatches);
  if (fuzzyKeys.length > 0) {
    console.info(
      `Fuzzy matched ${fuzzyKeys.length} programme names to seeded exercises. Sample mappings:`
    );
    console.info(
      fuzzyKeys
        .slice(0, 20)
        .map((k) => ({ requested: k, matched: fuzzyMatches[k] }))
    );
  }
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
