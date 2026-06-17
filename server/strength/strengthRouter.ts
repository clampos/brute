// server/strength/strengthRouter.ts
// Express router for all strength-specific endpoints.
// Mounted at /auth/strength in server/auth.ts.

import express, { Request, Response } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../prisma";
import { authenticateToken } from "../authMiddleware";
import {
  getLiftState, getAllLiftStates, upsertLiftState,
  getOneRmForLift, calcTmFromOneRm, round2_5, initialiseLiftStates,
} from "./trainingMaxService";
import { prescribeLinear, advanceLinear } from "./linearProgressionService";
import { prescribe531, advance531 } from "./wave531Service";
import { prescribeDouble, advanceDouble } from "./doubleProgressionService";
import { computeGoalPreview, recomputeProjection } from "./goalProgrammeService";
import { BIG_4, BIG_4_IDS, getLiftName, isBig4 } from "./constants";
import type {
  StrengthLiftState, StrengthSessionPrescription,
  ExperienceLevel, StrengthGoalProgramme, TimelineRevision,
} from "./types";

const router = express.Router();

// ── Helper: get or auto-init lift state ──────────────────────────────────────

async function getOrInitLiftState(
  userId: string,
  userProgramId: string,
  exerciseId: string,
  experienceLevel: string,
): Promise<StrengthLiftState> {
  let state = await getLiftState(userId, userProgramId, exerciseId, prisma);
  if (!state) {
    const isAdvancedOrIntermediate =
      experienceLevel === "intermediate" || experienceLevel === "advanced";
    const programmeType = isAdvancedOrIntermediate ? "531" : "LINEAR";

    let tm: number | null = null;
    let lw: number | null = null;

    const oneRm = await getOneRmForLift(userId, exerciseId, prisma);
    if (oneRm) {
      tm = calcTmFromOneRm(oneRm);
      lw = round2_5(oneRm * 0.7);
    } else {
      // No workout history — seed TM from the active strength goal for this lift
      const goalRows = await prisma.$queryRaw<any[]>`
        SELECT start_tm FROM strength_goal_programmes
        WHERE user_id = ${userId} AND exercise_id = ${exerciseId} AND status = 'ACTIVE'
        LIMIT 1
      `;
      if (goalRows.length > 0 && goalRows[0].start_tm) {
        tm = goalRows[0].start_tm;
        lw = round2_5(goalRows[0].start_tm * 0.7);
      }
    }

    state = await upsertLiftState(
      { userId, userProgramId, exerciseId, programmeType, trainingMax: tm, linearWeight: lw },
      prisma,
    );
  }
  return state;
}

// ── Prescribe based on programme type ────────────────────────────────────────

function prescribeForState(
  state: StrengthLiftState,
  exerciseId: string,
): StrengthSessionPrescription {
  switch (state.programmeType) {
    case "531":    return prescribe531(state, exerciseId);
    case "DOUBLE": return prescribeDouble(state, exerciseId);
    default:       return prescribeLinear(state, exerciseId);
  }
}

// ── Advance state after session ───────────────────────────────────────────────

function advanceState(
  state: StrengthLiftState,
  repsPerSet: number[],
  amrapReps: number | null,
  exerciseId: string,
): Partial<StrengthLiftState> {
  switch (state.programmeType) {
    case "531":    return advance531(state, amrapReps ?? 0, exerciseId);
    case "DOUBLE": return advanceDouble(state, repsPerSet, exerciseId);
    default:       return advanceLinear(state, repsPerSet, exerciseId);
  }
}

// ── Active programme lookup ───────────────────────────────────────────────────

async function getActiveStrengthProgram(userId: string) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT up.id as userProgramId, up.programme_id,
      COALESCE(p.experience_level, u.currentExperienceLevel) as experienceLevel
    FROM user_programs up
    JOIN programmes p ON up.programme_id = p.id
    JOIN User u ON up.user_id = u.id
    WHERE up.user_id = ${userId}
      AND up.status = 'ACTIVE'
      AND p.progression_focus = 'STRENGTH'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// ── Goal helpers ──────────────────────────────────────────────────────────────

