// server/auth.ts
import express, { Request, Response } from "express";
import Stripe from "stripe";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  sendConfirmationEmail,
  sendReferralWelcomeEmail,
  sendReferralRewardEmail,
} from "./email";
import { prisma } from "./prisma";
import { authenticateToken } from "./authMiddleware";
import { generateUniqueReferralCode } from "./utils/referralUtils";
import { sendPasswordResetEmail } from "../server/email";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  ProgressiveOverloadService,
  WorkoutData,
} from "./utils/progressiveOverloadService";
import { RollingWindowStreakService } from "./utils/rollingWindowStreakService";
import { getSuggestedReps } from "./utils/repAdjustmentService";

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../uploads/profile-photos");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const userId = (req as any).user.userId;
    cb(null, `user-${userId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const STRENGTH_ROLES = ["MAIN_LIFT", "SUPPLEMENTAL", "ACCESSORY"] as const;
const WORKOUT_RECOVERY_OPTIONS = ["FRESH", "NORMAL", "STILL_TIRED"] as const;
const HIGH_FATIGUE_STREAK_THRESHOLD = 5;
const HIGH_FATIGUE_DIFFICULTY_THRESHOLD = 8;
const LOW_EFFORT_STREAK_THRESHOLD = 3;
const LOW_EFFORT_DIFFICULTY_THRESHOLD = 4;
const MISSED_TARGET_REP_STREAK_THRESHOLD = 2;
const RECOVERY_ADJUSTMENT_WEIGHT_MULTIPLIER = 0.9;
const RECOVERY_ADJUSTMENT_SET_TARGET = 3;
const EASY_PROGRESS_WEIGHT_MULTIPLIER = 1.05;
const EXERCISE_OVERPERFORMANCE_STREAK_THRESHOLD = 2;
const EXERCISE_OVERPERFORMANCE_WEIGHT_MULTIPLIER = 1.05;
const MISSED_TARGET_ONE_TIME_WEIGHT_MULTIPLIER = 0.9;

type StrengthRole = (typeof STRENGTH_ROLES)[number];
type WorkoutRecoveryOption = (typeof WORKOUT_RECOVERY_OPTIONS)[number];

type ExerciseOneTimeOverride = {
  exerciseId: string;
  exerciseName: string;
  multiplier: number;
  sessionsToAdjust: number;
  appliedAt: string;
  triggerWorkoutId: string;
  dayNumber: number;
  programmeId: string;
  triggerType: "MISSED_TARGETS" | "EXERCISE_OVERPERFORMANCE";
};

type WorkoutNotesMeta = {
  feedback?: {
    perceivedDifficulty: number;
    startRecovery: WorkoutRecoveryOption;
  };
  recoveryAdjustment?: {
    triggerType?: "FATIGUE" | "MISSED_TARGETS" | "EASY_PROGRESS";
    sessionsToAdjust: number;
    setTarget?: number;
    weightMultiplier: number;
    appliedAt: string;
    triggerWorkoutId: string;
    targetExerciseId?: string;
    targetExerciseName?: string;
  };
  exerciseOverperformanceAdjustments?: ExerciseOneTimeOverride[];
};

type WorkoutNotesEnvelope = {
  text?: string;
  meta?: WorkoutNotesMeta;
};

type ProgrammeExerciseNotes = {
  setDefinitions?: unknown;
  recoveryWeightMultiplier?: number;
};

const resolveStrengthRole = (
  inputRole: unknown,
  existingDayExerciseCount: number,
): StrengthRole => {
  if (
    typeof inputRole === "string" &&
    STRENGTH_ROLES.includes(inputRole as StrengthRole)
  ) {
    return inputRole as StrengthRole;
  }

  // Sensible defaults for quick strength-day setup when the client omits tags.
  if (existingDayExerciseCount === 0) return "MAIN_LIFT";
  if (existingDayExerciseCount <= 2) return "SUPPLEMENTAL";
  return "ACCESSORY";
};

const parseWorkoutNotesEnvelope = (
  rawNotes: string | null | undefined,
): WorkoutNotesEnvelope => {
  if (!rawNotes) {
    return { text: "", meta: {} };
  }

  try {
    const parsed = JSON.parse(rawNotes);
    if (parsed && typeof parsed === "object") {
      const maybeObject = parsed as Record<string, unknown>;
      if ("meta" in maybeObject || "text" in maybeObject) {
        return {
          text: typeof maybeObject.text === "string" ? maybeObject.text : "",
          meta:
            maybeObject.meta && typeof maybeObject.meta === "object"
              ? (maybeObject.meta as WorkoutNotesMeta)
              : {},
        };
      }
    }
  } catch {
    // Plain text notes from older flows are valid.
  }

  return {
    text: rawNotes,
    meta: {},
  };
};

const serializeWorkoutNotesEnvelope = (
  envelope: WorkoutNotesEnvelope,
): string | null => {
  const text = envelope.text || "";
  const meta = envelope.meta || {};
  const hasMeta = Object.keys(meta).length > 0;

  if (!hasMeta) {
    return text || null;
  }

  return JSON.stringify({
    text,
    meta,
  });
};

const extractFeedbackFromWorkoutNotes = (
  rawNotes: string | null | undefined,
): {
  perceivedDifficulty?: number;
  startRecovery?: WorkoutRecoveryOption;
} => {
  const parsed = parseWorkoutNotesEnvelope(rawNotes);
  const feedback = parsed.meta?.feedback;

  if (!feedback) {
    return {};
  }

  return {
    perceivedDifficulty: feedback.perceivedDifficulty,
    startRecovery: feedback.startRecovery,
  };
};

const isHighFatigueFeedback = (
  feedback: {
    perceivedDifficulty?: number;
    startRecovery?: WorkoutRecoveryOption;
  },
): boolean => {
  return (
    typeof feedback.perceivedDifficulty === "number" &&
    feedback.perceivedDifficulty >= HIGH_FATIGUE_DIFFICULTY_THRESHOLD &&
    feedback.startRecovery === "STILL_TIRED"
  );
};

const countConsecutiveHighFatigueFeedback = (
  workouts: Array<{ notes: string | null }>,
): number => {
  let count = 0;
  for (const workout of workouts) {
    const feedback = extractFeedbackFromWorkoutNotes(workout.notes);
    if (!isHighFatigueFeedback(feedback)) {
      break;
    }
    count += 1;
  }
  return count;
};

const didWorkoutMeetOrExceedAllTargets = (
  exercises: Array<{
    sets: Array<{
      reps: number | null;
      targetReps: number | null;
      completed: boolean;
      notes: string | null;
    }>;
  }>,
): boolean => {
  let comparedSetCount = 0;

  for (const exercise of exercises) {
    for (const set of exercise.sets || []) {
      if (!set.completed) {
        continue;
      }
      if (typeof set.targetReps !== "number" || set.targetReps <= 0) {
        continue;
      }

      comparedSetCount += 1;
      if ((set.reps || 0) < set.targetReps) {
        return false;
      }
    }
  }

  return comparedSetCount > 0;
};

const countConsecutiveEasyProgressWorkouts = (
  workouts: Array<{
    notes: string | null;
    exercises: Array<{
      sets: Array<{
        reps: number | null;
        targetReps: number | null;
        completed: boolean;
        notes: string | null;
      }>;
    }>;
  }>,
): number => {
  let streak = 0;

  for (const workout of workouts) {
    const feedback = extractFeedbackFromWorkoutNotes(workout.notes);
    const easyFeedback =
      typeof feedback.perceivedDifficulty === "number" &&
      feedback.perceivedDifficulty <= LOW_EFFORT_DIFFICULTY_THRESHOLD;
    const metAllTargets = didWorkoutMeetOrExceedAllTargets(workout.exercises);

    if (!easyFeedback || !metAllTargets) {
      break;
    }

    streak += 1;
  }

  return streak;
};

const didWorkoutExerciseExceedTargets = (
  sets: Array<{
    reps: number | null;
    targetReps: number | null;
    completed: boolean;
    notes: string | null;
  }>,
): boolean => {
  const mainSets = sets.filter((set) => {
    if (!set.notes) return true;
    try {
      const parsed = JSON.parse(set.notes);
      return parsed?.type !== "drop";
    } catch {
      return true;
    }
  });
  const candidateSets = mainSets.length > 0 ? mainSets : sets;
  const comparedSets = candidateSets.filter(
    (set) => set.completed && typeof set.targetReps === "number" && set.targetReps > 0,
  );
  if (comparedSets.length === 0) return false;
  // All compared sets must exceed their target reps for the exercise to count.
  return comparedSets.every((set) => (set.reps || 0) > (set.targetReps || 0));
};

const didWorkoutExerciseMissTargets = (
  sets: Array<{
    reps: number | null;
    targetReps: number | null;
    completed: boolean;
    notes: string | null;
  }>,
): boolean => {
  const mainSets = sets.filter((set) => {
    if (!set.notes) {
      return true;
    }
    try {
      const parsed = JSON.parse(set.notes);
      return parsed?.type !== "drop";
    } catch {
      return true;
    }
  });

  const candidateSets = mainSets.length > 0 ? mainSets : sets;
  const comparedSets = candidateSets.filter(
    (set) => set.completed && typeof set.targetReps === "number" && set.targetReps > 0,
  );

  if (comparedSets.length === 0) {
    return false;
  }

  return comparedSets.some((set) => (set.reps || 0) < (set.targetReps || 0));
};

const hasExerciseUnderperformanceStreak = async (
  userId: string,
  threshold: number,
): Promise<{
  hasStreak: boolean;
  exerciseId?: string;
  exerciseName?: string;
  dayNumber?: number;
}> => {
  const latestWorkout = await prisma.workout.findFirst({
    where: {
      userProgram: {
        userId,
        status: "ACTIVE",
      },
    },
    orderBy: {
      completedAt: "desc",
    },
    select: {
      id: true,
      userProgramId: true,
      dayNumber: true,
      exercises: {
        select: {
          exerciseId: true,
          exercise: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!latestWorkout || latestWorkout.exercises.length === 0) {
    return { hasStreak: false };
  }

  for (const workoutExercise of latestWorkout.exercises) {
    const recentExerciseSessions = await prisma.workoutExercise.findMany({
      where: {
        exerciseId: workoutExercise.exerciseId,
        workout: {
          userProgramId: latestWorkout.userProgramId,
          dayNumber: latestWorkout.dayNumber,
        },
      },
      orderBy: {
        workout: {
          completedAt: "desc",
        },
      },
      take: threshold,
      select: {
        sets: {
          select: {
            reps: true,
            targetReps: true,
            completed: true,
            notes: true,
          },
        },
      },
    });

    if (recentExerciseSessions.length < threshold) {
      continue;
    }

    const streakMatched = recentExerciseSessions.every((session) =>
      didWorkoutExerciseMissTargets(session.sets),
    );

    if (streakMatched) {
      return {
        hasStreak: true,
        exerciseId: workoutExercise.exerciseId,
        exerciseName: workoutExercise.exercise?.name,
        dayNumber: latestWorkout.dayNumber,
      };
    }
  }

  return { hasStreak: false };
};

const findExercisesWithOverperformanceStreak = async (
  userId: string,
  threshold: number,
): Promise<Array<{ exerciseId: string; exerciseName: string; dayNumber: number }>> => {
  const latestWorkout = await prisma.workout.findFirst({
    where: { userProgram: { userId, status: "ACTIVE" } },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      userProgramId: true,
      dayNumber: true,
      exercises: {
        select: {
          exerciseId: true,
          exercise: { select: { name: true } },
        },
      },
    },
  });

  if (!latestWorkout || latestWorkout.exercises.length === 0) return [];

  const results: Array<{ exerciseId: string; exerciseName: string; dayNumber: number }> = [];

  for (const workoutExercise of latestWorkout.exercises) {
    const recentSessions = await prisma.workoutExercise.findMany({
      where: {
        exerciseId: workoutExercise.exerciseId,
        workout: {
          userProgramId: latestWorkout.userProgramId,
          dayNumber: latestWorkout.dayNumber,
        },
      },
      orderBy: { workout: { completedAt: "desc" } },
      take: threshold,
      select: {
        sets: {
          select: { reps: true, targetReps: true, completed: true, notes: true },
        },
      },
    });

    if (recentSessions.length < threshold) continue;

    const allExceed = recentSessions.every((session) =>
      didWorkoutExerciseExceedTargets(session.sets),
    );

    if (allExceed) {
      results.push({
        exerciseId: workoutExercise.exerciseId,
        exerciseName: workoutExercise.exercise?.name ?? workoutExercise.exerciseId,
        dayNumber: latestWorkout.dayNumber,
      });
    }
  }

  return results;
};

type RecoveryAdjustmentStatusResult = {
  isActive: boolean;
  sessionsRemaining: number;
  setTarget?: number;
  weightMultiplier: number;
  triggerType?: "FATIGUE" | "MISSED_TARGETS" | "EASY_PROGRESS";
  targetExerciseId?: string;
  targetExerciseName?: string;
  activeExerciseOverperformanceAdjustments: Array<{
    exerciseId: string;
    exerciseName: string;
    multiplier: number;
    sessionsRemaining: number;
    dayNumber: number;
  }>;
};

const getRecoveryAdjustmentStatus = async (
  userId: string,
): Promise<RecoveryAdjustmentStatusResult> => {
  const activeProgram = await prisma.userProgram.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
    },
  });

  if (!activeProgram) {
    return {
      isActive: false,
      sessionsRemaining: 0,
      setTarget: undefined,
      weightMultiplier: 1,
      activeExerciseOverperformanceAdjustments: [],
    };
  }

  const workouts = await prisma.workout.findMany({
    where: { userProgramId: activeProgram.id },
    orderBy: { completedAt: "desc" },
    take: 120,
    select: {
      id: true,
      completedAt: true,
      dayNumber: true,
      notes: true,
      exercises: {
        select: { exerciseId: true },
      },
    },
  });

  // --- per-exercise overperformance adjustments (day-scoped) ---
  const activeExerciseOverperformanceAdjustments: RecoveryAdjustmentStatusResult["activeExerciseOverperformanceAdjustments"] =
    [];

  for (const workout of workouts) {
    const parsed = parseWorkoutNotesEnvelope(workout.notes);
    const arr = parsed.meta?.exerciseOverperformanceAdjustments;
    if (!Array.isArray(arr) || arr.length === 0) continue;

    for (const adj of arr) {
      // Only count workouts after this one on the SAME day that include this specific exercise
      // (only if the original workout has a valid dayNumber)
      const workoutsSinceWithExerciseOnSameDay =
        typeof adj.dayNumber === "number"
          ? workouts.filter(
              (w) =>
                w.completedAt > workout.completedAt &&
                w.dayNumber === adj.dayNumber &&
                w.exercises.some((ex) => ex.exerciseId === adj.exerciseId),
            ).length
          : 0;

      const sessionsRemaining = Math.max(
        adj.sessionsToAdjust - workoutsSinceWithExerciseOnSameDay,
        0,
      );
      if (sessionsRemaining > 0) {
        // Only add if not already tracked (first / most recent trigger wins)
        // Track day number to scope the multiplier to the correct day only
        const alreadyTracked = activeExerciseOverperformanceAdjustments.some(
          (a) => a.exerciseId === adj.exerciseId && a.dayNumber === adj.dayNumber,
        );
        if (!alreadyTracked) {
          activeExerciseOverperformanceAdjustments.push({
            exerciseId: adj.exerciseId,
            exerciseName: adj.exerciseName,
            multiplier: adj.multiplier,
            sessionsRemaining,
            dayNumber: adj.dayNumber,
          });
        }
      }
    }
  }

  // --- programme-wide / FATIGUE / MISSED_TARGETS / EASY_PROGRESS adjustment ---
  const triggerWorkout = workouts.find((workout) => {
    const parsed = parseWorkoutNotesEnvelope(workout.notes);
    return (
      parsed.meta?.recoveryAdjustment &&
      Number.isInteger(parsed.meta.recoveryAdjustment.sessionsToAdjust) &&
      parsed.meta.recoveryAdjustment.sessionsToAdjust > 0
    );
  });

  if (!triggerWorkout) {
    return {
      isActive: false,
      sessionsRemaining: 0,
      setTarget: undefined,
      weightMultiplier: 1,
      activeExerciseOverperformanceAdjustments,
    };
  }

  const parsed = parseWorkoutNotesEnvelope(triggerWorkout.notes);
  const adjustment = parsed.meta?.recoveryAdjustment;
  if (!adjustment) {
    return {
      isActive: false,
      sessionsRemaining: 0,
      setTarget: undefined,
      weightMultiplier: 1,
      activeExerciseOverperformanceAdjustments,
    };
  }

  const workoutsSinceTrigger = workouts.filter(
    (workout) => workout.completedAt > triggerWorkout.completedAt,
  ).length;

  const sessionsRemaining = Math.max(
    adjustment.sessionsToAdjust - workoutsSinceTrigger,
    0,
  );

  return {
    isActive: sessionsRemaining > 0,
    sessionsRemaining,
    setTarget:
      Number.isInteger(adjustment.setTarget) && (adjustment.setTarget || 0) > 0
        ? adjustment.setTarget
        : undefined,
    weightMultiplier:
      typeof adjustment.weightMultiplier === "number" &&
      adjustment.weightMultiplier > 0
        ? adjustment.weightMultiplier
        : 1,
    triggerType:
      adjustment.triggerType === "MISSED_TARGETS"
        ? "MISSED_TARGETS"
        : adjustment.triggerType === "EASY_PROGRESS"
          ? "EASY_PROGRESS"
          : "FATIGUE",
    targetExerciseId:
      typeof adjustment.targetExerciseId === "string"
        ? adjustment.targetExerciseId
        : undefined,
    targetExerciseName:
      typeof adjustment.targetExerciseName === "string"
        ? adjustment.targetExerciseName
        : undefined,
    activeExerciseOverperformanceAdjustments,
  };
};

const parseProgrammeExerciseNotes = (
  rawNotes: string | null | undefined,
): ProgrammeExerciseNotes => {
  if (!rawNotes) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawNotes);
    if (parsed && typeof parsed === "object") {
      return parsed as ProgrammeExerciseNotes;
    }
  } catch {
    // Ignore plain text notes.
  }

  return {};
};

const mergeProgrammeExerciseNotes = (
  existingNotes: string | null | undefined,
  incomingNotes: string | null | undefined,
): string | null => {
  const existing = parseProgrammeExerciseNotes(existingNotes);
  const incoming = parseProgrammeExerciseNotes(incomingNotes);

  const merged: ProgrammeExerciseNotes = {};
  if (incoming.setDefinitions !== undefined) {
    merged.setDefinitions = incoming.setDefinitions;
  } else if (existing.setDefinitions !== undefined) {
    merged.setDefinitions = existing.setDefinitions;
  }

  const multiplier =
    typeof incoming.recoveryWeightMultiplier === "number"
      ? incoming.recoveryWeightMultiplier
      : existing.recoveryWeightMultiplier;

  if (typeof multiplier === "number") {
    merged.recoveryWeightMultiplier = multiplier;
  }

  return Object.keys(merged).length > 0 ? JSON.stringify(merged) : null;
};

// --- LOGIN ---
router.post("/login", async (req: Request, res: Response): Promise<any> => {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!user.subscribed) {
    return res.status(403).json({ error: "User not subscribed" });
  }

  // Generate JWT
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET!, {
    expiresIn: "1d",
  });

  res.json({ token });
});

// --- SIGNUP --- (Updated version)
router.post("/signup", async (req: Request, res: Response): Promise<any> => {
  const email = req.body.email?.trim().toLowerCase();
  const { password, firstName, surname, referralCode } = req.body;

  console.log("🔄 Signup attempt:", {
    email,
    firstName,
    surname,
    referralCode,
  });

  if (!email || !password || !firstName || !surname) {
    return res.status(400).json({ error: "Email, password, first name and surname are required." });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: "User already exists." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if referral code is valid
  let referrer = null;
  if (referralCode) {
    referrer = await prisma.user.findUnique({
      where: { referralCode },
    });
    if (!referrer) {
      return res.status(400).json({ error: "Invalid referral code." });
    }
    console.log(
      "✅ Valid referral code found:",
      referralCode,
      "Referrer:",
      referrer.firstName,
      referrer.surname,
    );
  }

  // Generate unique referral code for new user
  const newUserReferralCode = await generateUniqueReferralCode(
    firstName,
    surname,
    prisma,
  );
  console.log("🆔 Generated referral code for new user:", newUserReferralCode);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      surname,
      referralCode: newUserReferralCode,
      referredBy: referrer?.id,
    },
  });

  console.log("👤 New user created:", newUser.id);

  try {
    // Base session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${process.env.CLIENT_URL}/subscription-success?email=${encodeURIComponent(email)}`,
      cancel_url: `${process.env.CLIENT_URL}/login`,
      metadata: {
        userId: newUser.id.toString(),
        referredBy: referrer?.id?.toString() || "",
        referralCode: referralCode || "",
        newUserReferralCode: newUserReferralCode,
      },
      // Add trial period for ALL users (30 days free trial)
      subscription_data: {
        trial_period_days: 30,
      },
    };

    // Apply ADDITIONAL referral discount if user was referred
    // This gives them ANOTHER free month on top of the 30-day trial
    if (referrer) {
      console.log("🎁 Applying additional referral discount");
      sessionConfig.discounts = [
        {
          coupon: "BFLS4uO9", // Your referral discount coupon - should be for 1 month free
        },
      ];
    }

    console.log(
      "🔄 Creating Stripe session with config:",
      JSON.stringify(sessionConfig, null, 2),
    );

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log("✅ Stripe session created successfully:", session.id);

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err);

    // Clean up user if Stripe session creation fails
    await prisma.user.delete({ where: { id: newUser.id } });

    res.status(500).json({
      error: "Failed to create Stripe session",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// Add this improved version to your auth.ts file

// Only showing the fixed /auth/token endpoint - add this to your existing auth.ts

// GET /auth/token?email=... - IMPROVED VERSION with detailed logging
router.get("/token", async (req: Request, res: Response): Promise<any> => {
  const email = req.query.email as string;

  console.log(
    `🔍 Token request for email: ${email} at ${new Date().toISOString()}`,
  );

  if (!email) {
    console.error("❌ Token request missing email");
    return res.status(400).json({ error: "Email required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        subscribed: true,
        createdAt: true,
        firstName: true,
        surname: true,
        updatedAt: true,
      },
    });

    console.log(`📊 User lookup result:`, {
      found: !!user,
      id: user?.id,
      email: user?.email,
      subscribed: user?.subscribed,
      createdAt: user?.createdAt,
      updatedAt: user?.updatedAt,
      name: user ? `${user.firstName} ${user.surname}` : "N/A",
      timeSinceCreation: user
        ? `${Math.round((Date.now() - new Date(user.createdAt).getTime()) / 1000)}s`
        : "N/A",
      timeSinceUpdate: user
        ? `${Math.round((Date.now() - new Date(user.updatedAt).getTime()) / 1000)}s`
        : "N/A",
    });

    if (!user) {
      console.error(`❌ User not found for email: ${email}`);
      return res.status(404).json({
        error: "User not found",
        debug: {
          email,
          timestamp: new Date().toISOString(),
          message: "User does not exist in database",
        },
      });
    }

    if (!user.subscribed) {
      console.error(`❌ User not subscribed yet: ${email}`, {
        userId: user.id,
        subscribed: user.subscribed,
        createdAt: user.createdAt,
        timeSinceCreation: `${Math.round((Date.now() - new Date(user.createdAt).getTime()) / 1000)}s`,
        message: "Webhook may still be processing",
      });
      return res.status(403).json({
        error: "Subscription not active yet",
        debug: {
          email,
          userId: user.id,
          subscribed: user.subscribed,
          timestamp: new Date().toISOString(),
          message:
            "Webhook is still processing your subscription. Please wait...",
        },
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" },
    );

    console.log(`✅ Token generated successfully for: ${email}`, {
      userId: user.id,
      tokenLength: token.length,
    });

    res.json({ token });
  } catch (error) {
    console.error("❌ Database error in token endpoint:", error);
    res.status(500).json({
      error: "Internal server error",
      debug: {
        email,
        timestamp: new Date().toISOString(),
        message: "Database query failed",
      },
    });
  }
});

// Get user's referral stats
router.get(
  "/referrals",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referredUsers: {
          select: {
            firstName: true,
            surname: true,
            createdAt: true,
            subscribed: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      referralCode: user.referralCode,
      referralCredits: user.referralCredits || 0,
      freeMonthsEarned: user.freeMonthsEarned || 0,
      referredUsers: user.referredUsers,
      totalReferrals: user.referredUsers.length,
      activeReferrals: user.referredUsers.filter((u) => u.subscribed).length,
    });
  },
);

// Add these endpoints to your auth.ts file

// Change Password endpoint
router.post(
  "/change-password",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.userId;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters long" });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user || !user.password) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const passwordMatch = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!passwordMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password in database
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      console.log(`✅ Password changed for user: ${userId}`);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("❌ Change password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Change Email endpoint
router.post(
  "/change-email",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { currentPassword, newEmail } = req.body;
    const userId = (req as any).user.userId;

    if (!currentPassword || !newEmail) {
      return res
        .status(400)
        .json({ error: "Current password and new email are required" });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    try {
      // Ensure new email is not already taken
      const existing = await prisma.user.findUnique({
        where: { email: newEmail },
      });
      if (existing) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      if (!user || !user.password)
        return res.status(404).json({ error: "User not found" });

      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match)
        return res.status(400).json({ error: "Current password is incorrect" });

      await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      });

      console.log(`✅ Email changed for user ${userId} -> ${newEmail}`);
      res.json({ message: "Email changed successfully" });
    } catch (err) {
      console.error("Error changing email:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Forgot Password endpoint
router.post(
  "/forgot-password",
  async (req: Request, res: Response): Promise<any> => {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({
          message: "If that email is registered, we've sent a reset link",
        });
      }

      // Generate reset token (expires in 1 hour)
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, type: "password_reset" },
        JWT_SECRET!,
        { expiresIn: "1h" },
      );

      // Store reset token in database (you might want to add a passwordResetToken field to your User model)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // Add these fields to your Prisma schema:
          // passwordResetToken: String?
          // passwordResetExpires: DateTime?
          passwordResetToken: resetToken,
          passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour from now
        },
      });

      // Send reset email
      await sendPasswordResetEmail(email, resetToken);

      console.log(`✅ Password reset email sent to: ${email}`);
      res.json({
        message: "If that email is registered, we've sent a reset link",
      });
    } catch (error) {
      console.error("❌ Forgot password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Reset Password endpoint (for when user clicks link in email)
router.post(
  "/reset-password",
  async (req: Request, res: Response): Promise<any> => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token and new password are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters long" });
    }

    try {
      // Verify reset token
      const decoded = jwt.verify(token, JWT_SECRET!) as {
        userId: string;
        email: string;
        type: string;
      };

      if (decoded.type !== "password_reset") {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      // Check if token exists in database and hasn't expired
      const user = await prisma.user.findFirst({
        where: {
          id: decoded.userId,
          passwordResetToken: token,
          passwordResetExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        return res
          .status(400)
          .json({ error: "Reset token is invalid or has expired" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      console.log(`✅ Password reset successful for user: ${user.email}`);
      res.json({ message: "Password reset successful" });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
      }
      console.error("❌ Reset password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /auth/delete-account
router.delete(
  "/delete-account",
  authenticateToken,
  async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    try {
      // Optional: You could first cancel the user's Stripe subscription here if you store subscription ID

      // Delete the user
      await prisma.user.delete({
        where: { id: userId },
      });

      console.log(`🗑️ Account deleted for user: ${userId}`);
      res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("❌ Failed to delete account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  },
);

router.get("/dashboard", authenticateToken, async (req, res): Promise<any> => {
  const userId = (req as any).user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        surname: true,
        subscribed: true,
        referralCode: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.subscribed) {
      return res.status(403).json({ error: "Subscription required" });
    }

    res.json({
      firstName: user.firstName,
      surname: user.surname,
      message: `Welcome back, ${user.firstName}!`,
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/settings
router.get(
  "/settings",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          surname: true,
          email: true,
          subscribed: true,
          referralCode: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Settings fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /auth/settings
router.get(
  "/workouts",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          surname: true,
          email: true,
          subscribed: true,
          referralCode: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Settings fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /auth/user/profile-photo - Upload profile photo
router.post(
  "/user/profile-photo",
  authenticateToken,
  upload.single("profilePhoto"),
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Create the relative path that will be stored in the database
      const profilePhotoPath = `/uploads/profile-photos/${req.file.filename}`;

      // Update user's profile photo in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          profilePhoto: profilePhotoPath,
        },
      });

      console.log(
        `✅ Profile photo uploaded for user ${userId}: ${profilePhotoPath}`,
      );

      res.json({
        message: "Profile photo uploaded successfully",
        profilePhoto: profilePhotoPath,
      });
    } catch (error) {
      console.error("Profile photo upload error:", error);
      res.status(500).json({ error: "Failed to upload profile photo" });
    }
  },
);

// DELETE /auth/user/profile-photo - Remove profile photo
router.delete(
  "/user/profile-photo",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      // Get current profile photo path
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profilePhoto: true },
      });

      if (user?.profilePhoto) {
        // Delete the file from filesystem
        const filePath = path.join(__dirname, "../../", user.profilePhoto);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Update database to remove profile photo
      await prisma.user.update({
        where: { id: userId },
        data: {
          profilePhoto: null,
        },
      });

      console.log(`✅ Profile photo removed for user ${userId}`);

      res.json({ message: "Profile photo removed successfully" });
    } catch (error) {
      console.error("Profile photo removal error:", error);
      res.status(500).json({ error: "Failed to remove profile photo" });
    }
  },
);

// GET /user/profile
router.get(
  "/user/profile",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          bodyweight: true,
          height: true,
          birthday: true,
          gender: true,
          profilePhoto: true, // Make sure to include profilePhoto
        },
      });

      if (!user) return res.status(404).json({ error: "User not found" });

      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  },
);

// PUT /user/profile - Updated to handle profile data without photo upload
router.put(
  "/user/profile",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { bodyweight, height, birthday, gender } = req.body;
    const userId = (req as any).user.userId;

    try {
      let birthdayDate = null;
      if (birthday) {
        birthdayDate = new Date(birthday);
        if (isNaN(birthdayDate.getTime())) {
          return res.status(400).json({ error: "Invalid birthday format" });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          bodyweight: bodyweight || null,
          height: height || null,
          birthday: birthdayDate,
          gender: gender || null,
        },
        select: {
          bodyweight: true,
          height: true,
          birthday: true,
          gender: true,
          profilePhoto: true,
        },
      });

      res.status(200).json({
        message: "Profile updated successfully",
        ...updatedUser,
      });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ error: "Update failed" });
    }
  },
);

