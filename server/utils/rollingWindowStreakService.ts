import { prisma } from "../prisma";

const RESET_THRESHOLD_DAYS = 10;
const COUNTDOWN_START_DAYS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_MILESTONES = [2, 4, 8, 12, 26, 52] as const;

type StreakState = {
  streak_count: number;
  streak_goal: number;
  current_window_start: Date | null;
  current_window_workouts: number;
  streak_freeze_available: boolean;
  last_workout_at: Date | null;
};

export type RollingWindowStreakStatus = {
  streakCount: number;
  streakGoal: number;
  currentWindowWorkouts: number;
  currentWindowStart: string | null;
  lastWorkoutAt: string | null;
  streakFreezeAvailable: boolean;
  freezeUsedOnCurrentStreak: boolean;
  showCountdown: boolean;
  countdownDaysRemaining: number | null;
  daysUntilExpiry: number | null;
  milestoneReached: boolean;
  milestoneWindowCount: number | null;
  milestoneWindows: number[];
  windowCompleted: boolean;
  freezeApplied: boolean;
  expiredReset: boolean;
};

function daysSinceDate(input: Date, now: Date): number {
  return (now.getTime() - input.getTime()) / DAY_MS;
}

function hasMonthChanged(previous: Date, now: Date): boolean {
  return (
    previous.getUTCFullYear() !== now.getUTCFullYear() ||
    previous.getUTCMonth() !== now.getUTCMonth()
  );
}

function getSelectedStreakFields() {
  return {
    streak_count: true,
    streak_goal: true,
    current_window_start: true,
    current_window_workouts: true,
    streak_freeze_available: true,
    last_workout_at: true,
  } as const;
}

function normalizeStreakGoal(daysPerWeek: number | null | undefined): number {
  if (!Number.isInteger(daysPerWeek) || !daysPerWeek) {
    return 3;
  }

  return Math.max(1, Math.min(14, daysPerWeek));
}

function serializeStatus(
  state: StreakState,
  now: Date,
  flags: {
    milestoneWindows: number[];
    windowCompleted: boolean;
    freezeApplied: boolean;
    expiredReset: boolean;
  },
): RollingWindowStreakStatus {
  const daysSinceLastWorkout = state.last_workout_at
    ? daysSinceDate(state.last_workout_at, now)
    : null;

  const daysUntilExpiry =
    daysSinceLastWorkout === null
      ? null
      : Math.max(0, Math.ceil(RESET_THRESHOLD_DAYS - daysSinceLastWorkout));

  const showCountdown =
    daysSinceLastWorkout !== null &&
    daysSinceLastWorkout > COUNTDOWN_START_DAYS &&
    daysSinceLastWorkout <= RESET_THRESHOLD_DAYS;

  return {
    streakCount: state.streak_count,
    streakGoal: state.streak_goal,
    currentWindowWorkouts: state.current_window_workouts,
    currentWindowStart: state.current_window_start
      ? state.current_window_start.toISOString()
      : null,
    lastWorkoutAt: state.last_workout_at
      ? state.last_workout_at.toISOString()
      : null,
    streakFreezeAvailable: state.streak_freeze_available,
    freezeUsedOnCurrentStreak:
      !state.streak_freeze_available && state.streak_count > 0,
    showCountdown,
    countdownDaysRemaining: showCountdown ? daysUntilExpiry : null,
    daysUntilExpiry,
    milestoneReached: flags.milestoneWindows.length > 0,
    milestoneWindowCount:
      flags.milestoneWindows.length > 0
        ? flags.milestoneWindows[flags.milestoneWindows.length - 1]
        : null,
    milestoneWindows: flags.milestoneWindows,
    windowCompleted: flags.windowCompleted,
    freezeApplied: flags.freezeApplied,
    expiredReset: flags.expiredReset,
  };
}

function applyMonthlyFreezeReset(state: StreakState, now: Date) {
  if (
    !state.streak_freeze_available &&
    state.last_workout_at &&
    hasMonthChanged(state.last_workout_at, now)
  ) {
    state.streak_freeze_available = true;
  }
}