function rowToGoal(r: any): StrengthGoalProgramme & { programmeId?: string } {
  return {
    id: r.id,
    userId: r.user_id,
    exerciseId: r.exercise_id,
    liftName: r.lift_name,
    targetWeight: r.target_weight,
    start1rm: r.start_1rm,
    startTm: r.start_tm,
    currentTm: r.current_tm,
    experienceLevel: r.experience_level,
    daysPerWeek: r.days_per_week,
    programmeType: r.programme_type,
    projectedWeeks: r.projected_weeks,
    projectedEndDate: r.projected_end_date,
    startDate: r.start_date,
    sessionsCompleted: r.sessions_completed,
    status: r.status,
    programmeId: r.programme_id ?? null,
    timelineRevisions: (() => {
      try { return JSON.parse(r.timeline_revisions ?? "[]"); } catch { return []; }
    })(),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /auth/strength/status
// Returns all 4 lift states for the active STRENGTH programme (if any),
// plus current 1RM estimates.
router.get("/status", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const prog = await getActiveStrengthProgram(userId);

    const lifts: Record<string, any> = {};
    for (const lift of Object.values(BIG_4)) {
      const oneRm = await getOneRmForLift(userId, lift.exerciseId, prisma);
      let state: StrengthLiftState | null = null;
      if (prog) {
        state = await getLiftState(userId, prog.userProgramId, lift.exerciseId, prisma);
      }
      lifts[lift.exerciseId] = {
        name: lift.name,
        bodyPart: lift.bodyPart,
        estimatedOneRm: oneRm ? Math.round(oneRm * 10) / 10 : null,
        estimatedTm: oneRm ? calcTmFromOneRm(oneRm) : null,
        state,
      };
    }

    return res.json({
      activeProgramme: prog ? { userProgramId: prog.userProgramId } : null,
      lifts,
    });
  } catch (err) {
    console.error("Strength status error:", err);
    return res.status(500).json({ error: "Failed to fetch strength status" });
  }
});

// GET /auth/strength/prescription
// Returns today's full workout prescription for all 4 lifts.
router.get("/prescription", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const prog = await getActiveStrengthProgram(userId);
    if (!prog) return res.json({ prescriptions: [], message: "No active strength programme" });

    const prescriptions: StrengthSessionPrescription[] = [];
    for (const lift of Object.values(BIG_4)) {
      const state = await getOrInitLiftState(
        userId, prog.userProgramId, lift.exerciseId, prog.experienceLevel ?? "intermediate",
      );
      prescriptions.push(prescribeForState(state, lift.exerciseId));
    }

    return res.json({ prescriptions });
  } catch (err) {
    console.error("Strength prescription error:", err);
    return res.status(500).json({ error: "Failed to get prescription" });
  }
});

// GET /auth/strength/lifts/:exerciseId/state
router.get("/lifts/:exerciseId/state", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { exerciseId } = req.params;
    const prog = await getActiveStrengthProgram(userId);
    if (!prog) return res.json({ state: null, prescription: null });

    const state = await getOrInitLiftState(userId, prog.userProgramId, exerciseId, prog.experienceLevel ?? "intermediate");
    const prescription = prescribeForState(state, exerciseId);
    const oneRm = await getOneRmForLift(userId, exerciseId, prisma);

    return res.json({ state, prescription, estimatedOneRm: oneRm });
  } catch (err) {
    console.error("Lift state error:", err);
    return res.status(500).json({ error: "Failed to get lift state" });
  }
});

// PUT /auth/strength/lifts/:exerciseId/tm
router.put("/lifts/:exerciseId/tm", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { exerciseId } = req.params;
    const { trainingMax } = req.body as { trainingMax: number };
    if (!trainingMax || trainingMax <= 0) return res.status(400).json({ error: "Invalid training max" });

    const prog = await getActiveStrengthProgram(userId);
    if (!prog) return res.status(400).json({ error: "No active strength programme" });

    const state = await upsertLiftState(
      { userId, userProgramId: prog.userProgramId, exerciseId, trainingMax: round2_5(trainingMax) },
      prisma,
    );
    return res.json({ state });
  } catch (err) {
    console.error("TM update error:", err);
    return res.status(500).json({ error: "Failed to update TM" });
  }
});