// GET /auth/programmes
router.get(
  "/programmes",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = (req as any).user?.userId;

      // Get library programmes (no userId) + user's custom programmes
      const programmes = await prisma.programme.findMany({
        where: {
  // remove userId filtering if not in schema
},
       // where: {
         // OR: [
           // { userId: null }, // Library programmes
           // { userId: userId }, // User's custom programmes
         // ],
       // },
        include: {
          exercises: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.json(programmes);
    } catch (error) {
      console.error("Error fetching programmes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get(
  "/programmes/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;

    try {
      const programme = await prisma.programme.findUnique({
        where: { id },
        include: {
          exercises: {
            include: {
              exercise: true,
            },
            orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
          },
        },
      });

      if (!programme) {
        return res.status(404).json({ error: "Programme not found" });
      }

      res.json(programme);
    } catch (error) {
      console.error("Error fetching programme:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/programmes",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const {
      name,
      daysPerWeek,
      weeks,
      bodyPartFocus,
      progressionFocus,
      description,
    } = req.body;
    const userId = (req as any).user?.userId;

    if (!name || !daysPerWeek || !weeks || !bodyPartFocus) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const resolvedProgressionFocus =
      progressionFocus === "STRENGTH" ? "STRENGTH" : "MUSCLE_BUILDING";

    if (
      resolvedProgressionFocus === "STRENGTH" &&
      Number(weeks) % 4 !== 0
    ) {
      return res.status(400).json({
        error: "Strength programmes must use a week count that is a multiple of 4.",
      });
    }

    try {
      const programme = await prisma.programme.create({
        data: {
          name,
          daysPerWeek,
          weeks,
          bodyPartFocus,
          progressionFocus: resolvedProgressionFocus,
          description,
         // isCustom: true, // Mark as custom
         // userId: userId, // Associate with the user
        },
      });

      res.status(201).json(programme);
    } catch (error) {
      console.error("Error creating programme:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.put(
  "/programmes/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const {
      name,
      daysPerWeek,
      weeks,
      bodyPartFocus,
      progressionFocus,
      description,
    } = req.body;

    const allowedProgressionFocuses = ["MUSCLE_BUILDING", "STRENGTH"];
    if (
      progressionFocus &&
      !allowedProgressionFocuses.includes(progressionFocus)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid progressionFocus value" });
    }

    try {
      const existingProgramme = await prisma.programme.findUnique({
        where: { id },
        select: { progressionFocus: true },
      });

      if (!existingProgramme) {
        return res.status(404).json({ error: "Programme not found" });
      }

      const effectiveProgressionFocus =
        progressionFocus || existingProgramme.progressionFocus;

      if (
        effectiveProgressionFocus === "STRENGTH" &&
        weeks !== undefined &&
        Number(weeks) % 4 !== 0
      ) {
        return res.status(400).json({
          error: "Strength programmes must use a week count that is a multiple of 4.",
        });
      }

      const updated = await prisma.programme.update({
        where: { id },
        data: {
          name,
          daysPerWeek,
          weeks,
          bodyPartFocus,
          progressionFocus,
          description,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating programme:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/programmes/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;

    try {
      await prisma.programme.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting programme:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/random", authenticateToken, async (req, res): Promise<any> => {
  const focus = req.query.focus as string;

  if (!focus) {
    return res.status(400).json({ error: "Missing focus parameter" });
  }

  try {
    const exercises = await prisma.exercise.findMany({
      where: {
        muscleGroup: {
          equals: focus,
        },
      },
    });

    if (exercises.length === 0) {
      return res
        .status(404)
        .json({ error: "No exercises found for this focus" });
    }

    const random = exercises[Math.floor(Math.random() * exercises.length)];
    res.json(random);
  } catch (err) {
    console.error("Failed to fetch random exercise", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/programmes/:programmeId/exercises
router.post(
  "/programmes/:programmeId/exercises",
  authenticateToken,
  async (req, res): Promise<any> => {
    const { programmeId } = req.params;
    const { exerciseId, dayNumber, sets, reps, strengthRole } = req.body;

    if (!exerciseId || !dayNumber) {
      return res
        .status(400)
        .json({ error: "exerciseId and dayNumber are required" });
    }

    try {
      const programme = await prisma.programme.findUnique({
        where: { id: programmeId },
        select: { progressionFocus: true },
      });

      if (!programme) {
        return res.status(404).json({ error: "Programme not found" });
      }

      if (
        typeof strengthRole === "string" &&
        !STRENGTH_ROLES.includes(strengthRole as StrengthRole)
      ) {
        return res.status(400).json({ error: "Invalid strengthRole value" });
      }

      const existingDayExerciseCount = await prisma.programmeExercise.count({
        where: {
          programmeId,
          dayNumber: Number(dayNumber),
        },
      });

      const newProgrammeExercise = await prisma.programmeExercise.create({
        data: {
          programmeId,
          exerciseId,
          dayNumber: Number(dayNumber),
          sets: sets ?? 3,
          reps: reps ?? "10",
          orderIndex: existingDayExerciseCount,
          strengthRole:
            programme.progressionFocus === "STRENGTH"
              ? resolveStrengthRole(strengthRole, existingDayExerciseCount)
              : "ACCESSORY",
        },
      });

      return res.status(201).json(newProgrammeExercise);
    } catch (err) {
      console.error("Error adding programme exercise:", err);
      return res.status(500).json({ error: "Failed to add exercise" });
    }
  },
);

// routes/programmeRoutes.ts
router.delete(
  "/exercises/:id",
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;

    try {
      await prisma.programmeExercise.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (err) {
      console.error("Error deleting programme exercise:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// GET /auth/exercises/random?focus=Lower%20Body

router.get(
  "/exercises/random",
  authenticateToken,
  async (req, res): Promise<any> => {
    const { focus } = req.query;

    try {
      const matchingExercises = await prisma.exercise.findMany({
        where: {
          muscleGroup: {
            equals: focus as string,
          },
        },
      });

      if (matchingExercises.length === 0) {
        return res
          .status(404)
          .json({ error: "No exercises found for that focus" });
      }

      const randomIndex = Math.floor(Math.random() * matchingExercises.length);
      const randomExercise = matchingExercises[randomIndex];

      return res.json(randomExercise);
    } catch (err) {
      console.error("Error fetching random exercise:", err);
      return res.status(500).json({ error: "Failed to get random exercise" });
    }
  },
);

// Add these endpoints to your auth.ts file

// GET /auth/exercises - Get exercises by muscle group
router.get(
  "/exercises",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { muscleGroup, category, equipment } = req.query;

    try {
      const whereClause: any = {};

      // Note: Prisma client in this environment doesn't support the `mode` option
      // on string filters (case-insensitive). Use exact equals matching because
      // the frontend maps to the seeded `muscleGroup` values (e.g. 'Lats', 'Chest').
      if (muscleGroup) {
        whereClause.muscleGroup = {
          equals: muscleGroup as string,
        };
      }

      if (category) {
        whereClause.category = {
          equals: category as string,
        };
      }

      if (equipment) {
        whereClause.equipment = {
          equals: equipment as string,
        };
      }

      console.debug(
        "GET /auth/exercises whereClause:",
        JSON.stringify(whereClause),
      );

      const exercises = await prisma.exercise.findMany({
        where: whereClause,
        orderBy: {
          name: "asc",
        },
      });

      res.json(exercises);
    } catch (error) {
      // error may be unknown; prefer Error stack when available
      console.error(
        "Error fetching exercises:",
        error instanceof Error ? error.stack : (error as any),
      );
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /auth/exercises/all - Get all exercises
router.get(
  "/exercises/all",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const exercises = await prisma.exercise.findMany({
        orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
      });

      res.json(exercises);
    } catch (error) {
      console.error("Error fetching all exercises:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /auth/exercises - Create new exercise (for admin use)
router.post(
  "/exercises",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { name, muscleGroup, category, equipment, instructions } = req.body;

    if (!name || !muscleGroup || !category) {
      return res
        .status(400)
        .json({ error: "Name, muscleGroup, and category are required" });
    }

    try {
      const exercise = await prisma.exercise.create({
        data: {
          name,
          muscleGroup,
          category,
          equipment,
          instructions,
        },
      });

      res.status(201).json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /auth/muscle-groups - Get all unique muscle groups
router.get(
  "/muscle-groups",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const result = await prisma.exercise.findMany({
        select: {
          muscleGroup: true,
        },
        distinct: ["muscleGroup"],
        orderBy: {
          muscleGroup: "asc",
        },
      });

      const muscleGroups = result.map((r) => r.muscleGroup);
      res.json(muscleGroups);
    } catch (error) {
      console.error("Error fetching muscle groups:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /auth/user-programs
router.post(
  "/user-programs",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { programmeId, startDate } = req.body;
    const userId = (req as any).user.userId;

    try {
      // Get programme details
      const programme = await prisma.programme.findUnique({
        where: { id: programmeId },
      });

      if (!programme) {
        return res.status(404).json({ error: "Programme not found" });
      }

      // Calculate current day and week based on start date
      const start = new Date(startDate);
      const currentDay = calculateCurrentDay(start, programme.daysPerWeek);
      const currentWeek = calculateCurrentWeek(start, programme.daysPerWeek);

      const userProgram = await prisma.userProgram.create({
        data: {
          userId,
          programmeId,
          startDate: start,
          currentDay,
          currentWeek,
          status: "ACTIVE",
        },
        include: {
          programme: {
            include: {
              exercises: {
                include: {
                  exercise: true,
                },
                orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
              },
            },
          },
        },
      });

      res.status(201).json(userProgram);
    } catch (error) {
      console.error("Error creating user program:", error);
      res.status(500).json({ error: "Failed to create user program" });
    }
  },
);

// Add this endpoint to your auth.ts file

// GET /auth/user-programs - Get user's programmes
router.get(
  "/user-programs",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      const userPrograms = await prisma.userProgram.findMany({
        where: { userId },
        include: {
          programme: {
            include: {
              exercises: {
                include: {
                  exercise: true,
                },
                orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // NOTE: Removed automatic recalculation of currentDay/currentWeek based on date
      // These should only be updated when workouts are completed, not on every fetch
      res.json(userPrograms);
    } catch (error) {
      console.error("Error fetching user programs:", error);
      res.status(500).json({ error: "Failed to fetch user programs" });
    }
  },
);

// POST /auth/workouts - Save completed workout with progression calculation
router.post(
  "/workouts",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const {
      exercises,
      duration,
      notes,
      programmeUpdates,
      perceivedDifficulty,
      startRecovery,
      temporaryRecoveryAdjustmentActive,
    } = req.body;

    if (!exercises || !Array.isArray(exercises)) {
      return res.status(400).json({ error: "Exercises data is required" });
    }

    const programmeExerciseUpdates: Array<{
      exerciseId: string;
      sets: number;
      reps: string;
      orderIndex: number;
      notes?: string;
      strengthRole?: StrengthRole;
    }> = Array.isArray(programmeUpdates) ? programmeUpdates : [];

    try {
      // Validate exercise data
      const workoutData: WorkoutData[] = exercises.map((exercise: any) => {
        if (
          !exercise.exerciseId ||
          !exercise.sets ||
          !Array.isArray(exercise.sets)
        ) {
          throw new Error(
            `Invalid exercise data for exercise ${exercise.exerciseId}`,
          );
        }

        return {
          exerciseId: exercise.exerciseId,
          sets: exercise.sets.map((set: any) => ({
            weight: parseFloat(set.weight) || 0,
            reps: parseInt(set.reps) || 0,
            targetReps:
              set.targetReps !== undefined && set.targetReps !== null
                ? parseInt(set.targetReps, 10) || undefined
                : undefined,
            rpe: set.rpe ? parseInt(set.rpe) : undefined,
            completed: set.completed !== false, // default to true if not specified
            isDropSet: Boolean(set.isDropSet),
            dropSetGroupId: set.dropSetGroupId,
          })),
        };
      });

      // Persist programme changes from today's workout so future weeks follow the current layout
      if (programmeExerciseUpdates.length > 0) {
        const recoveryAdjustmentStatus = await getRecoveryAdjustmentStatus(userId);
        const userProgram = await prisma.userProgram.findFirst({
          where: { userId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        });

        if (userProgram) {
          const currentDay = userProgram.currentDay;
          const parentProgramme = await prisma.programme.findUnique({
            where: { id: userProgram.programmeId },
            select: { progressionFocus: true },
          });

          if (!parentProgramme) {
            throw new Error("Active programme not found");
          }

          const isStrengthProgramme =
            parentProgramme.progressionFocus === "STRENGTH";

          const existingProgrammeExercises = await prisma.programmeExercise.findMany({
            where: {
              programmeId: userProgram.programmeId,
              dayNumber: currentDay,
            },
          });

          const requestedExerciseIds = programmeExerciseUpdates
            .map((update) => update.exerciseId)
            .filter(Boolean);

          const idsToDelete = existingProgrammeExercises
            .filter(
              (existing) => !requestedExerciseIds.includes(existing.exerciseId),
            )
            .map((existing) => existing.id);

          if (idsToDelete.length > 0) {
            await prisma.programmeExercise.deleteMany({
              where: { id: { in: idsToDelete } },
            });
          }

          for (const update of programmeExerciseUpdates) {
            if (!update.exerciseId || update.sets <= 0) {
              continue;
            }

            if (
              update.strengthRole &&
              !STRENGTH_ROLES.includes(update.strengthRole)
            ) {
              throw new Error(`Invalid strengthRole for exercise ${update.exerciseId}`);
            }

            const existing = existingProgrammeExercises.find(
              (exercise) => exercise.exerciseId === update.exerciseId,
            );

            if (existing) {
              await prisma.programmeExercise.update({
                where: { id: existing.id },
                data: {
                  sets:
                    temporaryRecoveryAdjustmentActive ||
                    recoveryAdjustmentStatus.isActive
                      ? Math.max(update.sets, existing.sets)
                      : update.sets,
                  reps: update.reps,
                  orderIndex: update.orderIndex,
                  notes: mergeProgrammeExerciseNotes(
                    existing.notes,
                    update.notes || null,
                  ),
                  strengthRole:
                    isStrengthProgramme && update.strengthRole
                      ? update.strengthRole
                      : existing.strengthRole,
                },
              });
            } else {
              await prisma.programmeExercise.create({
                data: {
                  programmeId: userProgram.programmeId,
                  exerciseId: update.exerciseId,
                  dayNumber: currentDay,
                  orderIndex: update.orderIndex,
                  sets: update.sets,
                  reps: update.reps,
                  notes: mergeProgrammeExerciseNotes(
                    null,
                    update.notes || null,
                  ),
                  isSelected: true,
                  strengthRole:
                    isStrengthProgramme
                      ? resolveStrengthRole(
                          update.strengthRole,
                          update.orderIndex,
                        )
                      : "ACCESSORY",
                },
              });
            }
          }
        }
      }

      // Save workout and get recommendations
      const result =
        await ProgressiveOverloadService.saveWorkoutAndCalculateProgression(
          userId,
          workoutData,
        );

      const streak = await RollingWindowStreakService.onWorkoutLogged(userId);

      let normalizedPerceivedDifficulty: number | null = null;
      if (perceivedDifficulty !== undefined && perceivedDifficulty !== null) {
        const parsedDifficulty = parseInt(perceivedDifficulty, 10);
        if (
          !Number.isInteger(parsedDifficulty) ||
          parsedDifficulty < 1 ||
          parsedDifficulty > 10
        ) {
          return res.status(400).json({
            error: "perceivedDifficulty must be an integer between 1 and 10",
          });
        }
        normalizedPerceivedDifficulty = parsedDifficulty;
      }

      let normalizedStartRecovery: WorkoutRecoveryOption | null = null;
      if (typeof startRecovery === "string") {
        const candidate = startRecovery.toUpperCase() as WorkoutRecoveryOption;
        if (!WORKOUT_RECOVERY_OPTIONS.includes(candidate)) {
          return res.status(400).json({
            error: "startRecovery must be one of FRESH, NORMAL, STILL_TIRED",
          });
        }
        normalizedStartRecovery = candidate;
      }

      // Update workout with duration/notes and optional readiness feedback.
      // Keep this resilient if a local DB hasn't yet applied the feedback migration.
      const workoutUpdateData: any = {};
      if (duration !== undefined && duration !== null) {
        workoutUpdateData.duration = parseInt(duration, 10);
      }
      if (notes !== undefined) {
        workoutUpdateData.notes = notes || null;
      }
      if (normalizedPerceivedDifficulty !== null) {
        workoutUpdateData.perceivedDifficulty = normalizedPerceivedDifficulty;
      }
      if (normalizedStartRecovery !== null) {
        workoutUpdateData.startRecovery = normalizedStartRecovery;
      }

      if (Object.keys(workoutUpdateData).length > 0) {
        try {
          await prisma.workout.update({
            where: { id: result.workoutId },
            data: workoutUpdateData,
            select: { id: true },
          });
        } catch (updateError: any) {
          const message = String(updateError?.message || "").toLowerCase();
          const feedbackFieldFailure =
            message.includes("perceived_difficulty") ||
            message.includes("start_recovery") ||
            message.includes("perceiveddifficulty") ||
            message.includes("startrecovery");

          if (!feedbackFieldFailure) {
            throw updateError;
          }

          delete workoutUpdateData.perceivedDifficulty;
          delete workoutUpdateData.startRecovery;

          if (Object.keys(workoutUpdateData).length > 0) {
            await prisma.workout.update({
              where: { id: result.workoutId },
              data: workoutUpdateData,
              select: { id: true },
            });
          }
        }
      }

      console.log(
        `✅ Workout saved for user ${userId}, workout ID: ${result.workoutId}`,
      );

      res.json({
        workoutId: result.workoutId,
        recommendations: result.recommendations,
        weeklySummary: result.weeklySummary,
        streak,
        message: "Workout saved successfully",
      });
    } catch (error) {
      console.error("❌ Error saving workout:", error);
      res.status(500).json({
        error: "Failed to save workout",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

router.patch(
  "/workouts/:workoutId/feedback",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const { workoutId } = req.params;
    const { perceivedDifficulty, startRecovery } = req.body;

    const parsedDifficulty = parseInt(perceivedDifficulty, 10);
    if (
      !Number.isInteger(parsedDifficulty) ||
      parsedDifficulty < 1 ||
      parsedDifficulty > 10
    ) {
      return res.status(400).json({
        error: "perceivedDifficulty must be an integer between 1 and 10",
      });
    }

    if (typeof startRecovery !== "string") {
      return res.status(400).json({
        error: "startRecovery must be one of FRESH, NORMAL, STILL_TIRED",
      });
    }

    const normalizedStartRecovery =
      startRecovery.toUpperCase() as WorkoutRecoveryOption;
    if (!WORKOUT_RECOVERY_OPTIONS.includes(normalizedStartRecovery)) {
      return res.status(400).json({
        error: "startRecovery must be one of FRESH, NORMAL, STILL_TIRED",
      });
    }

    try {
      const workout = await prisma.workout.findFirst({
        where: {
          id: workoutId,
          userProgram: {
            userId,
          },
        },
        select: { id: true, notes: true },
      });

      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }

      const currentNotes = parseWorkoutNotesEnvelope(workout.notes);
      const mergedNotes: WorkoutNotesEnvelope = {
        text: currentNotes.text,
        meta: {
          ...currentNotes.meta,
          feedback: {
            perceivedDifficulty: parsedDifficulty,
            startRecovery: normalizedStartRecovery,
          },
        },
      };
      const serializedNotes = serializeWorkoutNotesEnvelope(mergedNotes);

      try {
        await prisma.workout.update({
          where: { id: workout.id },
          data: {
            perceivedDifficulty: parsedDifficulty,
            startRecovery: normalizedStartRecovery,
            notes: serializedNotes,
          } as any,
          select: { id: true },
        });
      } catch (updateError: any) {
        const message = String(updateError?.message || "").toLowerCase();
        const feedbackFieldFailure =
          message.includes("perceived_difficulty") ||
          message.includes("start_recovery") ||
          message.includes("perceiveddifficulty") ||
          message.includes("startrecovery");

        if (!feedbackFieldFailure) {
          throw updateError;
        }

        await prisma.workout.update({
          where: { id: workout.id },
          data: {
            notes: serializedNotes,
          },
          select: { id: true },
        });
      }

      const recentWorkouts = await prisma.workout.findMany({
        where: {
          userProgram: {
            userId,
          },
        },
        orderBy: {
          completedAt: "desc",
        },
        take: Math.max(HIGH_FATIGUE_STREAK_THRESHOLD, LOW_EFFORT_STREAK_THRESHOLD),
        select: {
          notes: true,
          exercises: {
            select: {
              sets: {
                select: {
                  reps: true,
                  targetReps: true,
                  completed: true,
                  notes: true,
                },
              },
            },
          },
        },
      });

      const recoveryStreakCount = countConsecutiveHighFatigueFeedback(
        recentWorkouts,
      );
      const easyProgressStreakCount = countConsecutiveEasyProgressWorkouts(
        recentWorkouts,
      );
      const performanceStreak = await hasExerciseUnderperformanceStreak(
        userId,
        MISSED_TARGET_REP_STREAK_THRESHOLD,
      );
      const overperformingExercises = await findExercisesWithOverperformanceStreak(
        userId,
        EXERCISE_OVERPERFORMANCE_STREAK_THRESHOLD,
      );
      const recoveryAdjustmentStatus = await getRecoveryAdjustmentStatus(userId);
      const activeExerciseOverrides =
        recoveryAdjustmentStatus.activeExerciseOverperformanceAdjustments || [];
      const hasActiveMissedTargetOverride =
        Boolean(performanceStreak.exerciseId) &&
        typeof performanceStreak.dayNumber === "number" &&
        activeExerciseOverrides.some(
          (override) =>
            override.exerciseId === performanceStreak.exerciseId &&
            override.dayNumber === performanceStreak.dayNumber &&
            override.multiplier < 1,
        );
      const filteredOverperformingExercises = overperformingExercises.filter(
        (exercise) =>
          !activeExerciseOverrides.some(
            (override) =>
              override.exerciseId === exercise.exerciseId &&
              override.dayNumber === exercise.dayNumber &&
              override.multiplier > 1,
          ),
      );
      const adjustmentTriggerType =
        performanceStreak.hasStreak
          ? "MISSED_TARGETS"
          : recoveryStreakCount >= HIGH_FATIGUE_STREAK_THRESHOLD
            ? "FATIGUE"
            : easyProgressStreakCount >= LOW_EFFORT_STREAK_THRESHOLD
              ? "EASY_PROGRESS"
              : null;
      const shouldSuggestAdjustments =
        adjustmentTriggerType !== null &&
        (adjustmentTriggerType === "MISSED_TARGETS"
          ? !hasActiveMissedTargetOverride
          : !recoveryAdjustmentStatus.isActive);

      // Exercise overperformance suggestions are independent of programme-wide triggers.
      // They can appear alongside or instead of programme-wide adjustments.
      const shouldSuggestExerciseIncrease =
        filteredOverperformingExercises.length > 0;

      return res.json({
        message: "Workout feedback saved",
        recoveryStreakCount,
        easyProgressStreakCount,
        missedTargetRepStreak: performanceStreak.hasStreak,
        underperformingExerciseId: performanceStreak.exerciseId,
        underperformingExerciseName: performanceStreak.exerciseName,
        adjustmentTriggerType,
        shouldSuggestAdjustments,
        shouldSuggestExerciseIncrease,
        overperformingExercises: filteredOverperformingExercises,
      });
    } catch (error) {
      console.error("❌ Error saving workout feedback:", error);
      return res.status(500).json({
        error: "Failed to save workout feedback",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

router.post(
  "/workouts/recovery-adjustments/apply",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const {
      workoutId,
      triggerType,
      targetExerciseId,
      targetExerciseName,
      // Array of exercise objects for EXERCISE_OVERPERFORMANCE
      exerciseAdjustments,
    } = req.body || {};

    try {
      const activeProgram = await prisma.userProgram.findFirst({
        where: {
          userId,
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          programmeId: true,
          programme: {
            select: {
              daysPerWeek: true,
            },
          },
        },
      });

      if (!activeProgram) {
        return res.status(404).json({ error: "No active programme found" });
      }

      const resolvedWorkout =
        typeof workoutId === "string"
          ? await prisma.workout.findFirst({
              where: {
                id: workoutId,
                userProgram: {
                  userId,
                },
              },
              select: {
                id: true,
                notes: true,
                dayNumber: true,
              },
            })
          : await prisma.workout.findFirst({
              where: {
                userProgram: {
                  userId,
                },
              },
              orderBy: {
                completedAt: "desc",
              },
              select: {
                id: true,
                notes: true,
                dayNumber: true,
              },
            });

      if (!resolvedWorkout) {
        return res.status(404).json({ error: "No completed workout found" });
      }

      const normalizedTriggerType =
        triggerType === "MISSED_TARGETS"
          ? "MISSED_TARGETS"
          : triggerType === "EASY_PROGRESS"
            ? "EASY_PROGRESS"
            : triggerType === "EXERCISE_OVERPERFORMANCE"
              ? "EXERCISE_OVERPERFORMANCE"
              : "FATIGUE";

      // Handle one-time exercise overrides (missed targets / overperformance).
      if (
        normalizedTriggerType === "EXERCISE_OVERPERFORMANCE" ||
        normalizedTriggerType === "MISSED_TARGETS"
      ) {
        const validExercises: Array<{ exerciseId: string; exerciseName: string }> =
          normalizedTriggerType === "MISSED_TARGETS"
            ? typeof targetExerciseId === "string" &&
              typeof targetExerciseName === "string"
              ? [
                  {
                    exerciseId: targetExerciseId,
                    exerciseName: targetExerciseName,
                  },
                ]
              : []
            : Array.isArray(exerciseAdjustments)
              ? exerciseAdjustments.filter(
                  (e: any) =>
                    typeof e?.exerciseId === "string" &&
                    typeof e?.exerciseName === "string",
                )
              : [];

        if (validExercises.length === 0) {
          return res.status(400).json({ error: "No valid exercise adjustments provided" });
        }

        const multiplier =
          normalizedTriggerType === "MISSED_TARGETS"
            ? MISSED_TARGET_ONE_TIME_WEIGHT_MULTIPLIER
            : EXERCISE_OVERPERFORMANCE_WEIGHT_MULTIPLIER;

        const now = new Date().toISOString();
        const newAdjustments: ExerciseOneTimeOverride[] = validExercises.map((e) => ({
          exerciseId: e.exerciseId,
          exerciseName: e.exerciseName,
          multiplier,
          sessionsToAdjust: 1,
          appliedAt: now,
          triggerWorkoutId: resolvedWorkout.id,
          dayNumber: resolvedWorkout.dayNumber,
          programmeId: activeProgram.programmeId,
          triggerType: normalizedTriggerType,
        }));

        const parsedNotes = parseWorkoutNotesEnvelope(resolvedWorkout.notes);
        const nextNotes: WorkoutNotesEnvelope = {
          text: parsedNotes.text,
          meta: {
            ...parsedNotes.meta,
            exerciseOverperformanceAdjustments: [
              ...(parsedNotes.meta?.exerciseOverperformanceAdjustments ?? []),
              ...newAdjustments,
            ],
          },
        };

        await prisma.workout.update({
          where: { id: resolvedWorkout.id },
          data: { notes: serializeWorkoutNotesEnvelope(nextNotes) },
          select: { id: true },
        });

        return res.json({
          message:
            normalizedTriggerType === "MISSED_TARGETS"
              ? "One-time reduction override applied"
              : "Exercise overperformance adjustments applied",
          triggerType: normalizedTriggerType,
          exerciseAdjustments: newAdjustments.map((a) => ({
            exerciseId: a.exerciseId,
            exerciseName: a.exerciseName,
            multiplier: a.multiplier,
            sessionsRemaining: 1,
            dayNumber: a.dayNumber,
          })),
        });
      }

      const sessionsToAdjust =
        normalizedTriggerType === "EASY_PROGRESS"
          ? Math.max(activeProgram.programme.daysPerWeek || 3, 1)
          : Math.max(activeProgram.programme.daysPerWeek || 3, 1);

      const weightMultiplier =
        normalizedTriggerType === "EASY_PROGRESS"
          ? EASY_PROGRESS_WEIGHT_MULTIPLIER
          : RECOVERY_ADJUSTMENT_WEIGHT_MULTIPLIER;

      const setTarget =
        normalizedTriggerType === "EASY_PROGRESS"
          ? undefined
          : RECOVERY_ADJUSTMENT_SET_TARGET;

      const parsedNotes = parseWorkoutNotesEnvelope(resolvedWorkout.notes);
      const nextNotes: WorkoutNotesEnvelope = {
        text: parsedNotes.text,
        meta: {
          ...parsedNotes.meta,
          recoveryAdjustment: {
            triggerType: normalizedTriggerType,
            sessionsToAdjust,
            setTarget,
            weightMultiplier,
            appliedAt: new Date().toISOString(),
            triggerWorkoutId: resolvedWorkout.id,
            targetExerciseId: undefined,
            targetExerciseName: undefined,
          },
        },
      };

      await prisma.workout.update({
        where: { id: resolvedWorkout.id },
        data: {
          notes: serializeWorkoutNotesEnvelope(nextNotes),
        },
        select: { id: true },
      });

      return res.json({
        message: "Recovery adjustments applied",
        sessionsToAdjust,
        sessionsRemaining: sessionsToAdjust,
        setTarget,
        weightMultiplier,
        triggerType: normalizedTriggerType,
        targetExerciseId: undefined,
        targetExerciseName: undefined,
      });
    } catch (error) {
      console.error("❌ Error applying recovery adjustments:", error);
      return res.status(500).json({
        error: "Failed to apply recovery adjustments",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

router.get(
  "/workouts/recovery-adjustments/status",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    try {
      const status = await getRecoveryAdjustmentStatus(userId);
      return res.json(status);
    } catch (error) {
      console.error("❌ Error getting recovery adjustment status:", error);
      return res.status(500).json({
        error: "Failed to get recovery adjustment status",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// GET /auth/streak - Get rolling window streak status and apply expiry checks
router.get(
  "/streak",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      const streak = await RollingWindowStreakService.getStatus(userId);
      res.json(streak);
    } catch (error) {
      console.error("❌ Error getting streak status:", error);
      res.status(500).json({
        error: "Failed to get streak status",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// PATCH /auth/streak/goal - Update workouts-per-window streak goal
router.patch(
  "/streak/goal",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const parsedGoal = parseInt(req.body?.streakGoal, 10);

    if (!Number.isInteger(parsedGoal) || parsedGoal < 1 || parsedGoal > 14) {
      return res.status(400).json({
        error: "streakGoal must be an integer between 1 and 14",
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { current_window_workouts: true },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          streak_goal: parsedGoal,
          // Keep progress coherent when goal is lowered below current progress.
          current_window_workouts: Math.min(
            user.current_window_workouts,
            Math.max(parsedGoal - 1, 0),
          ),
        },
      });

      const streak = await RollingWindowStreakService.getStatus(userId);
      res.json(streak);
    } catch (error) {
      console.error("❌ Error updating streak goal:", error);
      res.status(500).json({
        error: "Failed to update streak goal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// GET /auth/workouts/recommendations?exerciseIds=id1,id2,id3 - Get progression recommendations
router.get(
  "/workouts/recommendations",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const exerciseIdsParam = req.query.exerciseIds as string;

    if (!exerciseIdsParam) {
      return res
        .status(400)
        .json({ error: "exerciseIds parameter is required" });
    }

    try {
      const exerciseIds = exerciseIdsParam.split(",").map((id) => id.trim());
      const setCountsParam = req.query.setCounts as string | undefined;
      const setCounts = setCountsParam
        ? setCountsParam.split(",").map((count) => parseInt(count, 10) || 3)
        : [];
      const setLayoutsParam = req.query.setLayouts as string | undefined;
      const setLayouts = setLayoutsParam
        ? JSON.parse(setLayoutsParam)
        : [];
      const dayNumberParam = req.query.dayNumber as string | undefined;
      const dayNumber = dayNumberParam ? parseInt(dayNumberParam, 10) : undefined;

      const recommendations =
        await ProgressiveOverloadService.getProgressionRecommendations(
          userId,
          exerciseIds,
          setCounts,
          setLayouts,
        );

      const recoveryAdjustmentStatus = await getRecoveryAdjustmentStatus(userId);

      // Apply per-exercise overperformance multipliers (only if on the correct day)
      let processedRecommendations = recommendations;
      if (recoveryAdjustmentStatus.activeExerciseOverperformanceAdjustments.length > 0) {
        processedRecommendations = recommendations.map((rec) => {
          const adj = recoveryAdjustmentStatus.activeExerciseOverperformanceAdjustments.find(
            (a) => a.exerciseId === rec.exerciseId && a.dayNumber === dayNumber,
          );
          if (!adj || adj.multiplier === 1) return rec;

          const changePct = Math.abs((adj.multiplier - 1) * 100);
          const changeDirection = adj.multiplier >= 1 ? "increase" : "reduction";
          return {
            ...rec,
            recommendedWeight: Math.round(rec.recommendedWeight * adj.multiplier * 10) / 10,
            setRecommendations: (rec.setRecommendations || []).map((s) => ({
              ...s,
              recommendedWeight: Math.round(s.recommendedWeight * adj.multiplier * 10) / 10,
            })),
            reasoning: `${rec.reasoning} One-time exercise override applied (${changePct.toFixed(0)}% load ${changeDirection} for the next matching workout).`,
          };
        });
      }

      if (!recoveryAdjustmentStatus.isActive) {
        return res.json({ recommendations: processedRecommendations });
      }

      const adjustedRecommendations = processedRecommendations.map((recommendation) => {
        const matchesScope =
          !recoveryAdjustmentStatus.targetExerciseId ||
          recoveryAdjustmentStatus.targetExerciseId === recommendation.exerciseId;
        const multiplier = recoveryAdjustmentStatus.weightMultiplier;
        if (multiplier === 1 || !matchesScope) {
          return recommendation;
        }

        const adjustedSetRecommendations = (recommendation.setRecommendations || []).map(
          (setRecommendation) => ({
            ...setRecommendation,
            recommendedWeight:
              Math.round(setRecommendation.recommendedWeight * multiplier * 10) /
              10,
          }),
        );

        const changePct = Math.abs((multiplier - 1) * 100);
        const changeDirection = multiplier >= 1 ? "increase" : "reduction";

        return {
          ...recommendation,
          recommendedWeight:
            Math.round(recommendation.recommendedWeight * multiplier * 10) / 10,
          setRecommendations: adjustedSetRecommendations,
          reasoning: `${recommendation.reasoning} Recovery adjustment applied (${changePct.toFixed(0)}% load ${changeDirection} for ${recoveryAdjustmentStatus.sessionsRemaining} remaining session(s)).`,
        };
      });

      res.json({ recommendations: adjustedRecommendations });
    } catch (error) {
      console.error("❌ Error getting recommendations:", error);
      res.status(500).json({
        error: "Failed to get recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// GET /auth/workouts/history/:exerciseId - Get workout history for specific exercise
router.get(
  "/workouts/by-day",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const weekNumber = parseInt(req.query.weekNumber as string, 10);
    const dayNumber = parseInt(req.query.dayNumber as string, 10);

    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      return res.status(400).json({ error: "weekNumber must be a positive integer" });
    }

    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      return res.status(400).json({ error: "dayNumber must be a positive integer" });
    }

    try {
      const activeProgram = await prisma.userProgram.findFirst({
        where: {
          userId,
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          programmeId: true,
        },
      });

      if (!activeProgram) {
        return res.status(404).json({ error: "No active programme found" });
      }

      const workout = await prisma.workout.findFirst({
        where: {
          userProgramId: activeProgram.id,
          weekNumber,
          dayNumber,
        },
        orderBy: {
          completedAt: "desc",
        },
        select: {
          id: true,
          weekNumber: true,
          dayNumber: true,
          completedAt: true,
          duration: true,
          notes: true,
          exercises: {
            orderBy: {
              orderIndex: "asc",
            },
            select: {
              id: true,
              orderIndex: true,
              exerciseId: true,
              exercise: {
                select: {
                  name: true,
                  muscleGroup: true,
                },
              },
              sets: {
                orderBy: {
                  setNumber: "asc",
                },
                select: {
                  setNumber: true,
                  weight: true,
                  reps: true,
                  targetReps: true,
                  completed: true,
                  notes: true,
                },
              },
            },
          },
        },
      });

      if (!workout) {
        return res.status(404).json({ error: "No saved workout found for that day" });
      }

      const exercises = workout.exercises.map((exercise) => ({
        id: exercise.id,
        orderIndex: exercise.orderIndex,
        exerciseId: exercise.exerciseId,
        name: exercise.exercise.name,
        muscleGroup: exercise.exercise.muscleGroup,
        sets: exercise.sets.map((set) => {
          let setType: "main" | "drop" = "main";
          let dropSetGroupId: string | undefined;

          if (set.notes) {
            try {
              const parsed = JSON.parse(set.notes);
              setType = parsed?.type === "drop" ? "drop" : "main";
              dropSetGroupId = parsed?.groupId;
            } catch {
              setType = "main";
            }
          }

          return {
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            targetReps: set.targetReps,
            completed: set.completed,
            setType,
            dropSetGroupId,
          };
        }),
      }));

      return res.json({
        workout: {
          id: workout.id,
          weekNumber: workout.weekNumber,
          dayNumber: workout.dayNumber,
          completedAt: workout.completedAt,
          duration: workout.duration,
          notes: workout.notes,
          exercises,
        },
      });
    } catch (error) {
      console.error("❌ Error getting workout by day:", error);
      return res.status(500).json({
        error: "Failed to fetch workout by day",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// GET /auth/workouts/history/:exerciseId - Get workout history for specific exercise
router.get(
  "/workouts/history/:exerciseId",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const { exerciseId } = req.params;
    const parsedLimit = parseInt(req.query.limit as string, 10);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 50)
      : 10;

    if (!exerciseId) {
      return res.status(400).json({ error: "exerciseId is required" });
    }

    try {
      const workoutHistory = await prisma.workoutSet.findMany({
        where: {
          workoutExercise: {
            exerciseId,
            workout: {
              userProgram: {
                userId,
              },
            },
          },
        },
        include: {
          workoutExercise: {
            include: {
              exercise: {
                select: {
                  name: true,
                  muscleGroup: true,
                },
              },
              workout: {
                select: {
                  completedAt: true,
                  weekNumber: true,
                  dayNumber: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit * 5, // Approximate sets per workout
      });

      // Group by workout session
      const groupedHistory = workoutHistory.reduce((acc: any, set) => {
        let setType: "main" | "drop" = "main";
        let dropSetGroupId: string | undefined;
        if (set.notes) {
          try {
            const parsed = JSON.parse(set.notes);
            setType = parsed?.type === "drop" ? "drop" : "main";
            dropSetGroupId = parsed?.groupId;
          } catch {
            setType = "main";
          }
        }

        const workoutId = set.workoutExercise.id;
        if (!acc[workoutId]) {
          acc[workoutId] = {
            date: set.workoutExercise.workout.completedAt,
            weekNumber: set.workoutExercise.workout.weekNumber,
            dayNumber: set.workoutExercise.workout.dayNumber,
            exercise: {
              name: set.workoutExercise.exercise.name,
              muscleGroup: set.workoutExercise.exercise.muscleGroup,
            },
            sets: [],
          };
        }
        acc[workoutId].sets.push({
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe,
          completed: set.completed,
          setType,
          dropSetGroupId,
        });
        return acc;
      }, {});

      const history = Object.values(groupedHistory)
        .slice(0, limit)
        .map((entry: any) => {
          const firstIndexByGroup = new Map<string, number>();
          const normalizedSets = [...entry.sets]
            .sort((a, b) => a.setNumber - b.setNumber)
            .map((set, index) => {
              if (!set.dropSetGroupId) {
                return set;
              }

              if (firstIndexByGroup.has(set.dropSetGroupId)) {
                return {
                  ...set,
                  setType: "drop",
                };
              }

              firstIndexByGroup.set(set.dropSetGroupId, index);
              return set;
            });

          return {
            ...entry,
            sets: normalizedSets,
          };
        });

      res.json({ history });
    } catch (error) {
      console.error("❌ Error getting workout history:", error);
      res.status(500).json({
        error: "Failed to get workout history",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// GET /auth/workouts/stats/:exerciseId - Get performance stats for exercise
router.get(
  "/workouts/stats/:exerciseId",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const { exerciseId } = req.params;

    try {
      const allSets = await prisma.workoutSet.findMany({
        where: {
          workoutExercise: {
            exerciseId,
            workout: {
              userProgram: {
                userId,
              },
            },
          },
          completed: true,
        },
        include: {
          workoutExercise: {
            include: {
              exercise: {
                select: {
                  name: true,
                  muscleGroup: true,
                },
              },
              workout: {
                select: {
                  completedAt: true,
                },
              },
            },
          },
        },
        orderBy: {
          workoutExercise: {
            workout: {
              completedAt: "asc",
            },
          },
        },
      });

      if (allSets.length === 0) {
        return res.json({
          exerciseName: "Unknown",
          totalWorkouts: 0,
          totalSets: 0,
          totalVolume: 0,
          maxWeight: 0,
          maxReps: 0,
          maxVolume: 0,
          averageRpe: null,
          progressionData: [],
        });
      }

      // Calculate stats
      const totalSets = allSets.length;
      const totalVolume = allSets.reduce(
        (sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0),
        0,
      );
      const maxWeight = Math.max(...allSets.map((set) => set.weight ?? 0));
      const maxReps = Math.max(...allSets.map((set) => set.reps ?? 0));
      const maxVolume = Math.max(
        ...allSets.map((set) => (set.weight ?? 0) * (set.reps ?? 0)),
      );

      const setsWithRpe = allSets.filter((set) => set.rpe !== null);
      const averageRpe =
        setsWithRpe.length > 0
          ? setsWithRpe.reduce((sum, set) => sum + set.rpe!, 0) /
            setsWithRpe.length
          : null;

      // Group by workout for progression data (last 12 workouts)
      const workoutGroups = allSets.reduce((acc: any, set) => {
        const workoutDate = set.workoutExercise.workout.completedAt
          .toISOString()
          .split("T")[0];
        if (!acc[workoutDate]) {
          acc[workoutDate] = {
            date: workoutDate,
            sets: [],
          };
        }
        acc[workoutDate].sets.push(set);
        return acc;
      }, {});

      const progressionData = Object.values(workoutGroups)
        .slice(-12)
        .map((workout: any) => {
          const bestSet = workout.sets.reduce((best: any, current: any) => {
            const currentVolume = current.weight * current.reps;
            const bestVolume = best.weight * best.reps;
            return currentVolume > bestVolume ? current : best;
          });

          return {
            date: workout.date,
            maxWeight: Math.max(...workout.sets.map((s: any) => s.weight)),
            maxReps: Math.max(...workout.sets.map((s: any) => s.reps)),
            bestVolume: bestSet.weight * bestSet.reps,
            averageRpe:
              workout.sets.filter((s: any) => s.rpe).length > 0
                ? workout.sets.reduce(
                    (sum: number, s: any) => sum + (s.rpe || 0),
                    0,
                  ) / workout.sets.filter((s: any) => s.rpe).length
                : null,
          };
        });

      const uniqueWorkouts = new Set(
        allSets.map(
          (set) =>
            set.workoutExercise.workout.completedAt.toISOString().split("T")[0],
        ),
      ).size;

      res.json({
        exerciseName: allSets[0]?.workoutExercise.exercise.name || "Unknown",
        muscleGroup:
          allSets[0]?.workoutExercise.exercise.muscleGroup || "Unknown",
        totalWorkouts: uniqueWorkouts,
        totalSets,
        totalVolume,
        maxWeight,
        maxReps,
        maxVolume,
        averageRpe,
        progressionData,
      });
    } catch (error) {
      console.error("❌ Error getting workout stats:", error);
      res.status(500).json({
        error: "Failed to get workout stats",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// POST /auth/workouts/complete-day - Mark current day as complete and advance
router.post(
  "/workouts/complete-day",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      const userProgram = await prisma.userProgram.findFirst({
        where: {
          userId,
          status: "ACTIVE",
        },
        include: {
          programme: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!userProgram) {
        return res.status(404).json({ error: "No active program found" });
      }

      // Program advancement already happened in POST /workouts
      // Just return the current progress
      const currentDay = userProgram.currentDay;
      const currentWeek = userProgram.currentWeek;

      console.log(
        `✅ User ${userId} workout completed. Current: Week ${currentWeek}, Day ${currentDay}`,
      );

      res.json({
        currentWeek,
        currentDay,
        message: `Workout completed! Next session: Week ${currentWeek}, Day ${currentDay}`,
      });
    } catch (error) {
      console.error("❌ Error completing day:", error);
      res.status(500).json({
        error: "Failed to complete day",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// Add these endpoints to your auth.ts file

// PATCH /auth/user-programs/:id - Update user program status
router.patch(
  "/user-programs/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = (req as any).user.userId;

    try {
      // Verify this user program belongs to the user
      const userProgram = await prisma.userProgram.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!userProgram) {
        return res.status(404).json({ error: "User program not found" });
      }

      // Update status
      const updated = await prisma.userProgram.update({
        where: { id },
        data: {
          status,
          ...(status === "COMPLETED" || status === "CANCELLED"
            ? { endDate: new Date() }
            : {}),
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating user program:", error);
      res.status(500).json({ error: "Failed to update user program" });
    }
  },
);




router.delete(
  "/programmes/:programmeId/exercises/day/:dayNumber",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { programmeId, dayNumber } = req.params;

    try {
      console.log(
        `🗑️ Deleting all exercises for programme ${programmeId}, day ${dayNumber}`,
      );

      const deleted = await prisma.programmeExercise.deleteMany({
        where: {
          programmeId,
          dayNumber: parseInt(dayNumber),
        },
      });

      console.log(`✅ Deleted ${deleted.count} exercises`);

      res.json({
        success: true,
        deletedCount: deleted.count,
        message: `Deleted ${deleted.count} exercises from Day ${dayNumber}`,
      });
    } catch (error) {
      console.error("Error deleting day exercises:", error);
      res.status(500).json({ error: "Failed to delete exercises" });
    }
  },
);

router.patch(
  "/user-programs/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = (req as any).user.userId;

    try {
      // Verify this user program belongs to the user
      const userProgram = await prisma.userProgram.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!userProgram) {
        return res.status(404).json({ error: "User program not found" });
      }

      // Update status
      const updated = await prisma.userProgram.update({
        where: { id },
        data: {
          status,
          ...(status === "COMPLETED" || status === "CANCELLED"
            ? { endDate: new Date() }
            : {}),
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating user program:", error);
      res.status(500).json({ error: "Failed to update user program" });
    }
  },
);

// Add these endpoints to your auth.ts file

// PATCH /auth/user-programs/:id - Update user program status
router.patch(
  "/user-programs/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = (req as any).user.userId;

    try {
      // Verify this user program belongs to the user
      const userProgram = await prisma.userProgram.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!userProgram) {
        return res.status(404).json({ error: "User program not found" });
      }

      // Update status
      const updated = await prisma.userProgram.update({
        where: { id },
        data: {
          status,
          ...(status === "COMPLETED" || status === "CANCELLED"
            ? { endDate: new Date() }
            : {}),
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating user program:", error);
      res.status(500).json({ error: "Failed to update user program" });
    }
  },
);




// Add these endpoints to your auth.ts file

// DELETE /auth/programmes/:programmeId/exercises/day/:dayNumber - Delete all exercises for a specific day
router.delete(
  "/programmes/:programmeId/exercises/day/:dayNumber",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { programmeId, dayNumber } = req.params;

    try {
      console.log(
        `🗑️ Deleting all exercises for programme ${programmeId}, day ${dayNumber}`,
      );

      const deleted = await prisma.programmeExercise.deleteMany({
        where: {
          programmeId,
          dayNumber: parseInt(dayNumber),
        },
      });

      console.log(`✅ Deleted ${deleted.count} exercises`);

      res.json({
        success: true,
        deletedCount: deleted.count,
        message: `Deleted ${deleted.count} exercises from Day ${dayNumber}`,
      });
    } catch (error) {
      console.error("Error deleting day exercises:", error);
      res.status(500).json({ error: "Failed to delete exercises" });
    }
  },
);

// PATCH /auth/user-programs/:id - Update user program status
router.patch(
  "/user-programs/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = (req as any).user.userId;

    try {
      // Verify this user program belongs to the user
      const userProgram = await prisma.userProgram.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!userProgram) {
        return res.status(404).json({ error: "User program not found" });
      }

      // Update status
      const updated = await prisma.userProgram.update({
        where: { id },
        data: {
          status,
          ...(status === "COMPLETED" || status === "CANCELLED"
            ? { endDate: new Date() }
            : {}),
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating user program:", error);
      res.status(500).json({ error: "Failed to update user program" });
    }
  },
);

// Helper function to calculate current day based on start date
function calculateCurrentDay(startDate: Date, daysPerWeek: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const daysSinceStart = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Determine day index within the 7-day programme week (startDate relative). Cap to daysPerWeek.
  const dayIndex = daysSinceStart % 7;
  const currentDay = Math.min(dayIndex + 1, daysPerWeek);

  return currentDay;
}

// Helper function to calculate current week
function calculateCurrentWeek(startDate: Date, daysPerWeek: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const daysSinceStart = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Calculate current week based on fixed 7-day windows starting at programme start date
  const currentWeek = Math.floor(daysSinceStart / 7) + 1;

  return currentWeek;
}




// Add this endpoint to your auth.ts file

// GET /auth/workouts/weekly-stats - Get weekly workout statistics
router.get(
  "/workouts/weekly-stats",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      // Get active user program
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
        return res.json({
          workoutsCompleted: 0,
          workoutsTarget: 0,
          dailyStats: [],
          totalSets: 0,
          totalExercises: 0,
        });
      }

      // Calculate the start of the current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so Monday is start
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);

      // Get workouts from this week
      const workouts = await prisma.workout.findMany({
        where: {
          userProgramId: userProgram.id,
          completedAt: {
            gte: weekStart,
          },
        },
        include: {
          exercises: {
            include: {
              sets: {
                where: {
                  completed: true,
                },
              },
              exercise: true,
            },
          },
        },
        orderBy: {
          completedAt: "asc",
        },
      });

      // Create array for last 7 days
      const dailyStats = [];
      const dayNames = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);

        // Find workouts for this day
        const dayWorkouts = workouts.filter((w) => {
          const workoutDate = new Date(w.completedAt);
          return workoutDate.toDateString() === date.toDateString();
        });

        // Calculate stats for this day
        let sets = 0;
        const uniqueExercises = new Set<string>();

        dayWorkouts.forEach((workout) => {
          workout.exercises.forEach((exercise) => {
            sets += exercise.sets.length;
            uniqueExercises.add(exercise.exerciseId);
          });
        });

        dailyStats.push({
          date: date.toISOString(),
          dayName: dayNames[i],
          sets,
          exercises: uniqueExercises.size,
        });
      }

      // Calculate totals
      const totalSets = dailyStats.reduce((sum, day) => sum + day.sets, 0);
      const totalExercises = dailyStats.reduce(
        (sum, day) => sum + day.exercises,
        0,
      );

      // Count unique workout days (days with at least one set)
      const workoutsCompleted = dailyStats.filter((day) => day.sets > 0).length;
      const workoutsTarget = userProgram.programme.daysPerWeek;

      res.json({
        workoutsCompleted,
        workoutsTarget,
        dailyStats,
        totalSets,
        totalExercises,
      });
    } catch (error) {
      console.error("❌ Error fetching weekly stats:", error);
      res.status(500).json({
        error: "Failed to fetch weekly stats",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// Add these endpoints to your auth.ts file

// GET /auth/metrics/bodyweight - Get bodyweight history
router.get(
  "/metrics/bodyweight",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      const entries = await prisma.bodyweightEntry.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 50, // Last 50 entries
      });

      res.json(entries);
    } catch (error) {
      console.error("Error fetching bodyweight history:", error);
      res.status(500).json({ error: "Failed to fetch bodyweight history" });
    }
  },
);

// POST /auth/metrics/bodyweight - Add bodyweight entry
router.post(
  "/metrics/bodyweight",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const { weight } = req.body;

    if (!weight || weight <= 0) {
      return res.status(400).json({ error: "Valid weight is required" });
    }

    try {
      const entry = await prisma.bodyweightEntry.create({
        data: {
          userId,
          weight: parseFloat(weight),
          date: new Date(),
        },
      });

      // Also update user profile with latest weight
      await prisma.user.update({
        where: { id: userId },
        data: { bodyweight: parseFloat(weight) },
      });

      res.json(entry);
    } catch (error) {
      console.error("Error adding bodyweight entry:", error);
      res.status(500).json({ error: "Failed to add bodyweight entry" });
    }
  },
);

// GET /auth/metrics/bodyfat - Get body fat history
router.get(
  "/metrics/bodyfat",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      const entries = await prisma.bodyfatEntry.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 50, // Last 50 entries
      });

      res.json(entries);
    } catch (error) {
      console.error("Error fetching bodyfat history:", error);
      res.status(500).json({ error: "Failed to fetch bodyfat history" });
    }
  },
);

// POST /auth/metrics/bodyfat - Add body fat entry
router.post(
  "/metrics/bodyfat",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const { bodyfat } = req.body;

    if (!bodyfat || bodyfat <= 0 || bodyfat > 100) {
      return res
        .status(400)
        .json({ error: "Valid body fat percentage (0-100) is required" });
    }

    try {
      const entry = await prisma.bodyfatEntry.create({
        data: {
          userId,
          bodyfat: parseFloat(bodyfat),
          date: new Date(),
        },
      });

      res.json(entry);
    } catch (error) {
      console.error("Error adding bodyfat entry:", error);
      res.status(500).json({ error: "Failed to add bodyfat entry" });
    }
  },
);

// PUT /auth/metrics/bodyweight/:id - Update bodyweight entry
router.put(
  "/metrics/bodyweight/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { weight } = req.body;

    if (!weight || weight <= 0) {
      return res.status(400).json({ error: "Valid weight is required" });
    }

    try {
      // Verify ownership
      const entry = await prisma.bodyweightEntry.findUnique({
        where: { id },
      });

      if (!entry || entry.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedEntry = await prisma.bodyweightEntry.update({
        where: { id },
        data: {
          weight: parseFloat(weight),
        },
      });

      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating bodyweight entry:", error);
      res.status(500).json({ error: "Failed to update bodyweight entry" });
    }
  },
);

// DELETE /auth/metrics/bodyweight/:id - Delete bodyweight entry
router.delete(
  "/metrics/bodyweight/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    try {
      // Verify ownership
      const entry = await prisma.bodyweightEntry.findUnique({
        where: { id },
      });

      if (!entry || entry.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await prisma.bodyweightEntry.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting bodyweight entry:", error);
      res.status(500).json({ error: "Failed to delete bodyweight entry" });
    }
  },
);

// PUT /auth/metrics/bodyfat/:id - Update bodyfat entry
router.put(
  "/metrics/bodyfat/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { bodyfat } = req.body;

    if (!bodyfat || bodyfat <= 0 || bodyfat > 100) {
      return res
        .status(400)
        .json({ error: "Valid body fat percentage (0-100) is required" });
    }

    try {
      // Verify ownership
      const entry = await prisma.bodyfatEntry.findUnique({
        where: { id },
      });

      if (!entry || entry.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedEntry = await prisma.bodyfatEntry.update({
        where: { id },
        data: {
          bodyfat: parseFloat(bodyfat),
        },
      });

      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating bodyfat entry:", error);
      res.status(500).json({ error: "Failed to update bodyfat entry" });
    }
  },
);

// DELETE /auth/metrics/bodyfat/:id - Delete bodyfat entry
router.delete(
  "/metrics/bodyfat/:id",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    try {
      // Verify ownership
      const entry = await prisma.bodyfatEntry.findUnique({
        where: { id },
      });

      if (!entry || entry.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await prisma.bodyfatEntry.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting bodyfat entry:", error);
      res.status(500).json({ error: "Failed to delete bodyfat entry" });
    }
  },
);

// GET /auth/metrics/personal-records - Get personal records across all exercises
router.get(
  "/metrics/personal-records",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      // Get all completed workout sets for this user
      const workoutSets = await prisma.workoutSet.findMany({
        where: {
          completed: true,
          workoutExercise: {
            workout: {
              userProgram: {
                userId,
              },
            },
          },
        },
        include: {
          workoutExercise: {
            include: {
              exercise: true,
              workout: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // For each exercise, compute best recorded weight for reps 1,2,3,5,10
      const targets = [1, 2, 3, 5, 10];
      const exerciseMap = new Map<
        string,
        {
          exerciseId: string;
          exerciseName: string;
          muscleGroup: string;
          prs: Record<number, { weight: number; date: Date } | null>;
          predictedOneRepMax: {
            value: number;
            weight: number;
            reps: number;
            date: Date;
          } | null;
        }
      >();

      workoutSets.forEach((set) => {
        const exerciseId = set.workoutExercise.exerciseId;
        const exerciseName = set.workoutExercise.exercise.name;
        const muscleGroup = set.workoutExercise.exercise.muscleGroup;
        const weight = set.weight || 0;
        const reps = set.reps || 0;
        const date = set.workoutExercise.workout.completedAt;

        if (!exerciseMap.has(exerciseId)) {
          const prs: Record<number, { weight: number; date: Date } | null> = {
            1: null,
            2: null,
            3: null,
            5: null,
            10: null,
          };
          exerciseMap.set(exerciseId, {
            exerciseId,
            exerciseName,
            muscleGroup,
            prs,
            predictedOneRepMax: null,
          });
        }

        const record = exerciseMap.get(exerciseId)!;

        if (
          record.predictedOneRepMax === null &&
          reps > 0 &&
          reps <= 10 &&
          weight > 0
        ) {
          record.predictedOneRepMax = {
            value: Math.round(weight * (1 + reps / 30) * 10) / 10,
            weight,
            reps,
            date,
          };
        }

        if (targets.includes(reps)) {
          const existing = record.prs[reps as 1 | 2 | 3 | 5 | 10];
          if (!existing || weight > existing.weight) {
            record.prs[reps as 1 | 2 | 3 | 5 | 10] = { weight, date };
          }
        }
      });

      // Convert to array and sort by muscle group then exercise name
      const personalRecords = Array.from(exerciseMap.values())
        .map((r) => ({
          exerciseId: r.exerciseId,
          exerciseName: r.exerciseName,
          muscleGroup: r.muscleGroup,
          prs: r.prs,
          predictedOneRepMax: r.predictedOneRepMax,
        }))
        .sort((a, b) => {
          if (a.muscleGroup !== b.muscleGroup)
            return a.muscleGroup.localeCompare(b.muscleGroup);
          return a.exerciseName.localeCompare(b.exerciseName);
        });

      res.json(personalRecords);
    } catch (error) {
      console.error("Error fetching personal records:", error);
      res.status(500).json({ error: "Failed to fetch personal records" });
    }
  },
);

// POST /auth/suggest-reps - Calculate suggested reps using ensemble 1RM estimation
router.post(
  "/suggest-reps",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { lastWeight, lastReps, newWeight } = req.body;

    // Validate inputs
    if (
      typeof lastWeight !== "number" ||
      typeof lastReps !== "number" ||
      typeof newWeight !== "number"
    ) {
      return res.status(400).json({
        error: "lastWeight, lastReps, and newWeight must be numbers",
      });
    }

    if (lastWeight <= 0 || lastReps <= 0 || newWeight <= 0) {
      return res.status(400).json({
        error: "All values must be positive numbers",
      });
    }

    try {
      const suggestedReps = getSuggestedReps(lastWeight, lastReps, newWeight);

      res.json({
        suggestedReps,
        source: "ensemble-1rm-algorithm",
      });
    } catch (error) {
      console.error("Error calculating suggested reps:", error);
      res.status(500).json({
        error: "Failed to calculate suggested reps",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