function completeWindow(
  state: StreakState,
  now: Date,
  milestoneWindows: number[],
): void {
  state.streak_count += 1;
  state.current_window_start = now;
  state.current_window_workouts = 0;

  if ((STREAK_MILESTONES as readonly number[]).includes(state.streak_count)) {
    milestoneWindows.push(state.streak_count);
  }
}

function applyExpiryCheck(
  state: StreakState,
  now: Date,
  flags: {
    milestoneWindows: number[];
    windowCompleted: boolean;
    freezeApplied: boolean;
    expiredReset: boolean;
  },
) {
  if (!state.last_workout_at) {
    return;
  }

  const daysSinceLastWorkout = daysSinceDate(state.last_workout_at, now);
  if (daysSinceLastWorkout <= RESET_THRESHOLD_DAYS) {
    return;
  }

  if (
    state.streak_freeze_available &&
    state.current_window_workouts >= Math.max(state.streak_goal - 1, 0)
  ) {
    completeWindow(state, now, flags.milestoneWindows);
    state.streak_freeze_available = false;
    state.last_workout_at = now;
    flags.windowCompleted = true;
    flags.freezeApplied = true;
    return;
  }

  state.streak_count = 0;
  state.current_window_start = null;
  state.current_window_workouts = 0;
  flags.expiredReset = true;
}

function applyWorkoutLog(
  state: StreakState,
  now: Date,
  flags: {
    milestoneWindows: number[];
    windowCompleted: boolean;
  },
) {
  if (!state.current_window_start) {
    state.current_window_start = now;
    state.current_window_workouts = 1;
  } else {
    state.current_window_workouts += 1;
  }

  if (state.current_window_workouts >= state.streak_goal) {
    completeWindow(state, now, flags.milestoneWindows);
    flags.windowCompleted = true;
  }

  state.last_workout_at = now;
}

async function updateState(
  userId: string,
  now: Date,
  shouldRecordWorkout: boolean,
): Promise<RollingWindowStreakStatus> {
  return prisma.$transaction(async (tx) => {
    const selected = getSelectedStreakFields();
    const user = await tx.user.findUnique({ where: { id: userId }, select: selected });
    const activeProgram = await tx.userProgram.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        programme: {
          select: {
            daysPerWeek: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const state: StreakState = {
      streak_count: user.streak_count,
      streak_goal: user.streak_goal,
      current_window_start: user.current_window_start,
      current_window_workouts: user.current_window_workouts,
      streak_freeze_available: user.streak_freeze_available,
      last_workout_at: user.last_workout_at,
    };

    const syncedGoal = normalizeStreakGoal(activeProgram?.programme?.daysPerWeek);
    if (state.streak_goal !== syncedGoal) {
      state.streak_goal = syncedGoal;
      state.current_window_workouts = Math.min(
        state.current_window_workouts,
        state.streak_goal,
      );
    }

    const flags = {
      milestoneWindows: [] as number[],
      windowCompleted: false,
      freezeApplied: false,
      expiredReset: false,
    };

    applyMonthlyFreezeReset(state, now);
    applyExpiryCheck(state, now, flags);

    if (shouldRecordWorkout) {
      applyWorkoutLog(state, now, flags);
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        streak_count: state.streak_count,
        streak_goal: state.streak_goal,
        current_window_start: state.current_window_start,
        current_window_workouts: state.current_window_workouts,
        streak_freeze_available: state.streak_freeze_available,
        last_workout_at: state.last_workout_at,
      },
    });

    return serializeStatus(state, now, flags);
  });
}

export class RollingWindowStreakService {
  static async getStatus(userId: string): Promise<RollingWindowStreakStatus> {
    return updateState(userId, new Date(), false);
  }

  static async onWorkoutLogged(
    userId: string,
  ): Promise<RollingWindowStreakStatus> {
    return updateState(userId, new Date(), true);
  }
}