// POST /auth/strength/sessions
// Called from the workout save flow when a STRENGTH programme lift is completed.
// Body: { userProgramId, workoutId, exerciseId, repsPerSet: number[], weightsUsed: number[], linearWeight?: number }
router.post("/sessions", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { userProgramId, workoutId, exerciseId, repsPerSet, weightsUsed, linearWeight } = req.body as {
      userProgramId: string;
      workoutId: string;
      exerciseId: string;
      repsPerSet: number[];
      weightsUsed: number[];
      linearWeight?: number;
    };

    if (!repsPerSet?.length) return res.status(400).json({ error: "repsPerSet required" });

    const state = await getOrInitLiftState(userId, userProgramId, exerciseId, "intermediate");

    // If the user set an explicit linear weight this session (first session), update it
    if (linearWeight && !state.linearWeight) {
      await upsertLiftState({ userId, userProgramId, exerciseId, linearWeight: round2_5(linearWeight) }, prisma);
    }

    const isAmrapWeek = state.programmeType === "531" && state.cycleWeek !== 4;
    const amrapReps = isAmrapWeek ? (repsPerSet[repsPerSet.length - 1] ?? null) : null;
    const targetWeight = weightsUsed[weightsUsed.length - 1] ?? 0;
    const targetReps = state.programmeType === "531" ? 5 : 5;

    const prescription = prescribeForState(state, exerciseId);
    const allSetsHit = prescription.sets.every((s, i) => {
      const actual = repsPerSet[i] ?? 0;
      return s.isAmrap ? actual >= 1 : actual >= s.targetReps;
    });

    // Log the session
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    await prisma.$executeRaw`
      INSERT INTO strength_session_log
        (id, user_id, user_program_id, workout_id, exercise_id, programme_type,
         cycle_week, cycle_number, sets_completed, reps_per_set, weights_used,
         amrap_reps, target_weight, target_reps, hit_target, created_at)
      VALUES
        (${sessionId}, ${userId}, ${userProgramId}, ${workoutId}, ${exerciseId},
         ${state.programmeType}, ${state.cycleWeek}, ${state.cycleNumber},
         ${repsPerSet.length}, ${JSON.stringify(repsPerSet)}, ${JSON.stringify(weightsUsed)},
         ${amrapReps}, ${targetWeight}, ${targetReps}, ${allSetsHit ? 1 : 0}, ${now})
    `;

    // Advance progression state
    const updates = advanceState(state, repsPerSet, amrapReps, exerciseId);
    const newState = await upsertLiftState({ userId, userProgramId, exerciseId, ...updates }, prisma);
    const nextPrescription = prescribeForState(newState, exerciseId);

    // Check if any active goal programme should be updated
    const goalUpdate = await updateGoalProgrammeIfActive(userId, exerciseId, newState.trainingMax ?? newState.linearWeight);

    return res.json({
      sessionId,
      updatedState: newState,
      nextPrescription,
      goalUpdate,
      progressionMessage: getProgressionMessage(state, updates),
    });
  } catch (err) {
    console.error("Strength session error:", err);
    return res.status(500).json({ error: "Failed to log session" });
  }
});

function getProgressionMessage(state: StrengthLiftState, updates: Partial<StrengthLiftState>): string {
  if (updates.programmeType === "531" && state.programmeType === "DOUBLE") {
    return "You've graduated to 5/3/1 wave loading. Training max set from your current working weight.";
  }
  if (updates.programmeType === "DOUBLE" && state.programmeType === "LINEAR") {
    return "After 3 failures, switching to double progression. You'll bridge to 5/3/1 from here.";
  }
  if (state.programmeType === "531" && updates.trainingMax && updates.trainingMax > (state.trainingMax ?? 0)) {
    return `Cycle complete — Training Max increased to ${updates.trainingMax}kg.`;
  }
  if (state.programmeType === "531" && updates.trainingMax && updates.trainingMax < (state.trainingMax ?? 0)) {
    return `AMRAP below target — Training Max reduced to ${updates.trainingMax}kg. Focus on technique.`;
  }
  if (state.programmeType === "LINEAR" && updates.linearWeight && updates.linearWeight > (state.linearWeight ?? 0)) {
    return `All reps hit — weight increased to ${updates.linearWeight}kg next session.`;
  }
  return "";
}

