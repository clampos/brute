// server/strength/types.ts

import type { ProgrammeType, BodyPart } from "./constants";

export type { ProgrammeType, BodyPart };

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type GoalProgrammeStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";

// ── DB-mirroring types ────────────────────────────────────────────────────────

export interface StrengthLiftState {
  id: string;
  userId: string;
  userProgramId: string;
  exerciseId: string;
  programmeType: ProgrammeType;
  trainingMax: number | null;    // kg; null = not yet initialised (LINEAR start)
  linearWeight: number | null;   // kg; current linear working weight
  cycleWeek: number;             // 1–4 for 531; 5 = peak opener; 6 = peak max attempt
  cycleNumber: number;
  consecutiveFailures: number;
  lastSessionAt: string | null;
  peakWeekPhase: string | null;  // mirrors goal's peak_week_phase for the prescription layer
  createdAt: string;
  updatedAt: string;
}

export interface StrengthSessionLog {
  id: string;
  userId: string;
  userProgramId: string | null;
  workoutId: string;
  exerciseId: string;
  programmeType: ProgrammeType;
  cycleWeek: number | null;
  cycleNumber: number | null;
  setsCompleted: number;
  repsPerSet: number[];
  weightsUsed: number[];
  amrapReps: number | null;
  targetWeight: number;
  targetReps: number;
  hitTarget: boolean;
  createdAt: string;
}

export interface StrengthGoalProgramme {
  id: string;
  userId: string;
  exerciseId: string;
  liftName: string;
  targetWeight: number;
  start1rm: number;
  startTm: number;
  currentTm: number;
  experienceLevel: ExperienceLevel;
  daysPerWeek: number;
  programmeType: ProgrammeType;
  projectedWeeks: number;
  projectedEndDate: string;
  startDate: string;
  sessionsCompleted: number;
  status: GoalProgrammeStatus;
  programmeId?: string | null;
  // peak week state
  peakWeekTriggered:      boolean;
  peakWeekPhase:          string;
  openerCompleted:        boolean;
  testCompleted:          boolean;
  bestAttemptWeight:      number | null;
  testDate:               string | null;
  postTestAction:         string | null;
  midCheckpointTriggered: boolean;
  midCheckpointWeight:    number | null;
  midCheckpointCompleted: boolean;
  timelineRevisions: TimelineRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineRevision {
  date: string;               // ISO date when revision occurred
  projectedEndDate: string;   // revised projected end date
  reason: string;
}

// ── Prescription types ────────────────────────────────────────────────────────

export interface StrengthSetPrescription {
  setNumber: number;
  targetWeight: number;       // rounded to 2.5kg
  targetReps: number;         // 0 for AMRAP sets (UI shows "Max reps")
  isAmrap: boolean;
  percentageOfTm: number;     // e.g. 0.85
  isFSL?: boolean;            // First Set Last supplemental set
}

export interface StrengthSessionPrescription {
  exerciseId: string;
  liftName: string;
  programmeType: ProgrammeType;
  cycleWeek: number;
  cycleNumber: number;
  sets: StrengthSetPrescription[];
  progressionNote: string;
  isAmrapWeek: boolean;
  trainingMax: number | null;
}

// ── Goal programme types ──────────────────────────────────────────────────────

export interface GoalProgrammeWeek {
  weekNumber: number;
  cycleWeek: number;          // 1–4 normal; 5 = peak opener; 6 = rest; 7 = max attempt
  isDeload: boolean;
  estimatedTm: number;
  sets: StrengthSetPrescription[];
  peakPhase?: "OPENER" | "REST" | "MAX_ATTEMPT";
  isMidCheckpoint?: boolean;
  milestone?: "25%" | "50%" | "75%" | "100%";
}

export interface GoalProgrammePreview {
  startTm: number;
  targetWeight: number;
  projectedWeeks: number;
  projectedEndDate: string;
  isUnrealistic: boolean;
  realisticProjection?: string;  // human-readable e.g. "~18 months"
  programmeType: ProgrammeType;
  weeks: GoalProgrammeWeek[];
}

export interface ProjectionUpdate {
  newProjectedEndDate: string;
  weeksChange: number;         // positive = slower, negative = faster
  reason: string;
  significant: boolean;        // > 1 week difference
}
