// server/strength/trainingMaxService.ts
// Stateless helpers: 1RM estimation, TM calculation, DB CRUD for lift state.

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import type { StrengthLiftState } from "./types";
import { TM_PERCENT, getBodyPart, BIG_4, BIG_4_IDS } from "./constants";

// ── Rounding ──────────────────────────────────────────────────────────────────

export function round2_5(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

export function calcTmFromOneRm(oneRm: number): number {
  return round2_5(oneRm * TM_PERCENT);
}

// ── 1RM estimation from workout history ───────────────────────────────────────

export async function getOneRmForLift(
  userId: string,
  exerciseId: string,
  prisma: PrismaClient,
): Promise<number | null> {
  // Epley formula: 1RM = weight * (1 + reps / 30)
  // Only use sets with 1–10 reps for accuracy
  type Row = { weight: number; reps: number };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT ws.weight, ws.reps
    FROM WorkoutSet ws
    JOIN workout_exercises we ON ws."workoutExerciseId" = we.id
    JOIN workouts w ON we.workout_id = w.id
    JOIN user_programs up ON w.user_program_id = up.id
    WHERE up.user_id = ${userId}
      AND we.exercise_id = ${exerciseId}
      AND ws.completed = 1
      AND ws.reps IS NOT NULL AND ws.reps > 0 AND ws.reps <= 10
      AND ws.weight IS NOT NULL AND ws.weight > 0
    ORDER BY ws.reps ASC
    LIMIT 50
  `;

  if (rows.length === 0) return null;

  let best = 0;
  for (const r of rows) {
    const estimated = r.weight * (1 + r.reps / 30);
    if (estimated > best) best = estimated;
  }
  return best > 0 ? best : null;
}

// ── DB helpers (raw SQL — avoids Prisma FK issues) ────────────────────────────

function rowToState(r: any): StrengthLiftState {
  return {
    id: r.id,
    userId: r.user_id,
    userProgramId: r.user_program_id,
    exerciseId: r.exercise_id,
    programmeType: r.programme_type,
    trainingMax: r.training_max ?? null,
    linearWeight: r.linear_weight ?? null,
    cycleWeek: r.cycle_week ?? 1,
    cycleNumber: r.cycle_number ?? 1,
    consecutiveFailures: r.consecutive_failures ?? 0,
    lastSessionAt: r.last_session_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getLiftState(
  userId: string,
  userProgramId: string,
  exerciseId: string,
  prisma: PrismaClient,
): Promise<StrengthLiftState | null> {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM strength_lift_state
    WHERE user_program_id = ${userProgramId} AND exercise_id = ${exerciseId}
    LIMIT 1
  `;
  return rows.length > 0 ? rowToState(rows[0]) : null;
}

export async function getAllLiftStates(
  userId: string,
  userProgramId: string,
  prisma: PrismaClient,
): Promise<StrengthLiftState[]> {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM strength_lift_state
    WHERE user_program_id = ${userProgramId}
  `;
  return rows.map(rowToState);
}

export async function upsertLiftState(
  state: Partial<StrengthLiftState> & {
    userId: string;
    userProgramId: string;
    exerciseId: string;
  },
  prisma: PrismaClient,
): Promise<StrengthLiftState> {
  const now = new Date().toISOString();
  const existing = await getLiftState(state.userId, state.userProgramId, state.exerciseId, prisma);

  if (existing) {
    const pt = state.programmeType ?? existing.programmeType;
    const tm = state.trainingMax !== undefined ? state.trainingMax : existing.trainingMax;
    const lw = state.linearWeight !== undefined ? state.linearWeight : existing.linearWeight;
    const cw = state.cycleWeek ?? existing.cycleWeek;
    const cn = state.cycleNumber ?? existing.cycleNumber;
    const cf = state.consecutiveFailures ?? existing.consecutiveFailures;
    const ls = state.lastSessionAt !== undefined ? state.lastSessionAt : existing.lastSessionAt;

    await prisma.$executeRaw`
      UPDATE strength_lift_state
      SET programme_type = ${pt}, training_max = ${tm}, linear_weight = ${lw},
          cycle_week = ${cw}, cycle_number = ${cn}, consecutive_failures = ${cf},
          last_session_at = ${ls}, updated_at = ${now}
      WHERE user_program_id = ${state.userProgramId} AND exercise_id = ${state.exerciseId}
    `;
    return { ...existing, ...state, programmeType: pt, trainingMax: tm, linearWeight: lw,
              cycleWeek: cw, cycleNumber: cn, consecutiveFailures: cf, lastSessionAt: ls,
              updatedAt: now };
  } else {
    const id = randomUUID();
    const pt = state.programmeType ?? "LINEAR";
    const tm = state.trainingMax ?? null;
    const lw = state.linearWeight ?? null;
    const cw = state.cycleWeek ?? 1;
    const cn = state.cycleNumber ?? 1;
    const cf = state.consecutiveFailures ?? 0;
    const ls = state.lastSessionAt ?? null;

    await prisma.$executeRaw`
      INSERT INTO strength_lift_state
        (id, user_id, user_program_id, exercise_id, programme_type, training_max,
         linear_weight, cycle_week, cycle_number, consecutive_failures, last_session_at,
         created_at, updated_at)
      VALUES
        (${id}, ${state.userId}, ${state.userProgramId}, ${state.exerciseId}, ${pt},
         ${tm}, ${lw}, ${cw}, ${cn}, ${cf}, ${ls}, ${now}, ${now})
    `;
    return {
      id, userId: state.userId, userProgramId: state.userProgramId,
      exerciseId: state.exerciseId, programmeType: pt, trainingMax: tm,
      linearWeight: lw, cycleWeek: cw, cycleNumber: cn, consecutiveFailures: cf,
      lastSessionAt: ls, createdAt: now, updatedAt: now,
    };
  }
}

// ── Auto-initialise state for all big 4 lifts in a programme ─────────────────

export async function initialiseLiftStates(
  userId: string,
  userProgramId: string,
  experienceLevel: string,
  prisma: PrismaClient,
): Promise<void> {
  const isAdvanced = experienceLevel === "advanced";
  const isIntermediate = experienceLevel === "intermediate";
  const defaultType: import("./types").ProgrammeType =
    isAdvanced || isIntermediate ? "531" : "LINEAR";

  for (const lift of Object.values(BIG_4)) {
    const existing = await getLiftState(userId, userProgramId, lift.exerciseId, prisma);
    if (existing) continue;  // already initialised

    let tm: number | null = null;
    let lw: number | null = null;

    const oneRm = await getOneRmForLift(userId, lift.exerciseId, prisma);
    if (oneRm) {
      tm = calcTmFromOneRm(oneRm);
      lw = round2_5(oneRm * 0.7);  // start linear at ~70% of estimated 1RM
    }

    await upsertLiftState(
      { userId, userProgramId, exerciseId: lift.exerciseId,
        programmeType: defaultType, trainingMax: tm, linearWeight: lw },
      prisma,
    );
  }
}