async function updateGoalProgrammeIfActive(
  userId: string,
  exerciseId: string,
  newTm: number | null | undefined,
): Promise<any> {
  if (!newTm) return null;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM strength_goal_programmes
    WHERE user_id = ${userId} AND exercise_id = ${exerciseId} AND status = 'ACTIVE'
    LIMIT 1
  `;
  if (!rows.length) return null;
  const goal = rowToGoal(rows[0]);

  const projection = recomputeProjection(goal, newTm);
  if (!projection || !projection.significant) {
    // Still update current_tm
    await prisma.$executeRaw`
      UPDATE strength_goal_programmes
      SET current_tm = ${newTm}, sessions_completed = sessions_completed + 1, updated_at = ${new Date().toISOString()}
      WHERE id = ${goal.id}
    `;
    return null;
  }

  const revision: TimelineRevision = {
    date: new Date().toISOString().split("T")[0],
    projectedEndDate: projection.newProjectedEndDate,
    reason: projection.reason,
  };
  const revisions = JSON.stringify([...goal.timelineRevisions, revision]);
  const now = new Date().toISOString();

  await prisma.$executeRaw`
    UPDATE strength_goal_programmes
    SET current_tm = ${newTm}, sessions_completed = sessions_completed + 1,
        projected_end_date = ${projection.newProjectedEndDate},
        timeline_revisions = ${revisions}, updated_at = ${now}
    WHERE id = ${goal.id}
  `;

  return { projection, revisedTimeline: true };
}

// ── Goal endpoints ────────────────────────────────────────────────────────────

// GET /auth/strength/goals
router.get("/goals", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM strength_goal_programmes
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return res.json({ goals: rows.map(rowToGoal) });
  } catch (err) {
    console.error("Get goals error:", err);
    return res.status(500).json({ error: "Failed to fetch goals" });
  }
});

// POST /auth/strength/goals/preview
router.post("/goals/preview", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { exerciseId, targetWeight, current1rmOverride, current1rm: current1rmBody, experienceLevel, daysPerWeek } = req.body as {
      exerciseId: string;
      targetWeight: number;
      current1rmOverride?: number;
      current1rm?: number;
      experienceLevel: ExperienceLevel;
      daysPerWeek: number;
    };

    if (!exerciseId || !targetWeight || !experienceLevel || !daysPerWeek) {
      return res.status(400).json({ error: "exerciseId, targetWeight, experienceLevel and daysPerWeek required" });
    }

    let current1rm = current1rmOverride ?? current1rmBody ?? null;
    if (!current1rm) {
      current1rm = await getOneRmForLift(userId, exerciseId, prisma);
    }
    if (!current1rm || current1rm <= 0) {
      return res.status(400).json({ error: "Could not determine current 1RM. Please enter it manually." });
    }
    if (targetWeight <= current1rm) {
      return res.status(400).json({ error: "Target weight must be greater than your estimated 1RM" });
    }

    const preview = computeGoalPreview({ current1rm, targetWeight, experienceLevel, daysPerWeek, exerciseId });
    return res.json({ preview, current1rm });
  } catch (err) {
    console.error("Goal preview error:", err);
    return res.status(500).json({ error: "Failed to compute preview" });
  }
});

// POST /auth/strength/goals
router.post("/goals", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { exerciseId, targetWeight, current1rmOverride, current1rm: current1rmBody, experienceLevel, daysPerWeek } = req.body as {
      exerciseId: string;
      targetWeight: number;
      current1rmOverride?: number;
      current1rm?: number;
      experienceLevel: ExperienceLevel;
      daysPerWeek: number;
    };

    let current1rm = current1rmOverride ?? current1rmBody ?? await getOneRmForLift(userId, exerciseId, prisma);
    if (!current1rm) return res.status(400).json({ error: "Cannot determine current 1RM" });

    // Remove any existing goal for this lift (UNIQUE constraint on user_id + exercise_id)
    await prisma.$executeRaw`
      DELETE FROM strength_goal_programmes
      WHERE user_id = ${userId} AND exercise_id = ${exerciseId}
    `;

    const preview = computeGoalPreview({ current1rm, targetWeight, experienceLevel, daysPerWeek, exerciseId });
    const id = randomUUID();
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    await prisma.$executeRaw`
      INSERT INTO strength_goal_programmes
        (id, user_id, exercise_id, lift_name, target_weight, start_1rm, start_tm, current_tm,
         experience_level, days_per_week, programme_type, projected_weeks, projected_end_date,
         start_date, sessions_completed, status, timeline_revisions, created_at, updated_at)
      VALUES
        (${id}, ${userId}, ${exerciseId}, ${getLiftName(exerciseId)}, ${targetWeight},
         ${current1rm}, ${preview.startTm}, ${preview.startTm},
         ${experienceLevel}, ${daysPerWeek}, ${preview.programmeType},
         ${preview.projectedWeeks}, ${preview.projectedEndDate},
         ${today}, 0, 'ACTIVE', '[]', ${now}, ${now})
    `;

    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM strength_goal_programmes WHERE id = ${id}`;
    return res.status(201).json({ goal: rowToGoal(rows[0]), preview });
  } catch (err) {
    console.error("Create goal error:", err);
    return res.status(500).json({ error: "Failed to create goal" });
  }
});

