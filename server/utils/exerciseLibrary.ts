// server/utils/exerciseLibrary.ts
// Static exercise library — source of truth for all exercise metadata.
// Library IDs (e.g. 'chest_barbell_bench') are used as database primary keys so
// complementaryExerciseIds / replacementExerciseIds resolve without a lookup table.

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Calves"
  | "Abs"
  | "Forearms";

export type MovementPattern =
  | "horizontal_press"
  | "vertical_press"
  | "horizontal_pull"
  | "vertical_pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "isolation_push"
  | "isolation_pull"
  | "core"
  | "carry";

export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Cable"
  | "Machine"
  | "Bodyweight"
  | "Resistance Band"
  | "Kettlebell";

export interface ExerciseTemplate {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  movementPattern: MovementPattern;
  equipment: Equipment[];
  difficulty: "beginner" | "intermediate" | "advanced";
  defaultSets: number;
  defaultRepRange: { min: number; max: number };
  complementsExercises: string[];
  alternativeFor: string[];
  instructions?: string;
  videoUrl?: string;
}

export const EXERCISE_LIBRARY: ExerciseTemplate[] = [
  // ── CHEST ────────────────────────────────────────────────────────────────
  {
    id: "chest_barbell_bench",
    name: "Barbell Bench Press",
    muscleGroup: "Chest",
    movementPattern: "horizontal_press",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: [],
    alternativeFor: [],
    instructions:
      "Lie flat on bench, grip bar slightly wider than shoulders, lower to chest, press up.",
  },
  {
    id: "chest_incline_db",
    name: "Incline Dumbbell Press",
    muscleGroup: "Chest",
    movementPattern: "horizontal_press",
    equipment: ["Dumbbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["chest_barbell_bench", "chest_flat_db"],
    alternativeFor: ["chest_incline_barbell"],
    instructions: "Set bench to 30-45°, press dumbbells up, focus on upper chest.",
  },
  {
    id: "chest_flat_db",
    name: "Flat Dumbbell Press",
    muscleGroup: "Chest",
    movementPattern: "horizontal_press",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["chest_incline_db", "chest_cable_fly"],
    alternativeFor: ["chest_barbell_bench"],
    instructions: "Lie flat, press dumbbells up, allow natural arc of motion.",
  },
  {
    id: "chest_incline_barbell",
    name: "Incline Barbell Press",
    muscleGroup: "Chest",
    movementPattern: "horizontal_press",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["chest_barbell_bench"],
    alternativeFor: ["chest_incline_db"],
    instructions: "Set bench to 30-45°, grip bar, press focusing on upper chest.",
  },
  {
    id: "chest_dips",
    name: "Chest Dips",
    muscleGroup: "Chest",
    movementPattern: "vertical_press",
    equipment: ["Bodyweight"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["chest_barbell_bench", "chest_incline_db"],
    alternativeFor: [],
    instructions:
      "Lean forward, lower until shoulders level with elbows, press up.",
  },
  {
    id: "chest_cable_fly",
    name: "Cable Flyes",
    muscleGroup: "Chest",
    movementPattern: "isolation_push",
    equipment: ["Cable"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: [
      "chest_barbell_bench",
      "chest_flat_db",
      "chest_incline_db",
    ],
    alternativeFor: ["chest_db_fly"],
    instructions: "Set cables high, bring hands together in front, squeeze chest.",
  },
  {
    id: "chest_db_fly",
    name: "Dumbbell Flyes",
    muscleGroup: "Chest",
    movementPattern: "isolation_push",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: ["chest_barbell_bench", "chest_flat_db"],
    alternativeFor: ["chest_cable_fly"],
    instructions:
      "Lie flat, arms wide, bring dumbbells together above chest.",
  },
  {
    id: "chest_machine_press",
    name: "Machine Chest Press",
    muscleGroup: "Chest",
    movementPattern: "horizontal_press",
    equipment: ["Machine"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["chest_cable_fly"],
    alternativeFor: ["chest_barbell_bench", "chest_flat_db"],
    instructions: "Adjust seat height, grip handles, press forward.",
  },
  {
    id: "chest_pushups",
    name: "Push-ups",
    muscleGroup: "Chest",
    movementPattern: "horizontal_press",
    equipment: ["Bodyweight"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: [],
    alternativeFor: ["chest_barbell_bench"],
    instructions: "Hands shoulder-width, lower chest to ground, push up.",
  },

  // ── BACK ─────────────────────────────────────────────────────────────────
  {
    id: "back_barbell_row",
    name: "Barbell Row",
    muscleGroup: "Back",
    movementPattern: "horizontal_pull",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: [],
    alternativeFor: [],
    instructions:
      "Hinge at hips, pull bar to lower chest, squeeze shoulder blades.",
  },
  {
    id: "back_lat_pulldown",
    name: "Lat Pulldown",
    muscleGroup: "Back",
    movementPattern: "vertical_pull",
    equipment: ["Cable"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: [],
    alternativeFor: ["back_pullups"],
    instructions: "Grip bar wide, pull down to upper chest, control up.",
  },
  {
    id: "back_pullups",
    name: "Pull-ups",
    muscleGroup: "Back",
    movementPattern: "vertical_pull",
    equipment: ["Bodyweight"],
    difficulty: "advanced",
    defaultSets: 3,
    defaultRepRange: { min: 6, max: 10 },
    complementsExercises: ["back_barbell_row"],
    alternativeFor: ["back_lat_pulldown"],
    instructions: "Hang from bar, pull chin over bar, lower with control.",
  },
  {
    id: "back_cable_row",
    name: "Seated Cable Row",
    muscleGroup: "Back",
    movementPattern: "horizontal_pull",
    equipment: ["Cable"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["back_lat_pulldown", "back_pullups"],
    alternativeFor: ["back_barbell_row"],
    instructions: "Sit upright, pull handle to torso, squeeze back.",
  },
  {
    id: "back_db_row",
    name: "Single-Arm Dumbbell Row",
    muscleGroup: "Back",
    movementPattern: "horizontal_pull",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["back_lat_pulldown", "back_barbell_row"],
    alternativeFor: ["back_cable_row"],
    instructions:
      "Support on bench, pull dumbbell to hip, alternate arms.",
  },
  {
    id: "back_tbar_row",
    name: "T-Bar Row",
    muscleGroup: "Back",
    movementPattern: "horizontal_pull",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["back_lat_pulldown"],
    alternativeFor: ["back_barbell_row"],
    instructions: "Straddle bar, hinge forward, pull to chest.",
  },
  {
    id: "back_face_pull",
    name: "Face Pulls",
    muscleGroup: "Back",
    movementPattern: "horizontal_pull",
    equipment: ["Cable"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: [
      "back_barbell_row",
      "back_cable_row",
      "back_lat_pulldown",
    ],
    alternativeFor: [],
    instructions:
      "Set cable high, pull to face, externally rotate shoulders.",
  },
  {
    id: "back_deadlift",
    name: "Conventional Deadlift",
    muscleGroup: "Back",
    movementPattern: "hinge",
    equipment: ["Barbell"],
    difficulty: "advanced",
    defaultSets: 3,
    defaultRepRange: { min: 5, max: 8 },
    complementsExercises: [],
    alternativeFor: [],
    instructions:
      "Feet hip-width, grip bar, lift by extending hips and knees.",
  },
  {
    id: "back_chin_ups",
    name: "Chin-ups",
    muscleGroup: "Back",
    movementPattern: "vertical_pull",
    equipment: ["Bodyweight"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 6, max: 10 },
    complementsExercises: ["back_barbell_row"],
    alternativeFor: ["back_lat_pulldown"],
    instructions:
      "Underhand grip, pull chin over bar, engage biceps and lats.",
  },

  // ── QUADS ────────────────────────────────────────────────────────────────
  {
    id: "quads_barbell_squat",
    name: "Barbell Back Squat",
    muscleGroup: "Quads",
    movementPattern: "squat",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: [],
    alternativeFor: [],
    instructions:
      "Bar on upper back, squat to parallel, drive through heels.",
  },
  {
    id: "quads_front_squat",
    name: "Front Squat",
    muscleGroup: "Quads",
    movementPattern: "squat",
    equipment: ["Barbell"],
    difficulty: "advanced",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["quads_barbell_squat"],
    alternativeFor: ["quads_barbell_squat"],
    instructions:
      "Bar on front delts, elbows high, squat keeping torso upright.",
  },
  {
    id: "quads_leg_press",
    name: "Leg Press",
    muscleGroup: "Quads",
    movementPattern: "squat",
    equipment: ["Machine"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: ["quads_barbell_squat", "quads_front_squat"],
    alternativeFor: ["quads_barbell_squat"],
    instructions:
      "Feet shoulder-width on platform, lower knees to 90°, press up.",
  },
  {
    id: "quads_bulgarian_split_squat",
    name: "Bulgarian Split Squat",
    muscleGroup: "Quads",
    movementPattern: "lunge",
    equipment: ["Dumbbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: [
      "quads_barbell_squat",
      "quads_front_squat",
      "quads_leg_press",
    ],
    alternativeFor: ["quads_walking_lunge"],
    instructions:
      "Rear foot elevated, lower front knee to 90°, drive up.",
  },
  {
    id: "quads_walking_lunge",
    name: "Walking Lunges",
    muscleGroup: "Quads",
    movementPattern: "lunge",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 12 },
    complementsExercises: ["quads_barbell_squat", "quads_leg_press"],
    alternativeFor: ["quads_bulgarian_split_squat"],
    instructions:
      "Step forward, lower back knee, alternate legs walking forward.",
  },
  {
    id: "quads_leg_extension",
    name: "Leg Extensions",
    muscleGroup: "Quads",
    movementPattern: "isolation_push",
    equipment: ["Machine"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: [
      "quads_barbell_squat",
      "quads_leg_press",
      "quads_bulgarian_split_squat",
    ],
    alternativeFor: [],
    instructions: "Sit in machine, extend legs fully, control down.",
  },
  {
    id: "quads_goblet_squat",
    name: "Goblet Squat",
    muscleGroup: "Quads",
    movementPattern: "squat",
    equipment: ["Dumbbell", "Kettlebell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: ["quads_bulgarian_split_squat"],
    alternativeFor: ["quads_barbell_squat"],
    instructions:
      "Hold dumbbell at chest, squat deep, elbows inside knees.",
  },
  {
    id: "quads_hack_squat",
    name: "Hack Squat",
    muscleGroup: "Quads",
    movementPattern: "squat",
    equipment: ["Machine"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["quads_barbell_squat", "quads_leg_press"],
    alternativeFor: ["quads_leg_press"],
    instructions:
      "Shoulders under pads, squat down, press through heels.",
  },

  // ── HAMSTRINGS ───────────────────────────────────────────────────────────
  {
    id: "hamstrings_rdl",
    name: "Romanian Deadlift",
    muscleGroup: "Hamstrings",
    movementPattern: "hinge",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["back_deadlift"],
    alternativeFor: [],
    instructions:
      "Slight knee bend, hinge at hips, lower bar to shins, feel hamstring stretch.",
  },
  {
    id: "hamstrings_leg_curl",
    name: "Lying Leg Curl",
    muscleGroup: "Hamstrings",
    movementPattern: "isolation_pull",
    equipment: ["Machine"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: ["hamstrings_rdl", "back_deadlift"],
    alternativeFor: ["hamstrings_seated_curl"],
    instructions: "Lie face down, curl heels to glutes, control down.",
  },
  {
    id: "hamstrings_seated_curl",
    name: "Seated Leg Curl",
    muscleGroup: "Hamstrings",
    movementPattern: "isolation_pull",
    equipment: ["Machine"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: ["hamstrings_rdl"],
    alternativeFor: ["hamstrings_leg_curl"],
    instructions:
      "Sit in machine, curl pad under calves, control extension.",
  },
  {
    id: "hamstrings_good_morning",
    name: "Good Mornings",
    muscleGroup: "Hamstrings",
    movementPattern: "hinge",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["hamstrings_rdl"],
    alternativeFor: ["hamstrings_rdl"],
    instructions:
      "Bar on upper back, hinge forward keeping back straight, feel hamstrings.",
  },
  {
    id: "hamstrings_nordic_curl",
    name: "Nordic Hamstring Curl",
    muscleGroup: "Hamstrings",
    movementPattern: "isolation_pull",
    equipment: ["Bodyweight"],
    difficulty: "advanced",
    defaultSets: 3,
    defaultRepRange: { min: 5, max: 8 },
    complementsExercises: ["hamstrings_rdl", "hamstrings_leg_curl"],
    alternativeFor: [],
    instructions:
      "Kneel, partner holds ankles, lower torso slowly, catch with hands.",
  },
  {
    id: "hamstrings_db_rdl",
    name: "Dumbbell RDL",
    muscleGroup: "Hamstrings",
    movementPattern: "hinge",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["hamstrings_leg_curl"],
    alternativeFor: ["hamstrings_rdl"],
    instructions:
      "Hold dumbbells, hinge at hips, lower along legs, squeeze glutes up.",
  },

  // ── SHOULDERS ────────────────────────────────────────────────────────────
  {
    id: "shoulders_ohp",
    name: "Barbell Overhead Press",
    muscleGroup: "Shoulders",
    movementPattern: "vertical_press",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: [],
    alternativeFor: [],
    instructions: "Bar at shoulders, press overhead, lock out arms.",
  },
  {
    id: "shoulders_db_press",
    name: "Dumbbell Shoulder Press",
    muscleGroup: "Shoulders",
    movementPattern: "vertical_press",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["shoulders_lateral_raise"],
    alternativeFor: ["shoulders_ohp"],
    instructions:
      "Dumbbells at shoulders, press up, bring together at top.",
  },
  {
    id: "shoulders_lateral_raise",
    name: "Lateral Raises",
    muscleGroup: "Shoulders",
    movementPattern: "isolation_push",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: ["shoulders_ohp", "shoulders_db_press"],
    alternativeFor: ["shoulders_cable_lateral"],
    instructions:
      "Arms at sides, raise dumbbells to shoulder height, control down.",
  },
  {
    id: "shoulders_cable_lateral",
    name: "Cable Lateral Raises",
    muscleGroup: "Shoulders",
    movementPattern: "isolation_push",
    equipment: ["Cable"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: ["shoulders_ohp", "shoulders_db_press"],
    alternativeFor: ["shoulders_lateral_raise"],
    instructions:
      "Cable at side, raise arm to shoulder height, constant tension.",
  },
  {
    id: "shoulders_front_raise",
    name: "Front Raises",
    muscleGroup: "Shoulders",
    movementPattern: "isolation_push",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: ["shoulders_ohp", "shoulders_lateral_raise"],
    alternativeFor: [],
    instructions:
      "Arms in front, raise dumbbells to eye level, control down.",
  },
  {
    id: "shoulders_arnold_press",
    name: "Arnold Press",
    muscleGroup: "Shoulders",
    movementPattern: "vertical_press",
    equipment: ["Dumbbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["shoulders_lateral_raise"],
    alternativeFor: ["shoulders_db_press"],
    instructions:
      "Start palms facing you, rotate and press up, reverse down.",
  },
  {
    id: "shoulders_reverse_fly",
    name: "Reverse Flyes",
    muscleGroup: "Shoulders",
    movementPattern: "horizontal_pull",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: ["shoulders_ohp", "shoulders_lateral_raise"],
    alternativeFor: ["back_face_pull"],
    instructions:
      "Bend forward, raise dumbbells out to sides, squeeze shoulder blades.",
  },
  {
    id: "shoulders_upright_row",
    name: "Upright Row",
    muscleGroup: "Shoulders",
    movementPattern: "vertical_pull",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["shoulders_lateral_raise"],
    alternativeFor: [],
    instructions: "Narrow grip, pull bar to chin, elbows high.",
  },

  // ── BICEPS ───────────────────────────────────────────────────────────────
  {
    id: "biceps_barbell_curl",
    name: "Barbell Curl",
    muscleGroup: "Biceps",
    movementPattern: "isolation_pull",
    equipment: ["Barbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: [],
    alternativeFor: [],
    instructions: "Stand upright, curl bar to shoulders, control down.",
  },
  {
    id: "biceps_db_curl",
    name: "Dumbbell Curl",
    muscleGroup: "Biceps",
    movementPattern: "isolation_pull",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["biceps_hammer_curl"],
    alternativeFor: ["biceps_barbell_curl"],
    instructions:
      "Alternate or together, curl dumbbells to shoulders, supinate wrists.",
  },
  {
    id: "biceps_hammer_curl",
    name: "Hammer Curls",
    muscleGroup: "Biceps",
    movementPattern: "isolation_pull",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["biceps_barbell_curl", "biceps_db_curl"],
    alternativeFor: [],
    instructions:
      "Neutral grip (thumbs up), curl to shoulders, targets brachialis.",
  },
  {
    id: "biceps_preacher_curl",
    name: "Preacher Curl",
    muscleGroup: "Biceps",
    movementPattern: "isolation_pull",
    equipment: ["Barbell", "Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["biceps_barbell_curl"],
    alternativeFor: ["biceps_cable_curl"],
    instructions:
      "Arms on preacher pad, curl weight up, full stretch at bottom.",
  },
  {
    id: "biceps_cable_curl",
    name: "Cable Curl",
    muscleGroup: "Biceps",
    movementPattern: "isolation_pull",
    equipment: ["Cable"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: ["biceps_barbell_curl", "biceps_db_curl"],
    alternativeFor: ["biceps_preacher_curl"],
    instructions: "Attach straight or EZ bar, curl with constant tension.",
  },
  {
    id: "biceps_concentration_curl",
    name: "Concentration Curl",
    muscleGroup: "Biceps",
    movementPattern: "isolation_pull",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: ["biceps_barbell_curl", "biceps_hammer_curl"],
    alternativeFor: [],
    instructions:
      "Sit, elbow on inner thigh, curl dumbbell to shoulder, squeeze at top.",
  },

  // ── TRICEPS ──────────────────────────────────────────────────────────────
  {
    id: "triceps_close_grip_bench",
    name: "Close-Grip Bench Press",
    muscleGroup: "Triceps",
    movementPattern: "horizontal_press",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: [],
    alternativeFor: [],
    instructions:
      "Hands shoulder-width or closer, lower to chest, press up, elbows in.",
  },
  {
    id: "triceps_overhead_extension",
    name: "Overhead Tricep Extension",
    muscleGroup: "Triceps",
    movementPattern: "isolation_push",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: ["triceps_close_grip_bench", "triceps_dips"],
    alternativeFor: ["triceps_cable_overhead"],
    instructions:
      "Dumbbell overhead, lower behind head, extend up, keep elbows still.",
  },
  {
    id: "triceps_pushdown",
    name: "Tricep Pushdown",
    muscleGroup: "Triceps",
    movementPattern: "isolation_push",
    equipment: ["Cable"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: [
      "triceps_close_grip_bench",
      "triceps_overhead_extension",
    ],
    alternativeFor: [],
    instructions:
      "Attach rope or bar, push down fully extending elbows, control up.",
  },
  {
    id: "triceps_dips",
    name: "Tricep Dips",
    muscleGroup: "Triceps",
    movementPattern: "vertical_press",
    equipment: ["Bodyweight"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["triceps_pushdown"],
    alternativeFor: ["triceps_close_grip_bench"],
    instructions:
      "Upright torso, lower until 90° elbows, press up, elbows back.",
  },
  {
    id: "triceps_skull_crusher",
    name: "Skull Crushers",
    muscleGroup: "Triceps",
    movementPattern: "isolation_push",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: ["triceps_close_grip_bench", "triceps_pushdown"],
    alternativeFor: ["triceps_overhead_extension"],
    instructions:
      "Lie flat, bar above head, lower to forehead, extend up.",
  },
  {
    id: "triceps_cable_overhead",
    name: "Cable Overhead Extension",
    muscleGroup: "Triceps",
    movementPattern: "isolation_push",
    equipment: ["Cable"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: ["triceps_pushdown"],
    alternativeFor: ["triceps_overhead_extension"],
    instructions:
      "Face away from cable, extend rope overhead, control down.",
  },
  {
    id: "triceps_kickback",
    name: "Tricep Kickback",
    muscleGroup: "Triceps",
    movementPattern: "isolation_push",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: ["triceps_close_grip_bench", "triceps_pushdown"],
    alternativeFor: [],
    instructions:
      "Hinge forward, upper arm still, extend dumbbell back, squeeze tricep.",
  },

  // ── GLUTES ───────────────────────────────────────────────────────────────
  {
    id: "glutes_hip_thrust",
    name: "Barbell Hip Thrust",
    muscleGroup: "Glutes",
    movementPattern: "hinge",
    equipment: ["Barbell"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 8, max: 12 },
    complementsExercises: [],
    alternativeFor: [],
    instructions:
      "Upper back on bench, bar over hips, thrust up squeezing glutes.",
  },
  {
    id: "glutes_glute_bridge",
    name: "Glute Bridge",
    muscleGroup: "Glutes",
    movementPattern: "hinge",
    equipment: ["Bodyweight", "Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: ["glutes_hip_thrust"],
    alternativeFor: ["glutes_hip_thrust"],
    instructions:
      "Lie on back, feet flat, drive hips up squeezing glutes, hold at top.",
  },
  {
    id: "glutes_cable_kickback",
    name: "Cable Glute Kickback",
    muscleGroup: "Glutes",
    movementPattern: "isolation_push",
    equipment: ["Cable"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: ["glutes_hip_thrust", "quads_bulgarian_split_squat"],
    alternativeFor: [],
    instructions:
      "Ankle strap, kick leg back, squeeze glute, control forward.",
  },
  {
    id: "glutes_step_ups",
    name: "Step-ups",
    muscleGroup: "Glutes",
    movementPattern: "lunge",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 12 },
    complementsExercises: ["glutes_hip_thrust"],
    alternativeFor: [],
    instructions:
      "Step onto box/bench, drive through heel, step down, alternate.",
  },

  // ── CALVES ───────────────────────────────────────────────────────────────
  {
    id: "calves_standing_raise",
    name: "Standing Calf Raise",
    muscleGroup: "Calves",
    movementPattern: "isolation_push",
    equipment: ["Machine"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: [],
    alternativeFor: [],
    instructions:
      "Shoulders under pads, rise onto toes, stretch down fully.",
  },
  {
    id: "calves_seated_raise",
    name: "Seated Calf Raise",
    muscleGroup: "Calves",
    movementPattern: "isolation_push",
    equipment: ["Machine"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: ["calves_standing_raise"],
    alternativeFor: [],
    instructions:
      "Sit with pad on knees, rise onto toes, targets soleus muscle.",
  },

  // ── ABS / CORE ───────────────────────────────────────────────────────────
  {
    id: "abs_plank",
    name: "Plank",
    muscleGroup: "Abs",
    movementPattern: "core",
    equipment: ["Bodyweight"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 30, max: 60 },
    complementsExercises: [],
    alternativeFor: [],
    instructions:
      "Forearms and toes, straight body, hold position, brace core.",
  },
  {
    id: "abs_crunch",
    name: "Crunches",
    muscleGroup: "Abs",
    movementPattern: "core",
    equipment: ["Bodyweight"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 15, max: 20 },
    complementsExercises: ["abs_plank"],
    alternativeFor: [],
    instructions:
      "Lie on back, knees bent, curl shoulders off floor, squeeze abs.",
  },
  {
    id: "abs_hanging_leg_raise",
    name: "Hanging Leg Raise",
    muscleGroup: "Abs",
    movementPattern: "core",
    equipment: ["Bodyweight"],
    difficulty: "advanced",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 15 },
    complementsExercises: ["abs_plank", "abs_crunch"],
    alternativeFor: ["abs_leg_raise"],
    instructions:
      "Hang from bar, raise legs to 90°, control down, no swinging.",
  },
  {
    id: "abs_leg_raise",
    name: "Lying Leg Raise",
    muscleGroup: "Abs",
    movementPattern: "core",
    equipment: ["Bodyweight"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: ["abs_plank"],
    alternativeFor: ["abs_hanging_leg_raise"],
    instructions:
      "Lie flat, raise legs to 90°, lower without touching floor.",
  },
  {
    id: "abs_cable_crunch",
    name: "Cable Crunch",
    muscleGroup: "Abs",
    movementPattern: "core",
    equipment: ["Cable"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 12, max: 15 },
    complementsExercises: ["abs_plank", "abs_crunch"],
    alternativeFor: ["abs_crunch"],
    instructions:
      "Kneel, hold rope at head, crunch down curling spine, squeeze abs.",
  },
  {
    id: "abs_russian_twist",
    name: "Russian Twists",
    muscleGroup: "Abs",
    movementPattern: "core",
    equipment: ["Dumbbell"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 20, max: 30 },
    complementsExercises: ["abs_plank"],
    alternativeFor: [],
    instructions:
      "Sit leaning back, rotate torso side to side, touch weight to floor.",
  },
  {
    id: "abs_bicycle_crunch",
    name: "Bicycle Crunches",
    muscleGroup: "Abs",
    movementPattern: "core",
    equipment: ["Bodyweight"],
    difficulty: "beginner",
    defaultSets: 3,
    defaultRepRange: { min: 20, max: 30 },
    complementsExercises: ["abs_russian_twist"],
    alternativeFor: ["abs_crunch"],
    instructions:
      "Lie down, alternate bringing elbow to opposite knee, extend other leg.",
  },
  {
    id: "abs_pallof_press",
    name: "Pallof Press",
    muscleGroup: "Abs",
    movementPattern: "core",
    equipment: ["Cable"],
    difficulty: "intermediate",
    defaultSets: 3,
    defaultRepRange: { min: 10, max: 12 },
    complementsExercises: ["abs_plank"],
    alternativeFor: [],
    instructions:
      "Stand sideways to cable, press out resisting rotation, return to chest.",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export function findComplementaryExercise(
  exerciseId: string,
  userEquipment: Equipment[] = [],
): ExerciseTemplate | null {
  const exercise = EXERCISE_LIBRARY.find((ex) => ex.id === exerciseId);
  if (!exercise) return null;

  return (
    EXERCISE_LIBRARY.find(
      (ex) =>
        exercise.complementsExercises.includes(ex.id) &&
        (userEquipment.length === 0 ||
          ex.equipment.some((eq) => userEquipment.includes(eq))),
    ) ?? null
  );
}

export function getExercisesByMuscleGroup(
  muscleGroup: MuscleGroup,
): ExerciseTemplate[] {
  return EXERCISE_LIBRARY.filter((ex) => ex.muscleGroup === muscleGroup);
}

export function getExercisesByMovementPattern(
  pattern: MovementPattern,
): ExerciseTemplate[] {
  return EXERCISE_LIBRARY.filter((ex) => ex.movementPattern === pattern);
}

export function getExerciseById(id: string): ExerciseTemplate | null {
  return EXERCISE_LIBRARY.find((ex) => ex.id === id) ?? null;
}

/** Returns the DB-ready category string derived from a movement pattern. */
export function categoryFromMovementPattern(pattern: MovementPattern): string {
  const compound: MovementPattern[] = [
    "horizontal_press",
    "vertical_press",
    "horizontal_pull",
    "vertical_pull",
    "squat",
    "hinge",
    "lunge",
    "carry",
  ];
  return compound.includes(pattern) ? "Compound" : "Isolation";
}