// GET /auth/strength/goals/:id
router.get("/goals/:id", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM strength_goal_programmes WHERE id = ${id} AND user_id = ${userId}
    `;
    if (!rows.length) return res.status(404).json({ error: "Goal not found" });
    const goal = rowToGoal(rows[0]);

    // Recompute week-by-week plan from current TM
    const preview = computeGoalPreview({
      current1rm: goal.currentTm / 0.9,  // reverse-engineer 1RM from TM
      targetWeight: goal.targetWeight,
      experienceLevel: goal.experienceLevel,
      daysPerWeek: goal.daysPerWeek,
      exerciseId: goal.exerciseId,
    });

    // Fetch session history
    const sessions = await prisma.$queryRaw<any[]>`
      SELECT * FROM strength_session_log
      WHERE user_id = ${userId} AND exercise_id = ${goal.exerciseId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return res.json({ goal, plan: preview, sessionHistory: sessions });
  } catch (err) {
    console.error("Get goal error:", err);
    return res.status(500).json({ error: "Failed to fetch goal" });
  }
});

// PUT /auth/strength/goals/:id/target
router.put("/goals/:id/target", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { targetWeight } = req.body as { targetWeight: number };

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM strength_goal_programmes WHERE id = ${id} AND user_id = ${userId}
    `;
    if (!rows.length) return res.status(404).json({ error: "Goal not found" });
    const goal = rowToGoal(rows[0]);

    const preview = computeGoalPreview({
      current1rm: goal.currentTm / 0.9,
      targetWeight,
      experienceLevel: goal.experienceLevel,
      daysPerWeek: goal.daysPerWeek,
      exerciseId: goal.exerciseId,
    });

    const now = new Date().toISOString();
    await prisma.$executeRaw`
      UPDATE strength_goal_programmes
      SET target_weight = ${targetWeight}, projected_weeks = ${preview.projectedWeeks},
          projected_end_date = ${preview.projectedEndDate}, updated_at = ${now}
      WHERE id = ${id}
    `;

    return res.json({ goal: { ...goal, targetWeight, projectedWeeks: preview.projectedWeeks, projectedEndDate: preview.projectedEndDate }, preview });
  } catch (err) {
    console.error("Update target error:", err);
    return res.status(500).json({ error: "Failed to update target" });
  }
});

// POST /auth/strength/goals/:id/init-lift-state
// Seeds the lift state for the goal's exercise from the goal's current TM.
// Called after programme activation so the first workout has correct weights.
router.post("/goals/:id/init-lift-state", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const goalRows = await prisma.$queryRaw<any[]>`
      SELECT * FROM strength_goal_programmes WHERE id = ${id} AND user_id = ${userId} LIMIT 1
    `;
    if (!goalRows.length) return res.status(404).json({ error: "Goal not found" });
    const goal = rowToGoal(goalRows[0]);

    const prog = await getActiveStrengthProgram(userId);
    if (!prog) return res.status(400).json({ error: "No active strength programme" });

    const isAdvancedOrIntermediate =
      goal.experienceLevel === "intermediate" || goal.experienceLevel === "advanced";
    const programmeType = isAdvancedOrIntermediate ? "531" : "LINEAR";
    const tm = goal.currentTm;
    const lw = round2_5(tm * 0.7);

    // Only seed if no existing state or TM is missing
    const existing = await getLiftState(userId, prog.userProgramId, goal.exerciseId, prisma);
    if (!existing || !existing.trainingMax) {
      await upsertLiftState(
        { userId, userProgramId: prog.userProgramId, exerciseId: goal.exerciseId,
          programmeType, trainingMax: tm, linearWeight: lw },
        prisma,
      );
    }

    return res.json({ success: true, programmeType, trainingMax: tm });
  } catch (err) {
    console.error("Init lift state error:", err);
    return res.status(500).json({ error: "Failed to initialise lift state" });
  }
});

// PATCH /auth/strength/goals/:id/link-programme
// Called after goal creation to store the programme_id that was generated for this goal.
router.patch("/goals/:id/link-programme", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { programmeId } = req.body as { programmeId: string };
    if (!programmeId) return res.status(400).json({ error: "programmeId required" });
    await prisma.$executeRaw`
      UPDATE strength_goal_programmes
      SET programme_id = ${programmeId}, updated_at = ${new Date().toISOString()}
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return res.json({ success: true });
  } catch (err) {
    console.error("Link programme error:", err);
    return res.status(500).json({ error: "Failed to link programme" });
  }
});

// DELETE /auth/strength/goals/:id
router.delete("/goals/:id", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    await prisma.$executeRaw`
      UPDATE strength_goal_programmes SET status = 'CANCELLED', updated_at = ${new Date().toISOString()}
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete goal error:", err);
    return res.status(500).json({ error: "Failed to cancel goal" });
  }
});

export default router;

// ── Exported helper for auth.ts integration ───────────────────────────────────

export {
  prescribeForState,
  getOrInitLiftState,
  getActiveStrengthProgram,
  advanceState,
};
