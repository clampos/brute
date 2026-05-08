import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { pageTransition } from "../utils/animations";
import BottomBar from "../components/BottomBar";
import TopBar from "../components/TopBar";
import InstallPrompt from "../components/InstallPrompt";
import {
  MoreHorizontal,
  Calendar,
  History,
  Play,
  Pause,
  Check,
  Target,
  Plus,
  Minus,
  X,
  Share2,
  SkipForward,
} from "lucide-react";
import html2canvas from "html2canvas";
import BullseyeIcon from "../assets/Icons/Bullseye Icon.svg";
import DownwardsIcon from "../assets/Icons/Downards Icon.svg";
import ProgressIcon from "../assets/Icons/Progress Icon.svg";
import MuscleIcon from "../components/MuscleIcon";
import { getSuggestedReps, estimate1RM } from "../utils/repAdjustmentUtils";
import {
  UnitSystem,
  getUnitPreference,
  kgToLbs,
  lbsToKg,
} from "../utils/unitConversions";

type WorkoutSet = {
  weight: string;
  reps: string;
  completed: boolean;
  completedTargetReps?: number | null;
  isDropSet?: boolean;
  dropSetGroupId?: string;
  isNewlyAdded?: boolean;
};

type WorkoutExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  exerciseId: string;
  strengthRole?: "MAIN_LIFT" | "SUPPLEMENTAL" | "ACCESSORY";
  workoutSets: WorkoutSet[];
  notes?: string | null;
  recommendation?: {
    recommendedWeight: number;
    recommendedReps: number;
    recommendedRPE: number;
    progressionType: string;
    reasoning: string;
    volumeSuggestion?: "add_set" | "add_exercise" | null;
    setRecommendations?: {
      setNumber: number;
      recommendedWeight: number;
      recommendedReps: number;
    }[];
  };
};

type UserProgram = {
  id: string;
  programme: {
    id: string;
    name: string;
    description?: string;
    bodyPartFocus: string;
    progressionFocus?: "MUSCLE_BUILDING" | "STRENGTH";
    daysPerWeek: number;
    weeks: number;
    exercises: ProgrammeExercise[];
  };
  currentWeek: number;
  currentDay: number;
};

type ProgrammeExercise = {
  id: string;
  dayNumber: number;
  sets: number;
  reps: string;
  strengthRole?: "MAIN_LIFT" | "SUPPLEMENTAL" | "ACCESSORY";
  notes?: string | null;
  exercise: {
    id: string;
    name: string;
    muscleGroup: string;
  };
};

type ExerciseHistorySet = {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
  setType?: "main" | "drop";
  dropSetGroupId?: string;
};

type ExerciseHistoryEntry = {
  date: string;
  weekNumber: number;
  dayNumber: number;
  sets: ExerciseHistorySet[];
};

type ReadOnlyWorkoutSet = {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  targetReps: number | null;
  completed: boolean;
  setType?: "main" | "drop";
  dropSetGroupId?: string;
};

type ReadOnlyWorkoutExercise = {
  id: string;
  orderIndex: number;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: ReadOnlyWorkoutSet[];
};

type ReadOnlyWorkout = {
  id: string;
  weekNumber: number;
  dayNumber: number;
  completedAt: string;
  duration: number | null;
  notes: string | null;
  exercises: ReadOnlyWorkoutExercise[];
};

type SetDefinition = {
  type: "main" | "drop";
  groupId?: string;
};

type RecoveryAdjustmentStatus = {
  isActive: boolean;
  sessionsRemaining: number;
  setTarget?: number;
  weightMultiplier: number;
  triggerType?: "FATIGUE" | "MISSED_TARGETS" | "EASY_PROGRESS";
  targetExerciseId?: string;
  targetExerciseName?: string;
  activeExerciseOverperformanceAdjustments?: Array<{
    exerciseId: string;
    exerciseName: string;
    multiplier: number;
    sessionsRemaining: number;
    dayNumber: number;
  }>;
};

type OverperformingExercise = {
  exerciseId: string;
  exerciseName: string;
};

const WORKOUT_LAYOUT_CACHE_KEY = "workoutLayoutCache";
const WORKOUT_HISTORY_LAYOUT_CACHE_KEY = "workoutHistoryLayoutCache";
const EXERCISE_HISTORY_PAGE_SIZE = 8;

export default function Workouts() {
  type WorkoutRecoveryState = "FRESH" | "NORMAL" | "STILL_TIRED";

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);

  // Unit system
  const [unitSystem] = useState<UnitSystem>(getUnitPreference);
  // Raw typed string per weight input — key is `${exerciseId}-${setIdx}`
  const [weightDisplayValues, setWeightDisplayValues] = useState<Record<string, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Programme state
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [todayExercises, setTodayExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skippingWorkout, setSkippingWorkout] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const recommendationsRequestRef = useRef(0);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [showLeavingModal, setShowLeavingModal] = useState(false);
  const [nextLocation, setNextLocation] = useState<string | null>(null);
  const [showExerciseHistoryModal, setShowExerciseHistoryModal] = useState(false);
  const [historyExerciseName, setHistoryExerciseName] = useState("");
  const [historyExerciseId, setHistoryExerciseId] = useState("");
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(EXERCISE_HISTORY_PAGE_SIZE);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [showEndProgrammeModal, setShowEndProgrammeModal] = useState(false);
  const [endingProgramme, setEndingProgramme] = useState(false);
  const [showDeloadWeekModal, setShowDeloadWeekModal] = useState(false);
  const [showReadOnlyWorkoutModal, setShowReadOnlyWorkoutModal] =
    useState(false);
  const [readOnlyWorkout, setReadOnlyWorkout] = useState<ReadOnlyWorkout | null>(
    null,
  );
  const [readOnlyWorkoutLoading, setReadOnlyWorkoutLoading] = useState(false);
  const [readOnlyWorkoutError, setReadOnlyWorkoutError] = useState("");
  const [showProgrammeCalendarDropdown, setShowProgrammeCalendarDropdown] =
    useState(false);
  const [updatingProgrammeWeeks, setUpdatingProgrammeWeeks] = useState(false);
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());
  const [sharingSummary, setSharingSummary] = useState(false);
  const [shareSummaryError, setShareSummaryError] = useState("");
  const [showShareSummaryPanel, setShowShareSummaryPanel] = useState(false);
  const [sharePreviewUrl, setSharePreviewUrl] = useState("");
  const [sharePreviewFileName, setSharePreviewFileName] = useState("");
  const [sharePreviewBlob, setSharePreviewBlob] = useState<Blob | null>(null);
  const [completedWorkoutId, setCompletedWorkoutId] = useState<string | null>(null);
  const [showWorkoutFeedbackModal, setShowWorkoutFeedbackModal] = useState(false);
  const [workoutDifficultyScore, setWorkoutDifficultyScore] = useState(7);
  const [startingRecoveryState, setStartingRecoveryState] =
    useState<WorkoutRecoveryState>("NORMAL");
  const [submittingWorkoutFeedback, setSubmittingWorkoutFeedback] =
    useState(false);
  const [workoutFeedbackError, setWorkoutFeedbackError] = useState("");
  const [showRecoveryAdjustmentModal, setShowRecoveryAdjustmentModal] =
    useState(false);
  const [recoveryStreakCount, setRecoveryStreakCount] = useState(0);
  const [underperformingExerciseName, setUnderperformingExerciseName] =
    useState("");
  const [underperformingExerciseId, setUnderperformingExerciseId] =
    useState("");
  const [adjustmentTriggerType, setAdjustmentTriggerType] = useState<
    "FATIGUE" | "MISSED_TARGETS" | "EASY_PROGRESS" | "EXERCISE_OVERPERFORMANCE" | null
  >(null);
  const [overperformingExercises, setOverperformingExercises] = useState<
    OverperformingExercise[]
  >([]);
  const [showExerciseOverperformanceModal, setShowExerciseOverperformanceModal] =
    useState(false);
  const [applyingExerciseIncrease, setApplyingExerciseIncrease] = useState(false);
  const [exerciseIncreaseError, setExerciseIncreaseError] = useState("");
  const [applyingRecoveryAdjustments, setApplyingRecoveryAdjustments] =
    useState(false);
  const [recoveryAdjustmentError, setRecoveryAdjustmentError] = useState("");
  const [recoveryAdjustmentStatus, setRecoveryAdjustmentStatus] =
    useState<RecoveryAdjustmentStatus>({
      isActive: false,
      sessionsRemaining: 0,
      setTarget: undefined,
      weightMultiplier: 1,
      triggerType: undefined,
      targetExerciseId: undefined,
      targetExerciseName: undefined,
    });
  const summaryShareRef = useRef<HTMLDivElement>(null);
  const summaryShareCaptureRef = useRef<HTMLDivElement>(null);
  const isMuscleBuildingProgramme =
    userProgram?.programme?.progressionFocus !== "STRENGTH";

  const getProgrammeRPEByWeek = (programWeeks: number): number[] => {
    const baseRPEs: number[] = [];

    if (programWeeks <= 1) {
      baseRPEs.push(7);
    } else {
      for (let week = 1; week <= programWeeks; week += 1) {
        const progress = (week - 1) / (programWeeks - 1);
        const rpe = Math.round(7 + progress * 3);
        baseRPEs.push(Math.max(7, Math.min(10, rpe)));
      }
    }

    // Include the appended deload week.
    return [...baseRPEs, 5];
  };

  const getAdjustedSetCount = (
    baseSetCount: number,
    exerciseId?: string,
    status?: RecoveryAdjustmentStatus,
  ) => {
    const effectiveStatus = status || recoveryAdjustmentStatus;
    if (!effectiveStatus.isActive) {
      return baseSetCount;
    }

    if (
      effectiveStatus.targetExerciseId &&
      exerciseId &&
      effectiveStatus.targetExerciseId !== exerciseId
    ) {
      return baseSetCount;
    }

    if (
      effectiveStatus.weightMultiplier >= 1 ||
      !effectiveStatus.setTarget ||
      effectiveStatus.setTarget <= 0
    ) {
      return baseSetCount;
    }

    return Math.min(baseSetCount, effectiveStatus.setTarget || 3);
  };

  const fetchRecoveryAdjustmentStatus = async (
    fallbackStatus?: RecoveryAdjustmentStatus,
  ): Promise<RecoveryAdjustmentStatus> => {
    try {
      const response = await fetch(
        "/auth/workouts/recovery-adjustments/status",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch recovery adjustment status");
      }

      const payload = await response.json();
      const normalized: RecoveryAdjustmentStatus = {
        isActive: Boolean(payload?.isActive),
        sessionsRemaining: Number(payload?.sessionsRemaining || 0),
        setTarget:
          typeof payload?.setTarget === "number" && payload.setTarget > 0
            ? Number(payload.setTarget)
            : undefined,
        weightMultiplier: Number(payload?.weightMultiplier || 1),
        triggerType:
          payload?.triggerType === "MISSED_TARGETS"
            ? "MISSED_TARGETS"
            : payload?.triggerType === "EASY_PROGRESS"
              ? "EASY_PROGRESS"
            : payload?.triggerType === "FATIGUE"
              ? "FATIGUE"
              : undefined,
        targetExerciseId:
          typeof payload?.targetExerciseId === "string"
            ? payload.targetExerciseId
            : undefined,
        targetExerciseName:
          typeof payload?.targetExerciseName === "string"
            ? payload.targetExerciseName
            : undefined,
        activeExerciseOverperformanceAdjustments: Array.isArray(
          payload?.activeExerciseOverperformanceAdjustments,
        )
          ? payload.activeExerciseOverperformanceAdjustments
          : [],
      };

      setRecoveryAdjustmentStatus(normalized);
      setAdjustmentTriggerType(normalized.triggerType || null);
      return normalized;
    } catch (error) {
      console.warn("Failed to fetch recovery adjustment status:", error);
      // Preserve the current in-memory status so a confirmed adjustment from the
      // previous modal flow is not silently discarded.
      return fallbackStatus || recoveryAdjustmentStatus;
    }
  };

  const isWorkoutDayCompleted = (weekNumber: number, dayNumber: number) => {
    if (!userProgram) return false;
    if (weekNumber < userProgram.currentWeek) return true;
    if (weekNumber > userProgram.currentWeek) return false;
    return dayNumber < userProgram.currentDay;
  };

  const openReadOnlyWorkoutForDay = async (
    weekNumber: number,
    dayNumber: number,
  ) => {
    if (!userProgram) return;

    try {
      setReadOnlyWorkoutLoading(true);
      setReadOnlyWorkoutError("");
      setShowReadOnlyWorkoutModal(true);
      setReadOnlyWorkout(null);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `/auth/workouts/by-day?weekNumber=${weekNumber}&dayNumber=${dayNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        let backendMessage = "";
        try {
          const errorPayload = await response.json();
          backendMessage = errorPayload?.details || errorPayload?.error || "";
        } catch {
          // ignore
        }
        throw new Error(
          backendMessage ||
            `Failed to load completed workout (${response.status})`,
        );
      }

      const payload = await response.json();
      const workout = payload?.workout as ReadOnlyWorkout | undefined;
      if (!workout) {
        throw new Error("No workout data returned for this completed day");
      }

      setReadOnlyWorkout(workout);
    } catch (err: any) {
      setReadOnlyWorkoutError(
        err?.message || "Failed to load completed workout",
      );
    } finally {
      setReadOnlyWorkoutLoading(false);
    }
  };

  const normalizeSetDefinitions = (
    setDefinitions: SetDefinition[] | undefined,
    setCount: number,
  ): SetDefinition[] => {
    const count = setDefinitions ? Math.max(setCount, setDefinitions.length) : setCount;
    const firstIndexByGroup = new Map<string, number>();
    return Array.from({ length: count }, (_, index) => {
      const definition = setDefinitions?.[index];
      const groupId = definition?.groupId;
      let type: "main" | "drop" = definition?.type === "drop" ? "drop" : "main";

      if (groupId) {
        if (firstIndexByGroup.has(groupId)) {
          type = "drop";
        } else {
          firstIndexByGroup.set(groupId, index);
        }
      }

      return {
        type,
        groupId,
      };
    });
  };

  const parseSetDefinitions = (
    notes: string | null | undefined,
    setCount: number,
  ): SetDefinition[] => {
    if (!notes) {
      return normalizeSetDefinitions(undefined, setCount);
    }

    try {
      const parsed = JSON.parse(notes);
      const setDefinitions = Array.isArray(parsed?.setDefinitions)
        ? parsed.setDefinitions
        : undefined;
      return normalizeSetDefinitions(setDefinitions, setCount);
    } catch {
      return normalizeSetDefinitions(undefined, setCount);
    }
  };

  const readLayoutCache = (): Record<string, SetDefinition[]> => {
    try {
      const raw = localStorage.getItem(WORKOUT_LAYOUT_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const writeLayoutCache = (cache: Record<string, SetDefinition[]>) => {
    localStorage.setItem(WORKOUT_LAYOUT_CACHE_KEY, JSON.stringify(cache));
  };

  const readHistoryLayoutCache = (): Record<string, SetDefinition[]> => {
    try {
      const raw = localStorage.getItem(WORKOUT_HISTORY_LAYOUT_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const writeHistoryLayoutCache = (cache: Record<string, SetDefinition[]>) => {
    localStorage.setItem(WORKOUT_HISTORY_LAYOUT_CACHE_KEY, JSON.stringify(cache));
  };

  const buildSetDefinitions = (workoutSets: WorkoutSet[]): SetDefinition[] =>
    workoutSets.map((set) => ({
      type: set.isDropSet ? "drop" : "main",
      groupId: set.dropSetGroupId,
    }));

  const getLayoutCacheKey = (
    programmeId: string,
    dayNumber: number,
    exerciseId: string,
  ) => `${programmeId}:${dayNumber}:${exerciseId}`;

  const getHistoryCacheKey = (
    exerciseId: string,
    weekNumber: number,
    dayNumber: number,
    date: string,
  ) => `${exerciseId}:${weekNumber}:${dayNumber}:${date.slice(0, 10)}`;

  const getCachedSetDefinitions = (
    programmeId: string | undefined,
    dayNumber: number | undefined,
    exerciseId: string,
  ): SetDefinition[] | undefined => {
    if (!programmeId || !dayNumber) return undefined;
    return readLayoutCache()[getLayoutCacheKey(programmeId, dayNumber, exerciseId)];
  };

  const persistLayoutCacheForExercises = (
    exercises: WorkoutExercise[],
    programmeId: string | undefined,
    dayNumber: number | undefined,
  ) => {
    if (!programmeId || !dayNumber) return;
    const cache = readLayoutCache();
    exercises.forEach((exercise) => {
      cache[getLayoutCacheKey(programmeId, dayNumber, exercise.exerciseId)] =
        buildSetDefinitions(exercise.workoutSets);
    });
    writeLayoutCache(cache);
  };

  const persistHistoryCacheForExercises = (
    exercises: WorkoutExercise[],
    weekNumber: number | undefined,
    dayNumber: number | undefined,
  ) => {
    if (!weekNumber || !dayNumber) return;
    const date = new Date().toISOString();
    const cache = readHistoryLayoutCache();
    exercises.forEach((exercise) => {
      cache[
        getHistoryCacheKey(exercise.exerciseId, weekNumber, dayNumber, date)
      ] = buildSetDefinitions(exercise.workoutSets);
    });
    writeHistoryLayoutCache(cache);
  };

  const applyHistoryLayoutFallback = (
    exerciseId: string,
    history: ExerciseHistoryEntry[],
  ): ExerciseHistoryEntry[] => {
    const cache = readHistoryLayoutCache();
    return history.map((entry) => {
      const cachedDefinitions = cache[
        getHistoryCacheKey(exerciseId, entry.weekNumber, entry.dayNumber, entry.date)
      ];
      if (!cachedDefinitions || cachedDefinitions.length === 0) {
        return entry;
      }

      return {
        ...entry,
        sets: [...entry.sets]
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((set, index) => ({
            ...set,
            setType:
              set.setType ?? (cachedDefinitions[index]?.type === "drop" ? "drop" : "main"),
            dropSetGroupId:
              set.dropSetGroupId ?? cachedDefinitions[index]?.groupId,
          })),
      };
    });
  };

  const createWorkoutSetsFromDefinitions = (
    setCount: number,
    notes?: string | null,
    fallbackDefinitions?: SetDefinition[],
  ): WorkoutSet[] =>
    normalizeSetDefinitions(
      fallbackDefinitions && fallbackDefinitions.length > 0
        ? fallbackDefinitions
        : parseSetDefinitions(notes, setCount),
      setCount,
    ).map((definition) => ({
      weight: "",
      reps: "",
      completed: false,
      isDropSet: definition.type === "drop",
      dropSetGroupId: definition.groupId,
      isNewlyAdded: false,
    }));

  const serializeSetDefinitions = (workoutSets: WorkoutSet[]): string =>
    JSON.stringify({
      setDefinitions: workoutSets.map((set) => ({
        type: set.isDropSet ? "drop" : "main",
        groupId: set.dropSetGroupId,
      })),
    });

  const buildSetLayoutsPayload = (exercises: WorkoutExercise[]) =>
    exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      setDefinitions: exercise.workoutSets.map((set) => ({
        type: set.isDropSet ? "drop" : "main",
        groupId: set.dropSetGroupId,
      })),
    }));

  const cleanupDropSetGroups = (workoutSets: WorkoutSet[]): WorkoutSet[] => {
    const groupsWithDropSets = new Set(
      workoutSets
        .filter((set) => set.isDropSet && set.dropSetGroupId)
        .map((set) => set.dropSetGroupId as string),
    );

    return workoutSets.map((set) =>
      set.dropSetGroupId && !groupsWithDropSets.has(set.dropSetGroupId)
        ? { ...set, dropSetGroupId: undefined }
        : set,
    );
  };

  const createDropSetGroupId = () =>
    `drop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const parseTargetReps = (value?: string | number | null): number | null => {
    if (value == null) return null;
    if (typeof value === "number") return Number.isNaN(value) ? null : value;

    const normalized = value.toLowerCase().replace(/reps?/g, "").trim();
    if (!normalized) return null;

    const parsed = parseInt(normalized, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const getOrderedSetRecommendations = (exercise: WorkoutExercise) =>
    [...(exercise.recommendation?.setRecommendations ?? [])].sort(
      (a, b) => a.setNumber - b.setNumber,
    );

  const getRecommendationIndexForSet = (
    workoutSets: WorkoutSet[],
    setIdx: number,
  ): number | null => {
    if (!workoutSets[setIdx] || workoutSets[setIdx].isNewlyAdded) return null;

    let recommendationIndex = -1;
    for (let idx = 0; idx <= setIdx; idx += 1) {
      if (!workoutSets[idx]?.isNewlyAdded) {
        recommendationIndex += 1;
      }
    }

    return recommendationIndex;
  };

  const getSetIndexForRecommendationIndex = (
    workoutSets: WorkoutSet[],
    recommendationIndex: number,
  ): number | null => {
    let currentRecommendationIndex = -1;

    for (let idx = 0; idx < workoutSets.length; idx += 1) {
      if (workoutSets[idx]?.isNewlyAdded) continue;

      currentRecommendationIndex += 1;
      if (currentRecommendationIndex === recommendationIndex) {
        return idx;
      }
    }

    return null;
  };

  const getRecommendationForSet = (
    exercise: WorkoutExercise,
    setIdx: number,
  ) => {
    const recommendationIndex = getRecommendationIndexForSet(
      exercise.workoutSets,
      setIdx,
    );

    if (recommendationIndex == null) return null;

    const orderedRecommendations = getOrderedSetRecommendations(exercise);
    return orderedRecommendations[recommendationIndex] ?? null;
  };

  const getTargetRepsForSet = (
    exercise: WorkoutExercise,
    setIdx: number,
  ): number | null => {
    return getRecommendationForSet(exercise, setIdx)?.recommendedReps ?? null;
  };

  const getSetRepIcon = (set: WorkoutSet, targetReps: number | null) => {
    if (!set.completed) return null;

    const actualReps = parseInt(set.reps, 10);
    if (Number.isNaN(actualReps)) return null;

    const effectiveTargetReps = set.completedTargetReps ?? targetReps;
    if (effectiveTargetReps == null) return null;

    if (actualReps === effectiveTargetReps) {
      return { src: BullseyeIcon, alt: "Target reps achieved" };
    }
    if (actualReps < effectiveTargetReps) {
      return { src: DownwardsIcon, alt: "Below target reps" };
    }
    if (actualReps > effectiveTargetReps) {
      return { src: ProgressIcon, alt: "Above target reps" };
    }

    return null;
  };

  const isVisualDropSetRow = (
    workoutSets: WorkoutSet[],
    setIdx: number,
  ): boolean => {
    const set = workoutSets[setIdx];
    if (!set) return false;
    if (set.isDropSet) return true;
    if (!set.dropSetGroupId) return false;

    const firstIndexInGroup = workoutSets.findIndex(
      (candidate) => candidate.dropSetGroupId === set.dropSetGroupId,
    );

    return firstIndexInGroup !== -1 && setIdx > firstIndexInGroup;
  };

  // Add exercise modal state
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedMuscleGroupFilter, setSelectedMuscleGroupFilter] = useState<string>("All");
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState<string>("All");
  const [replaceTargetExerciseId, setReplaceTargetExerciseId] = useState<string | null>(null);
  const [showCreateExerciseForm, setShowCreateExerciseForm] = useState(false);
  const [createExerciseForm, setCreateExerciseForm] = useState({ name: "", muscleGroup: "", equipment: "", category: "isolation" });
  const [savingCustomExercise, setSavingCustomExercise] = useState(false);
  const [createExerciseError, setCreateExerciseError] = useState("");

  const navigate = useNavigate();

  // Safely navigate with workout in progress check
  const safeNavigate = (path: string) => {
    // Show modal if workout has been started (timer has run or is running)
    console.log("🔍 safeNavigate called", {
      path,
      workoutCompleted,
      timerRunning,
      secondsElapsed,
    });
    if (!workoutCompleted && (timerRunning || secondsElapsed > 0)) {
      console.log("✅ Showing modal");
      setNextLocation(path);
      setShowLeavingModal(true);
    } else {
      console.log("➡️ Navigating directly to", path);
      navigate(path);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    localStorage.removeItem("workoutSession");
    navigate("/login");
  };

  const endProgramme = async () => {
    if (!userProgram) return;

    setEndingProgramme(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/auth/user-programs/${userProgram.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "COMPLETED" }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to end programme");
      }

      // Clear workout session and navigate back
      localStorage.removeItem("workoutSession");
      setShowEndProgrammeModal(false);
      navigate("/programmes");
    } catch (err: any) {
      console.error("Error ending programme:", err);
      alert("Failed to end programme. Please try again.");
    } finally {
      setEndingProgramme(false);
    }
  };

  const adjustProgrammeWeeks = async (delta: number) => {
    if (!userProgram || updatingProgrammeWeeks) return;

    const currentWeeks = userProgram.programme.weeks;
    const minWeeks = Math.max(1, userProgram.currentWeek - 1);
    const nextWeeks = Math.max(minWeeks, currentWeeks + delta);
    const wasInDeloadWeek = userProgram.currentWeek === currentWeeks + 1;
    const exitingDeloadByAddingWeek = wasInDeloadWeek && delta > 0;

    if (nextWeeks === currentWeeks) return;

    setUpdatingProgrammeWeeks(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/auth/programmes/${userProgram.programme.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: userProgram.programme.name,
            daysPerWeek: userProgram.programme.daysPerWeek,
            weeks: nextWeeks,
            bodyPartFocus: userProgram.programme.bodyPartFocus,
            description: userProgram.programme.description,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update programme duration");
      }

      setUserProgram((prev) =>
        prev
          ? {
              ...prev,
              programme: {
                ...prev.programme,
                weeks: nextWeeks,
              },
            }
          : prev,
      );

      if (todayExercises.length > 0) {
        if (exitingDeloadByAddingWeek) {
          const restoredExercises = todayExercises.map((exercise) => {
            if (exercise.workoutSets.length >= exercise.sets) {
              return {
                ...exercise,
                recommendation: exercise.recommendation
                  ? { ...exercise.recommendation, setRecommendations: [] }
                  : exercise.recommendation,
              };
            }

            const restoredSets = createWorkoutSetsFromDefinitions(
              exercise.sets,
              exercise.notes,
            ).map((restoredSet, setIdx) => {
              const existingSet = exercise.workoutSets[setIdx];
              if (!existingSet) {
                return restoredSet;
              }

              return {
                ...restoredSet,
                ...existingSet,
                completed: false,
                completedTargetReps: null,
              };
            });

            return {
              ...exercise,
              recommendation: exercise.recommendation
                ? { ...exercise.recommendation, setRecommendations: [] }
                : exercise.recommendation,
              workoutSets: restoredSets,
            };
          });

          setTodayExercises(restoredExercises);
          await loadProgressionRecommendationsForExercises(restoredExercises);
        } else {
          await loadProgressionRecommendations();
        }
      }
    } catch (err) {
      console.error("Error updating programme weeks:", err);
      alert("Failed to update programme weeks. Please try again.");
    } finally {
      setUpdatingProgrammeWeeks(false);
    }
  };

  const loadExerciseHistory = async (
    exerciseId: string,
    limit: number,
    mode: "initial" | "more" = "initial",
  ) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setHistoryError("Please log in again to load exercise history.");
        return;
      }

      const response = await fetch(
        `/auth/workouts/history/${exerciseId}?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        let backendError = "";
        try {
          const errorPayload = await response.json();
          backendError = errorPayload?.error || "";
        } catch {
          // ignore non-JSON response
        }

        if (response.status === 401) {
          throw new Error("Please log in again to load exercise history.");
        }

        if (response.status === 403) {
          throw new Error(
            backendError || "You do not currently have access to exercise history.",
          );
        }

        throw new Error(
          backendError || `Failed to load exercise history (${response.status})`,
        );
      }

      const result = await response.json();
      const history: ExerciseHistoryEntry[] = Array.isArray(result.history)
        ? result.history
        : [];
      setExerciseHistory(applyHistoryLayoutFallback(exerciseId, history));
      setHasMoreHistory(history.length >= limit);
    } catch (err) {
      console.error("Error loading exercise history:", err);
      setHistoryError(
        err instanceof Error
          ? err.message
          : "Could not load exercise history right now.",
      );
    } finally {
      if (mode === "more") {
        setHistoryLoadingMore(false);
      } else {
        setHistoryLoading(false);
      }
    }
  };

  const openExerciseHistory = async (exercise: WorkoutExercise) => {
    setOpenExerciseMenu(null);
    setShowExerciseHistoryModal(true);
    setHistoryExerciseName(exercise.name);
    setHistoryExerciseId(exercise.exerciseId);
    setHistoryLimit(EXERCISE_HISTORY_PAGE_SIZE);
    setExerciseHistory([]);
    setHistoryError("");
    setHasMoreHistory(false);
    setHistoryLoading(true);

    await loadExerciseHistory(exercise.exerciseId, EXERCISE_HISTORY_PAGE_SIZE);
  };

  const loadMoreExerciseHistory = async () => {
    if (!historyExerciseId || historyLoadingMore || !hasMoreHistory) {
      return;
    }

    const nextLimit = historyLimit + EXERCISE_HISTORY_PAGE_SIZE;
    setHistoryLimit(nextLimit);
    setHistoryLoadingMore(true);
    await loadExerciseHistory(historyExerciseId, nextLimit, "more");
  };

  // Exercise menu state
  const [openExerciseMenu, setOpenExerciseMenu] = useState<string | null>(null);
  // Set menu state (keyed by `${exerciseId}:${setIdx}`)
  const [openSetMenu, setOpenSetMenu] = useState<string | null>(null);
  const [setMenuPosition, setSetMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Create refs for menu containers to track click-outside
  const exerciseMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setMenuDropdownRef = useRef<HTMLDivElement>(null);
  const programmeCalendarRef = useRef<HTMLDivElement>(null);

  // Tracks the weight value at the moment a weight input is focused, so onBlur can
  // use the original weight (not mid-typing state) for the inverse Epley calculation.
  const weightAtFocusRef = useRef<{
    exerciseId: string;
    setIndex: number;
    weight: string;
  } | null>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check exercise menus
      if (openExerciseMenu) {
        const menuRef = exerciseMenuRefs.current.get(openExerciseMenu);
        if (menuRef && !menuRef.contains(event.target as Node)) {
          setOpenExerciseMenu(null);
        }
      }

      // Check set menus
      if (openSetMenu) {
        const menuRef = setMenuRefs.current.get(openSetMenu);
        const dropdownRef = setMenuDropdownRef.current;
        if (
          menuRef &&
          !menuRef.contains(event.target as Node) &&
          (!dropdownRef || !dropdownRef.contains(event.target as Node))
        ) {
          setOpenSetMenu(null);
          setSetMenuPosition(null);
        }
      }

      if (showProgrammeCalendarDropdown) {
        const calendarNode = programmeCalendarRef.current;
        if (calendarNode && !calendarNode.contains(event.target as Node)) {
          setShowProgrammeCalendarDropdown(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openExerciseMenu, openSetMenu, showProgrammeCalendarDropdown]);

  // Cleanup old refs when exercises change
  useEffect(() => {
    return () => {
      exerciseMenuRefs.current.clear();
      setMenuRefs.current.clear();
    };
  }, []);

  const moveExercise = (exerciseId: string, direction: "up" | "down") => {
    setTodayExercises((prev) => {
      const idx = prev.findIndex((e) => e.exerciseId === exerciseId);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[swapIdx];
      next[swapIdx] = next[idx];
      next[idx] = tmp;
      return next;
    });
    setOpenExerciseMenu(null);
  };

  const replaceExercise = async (exerciseId: string) => {
    const exercise = todayExercises.find((e) => e.exerciseId === exerciseId);
    if (!exercise) return;
    setReplaceTargetExerciseId(exerciseId);
    setSelectedMuscleGroupFilter(exercise.muscleGroup || "All");
    setSelectedEquipmentFilter("All");
    setShowCreateExerciseForm(false);
    setShowAddExerciseModal(true);
    setOpenExerciseMenu(null);
    await fetchAvailableExercises();
  };

  const addSetToExercise = (exerciseId: string) => {
    const updatedExercises = todayExercises.map((ex) =>
      ex.exerciseId === exerciseId
        ? {
            ...ex,
            recommendation: ex.recommendation
              ? { ...ex.recommendation, setRecommendations: [] }
              : ex.recommendation,
            workoutSets: [
              ...ex.workoutSets,
                {
                  weight: "",
                  reps: "",
                  completed: false,
                  isDropSet: false,
                  isNewlyAdded: true,
                },
            ],
          }
        : ex,
    );
    setTodayExercises(updatedExercises);
    setOpenExerciseMenu(null);
    loadProgressionRecommendationsForExercises(updatedExercises);
  };

  const skipNextSet = (exerciseId: string) => {
    setTodayExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const idx = ex.workoutSets.findIndex((s) => !s.completed);
        if (idx === -1) return ex;
        const nextSets = ex.workoutSets.map((s, i) =>
          i === idx ? { ...s, completed: true } : s,
        );
        return { ...ex, workoutSets: nextSets };
      }),
    );
    setOpenExerciseMenu(null);
  };

  const deleteExerciseById = (exerciseId: string) => {
    if (!confirm("Delete this exercise from the workout?")) return;
    setTodayExercises((prev) =>
      prev.filter((ex) => ex.exerciseId !== exerciseId),
    );
    setOpenExerciseMenu(null);
  };

  // Fetch all available exercises for adding to workout
  const fetchAvailableExercises = async () => {
    setLoadingExercises(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/auth/exercises/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch exercises");
      const exercises = await res.json();
      setAvailableExercises(exercises);
    } catch (err) {
      console.error("Error fetching exercises:", err);
      alert("Failed to load exercises");
    } finally {
      setLoadingExercises(false);
    }
  };

  // Add exercise to workout
  const addExerciseToWorkout = (exercise: any) => {
    if (replaceTargetExerciseId) {
      setTodayExercises((prev) =>
        prev.map((ex) =>
          ex.exerciseId === replaceTargetExerciseId
            ? {
                ...ex,
                name: exercise.name,
                exerciseId: exercise.id,
                muscleGroup: exercise.muscleGroup || ex.muscleGroup,
                recommendation: undefined,
              }
            : ex,
        ),
      );
      setShowAddExerciseModal(false);
      setReplaceTargetExerciseId(null);
      setSelectedMuscleGroupFilter("All");
      return;
    }

    // Check if exercise is already in the workout
    const alreadyExists = todayExercises.some(
      (ex) => ex.exerciseId === exercise.id,
    );
    if (alreadyExists) {
      alert("This exercise is already in your workout");
      return;
    }

    // Add exercise with default 3 sets
    const newWorkoutExercise: WorkoutExercise = {
      id: `temp-${Date.now()}-${exercise.id}`,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: 3,
      reps: "8-12",
      exerciseId: exercise.id,
      strengthRole:
        userProgram?.programme?.progressionFocus === "STRENGTH"
          ? "ACCESSORY"
          : undefined,
      workoutSets: [
        { weight: "", reps: "", completed: false, isDropSet: false },
        { weight: "", reps: "", completed: false, isDropSet: false },
        { weight: "", reps: "", completed: false, isDropSet: false },
      ],
    };

    setTodayExercises((prev) => [...prev, newWorkoutExercise]);
    setShowAddExerciseModal(false);
    setReplaceTargetExerciseId(null);
  };

  const closeAddExerciseModal = () => {
    setShowAddExerciseModal(false);
    setReplaceTargetExerciseId(null);
    setSelectedMuscleGroupFilter("All");
    setSelectedEquipmentFilter("All");
    setShowCreateExerciseForm(false);
    setCreateExerciseForm({ name: "", muscleGroup: "", equipment: "", category: "isolation" });
    setCreateExerciseError("");
  };

  // Open add exercise modal
  const openAddExerciseModal = () => {
    setReplaceTargetExerciseId(null);
    setSelectedMuscleGroupFilter("All");
    setSelectedEquipmentFilter("All");
    setShowCreateExerciseForm(false);
    setShowAddExerciseModal(true);
    fetchAvailableExercises();
  };

  const saveCustomExercise = async () => {
    if (!createExerciseForm.name.trim() || !createExerciseForm.muscleGroup) {
      setCreateExerciseError("Name and muscle group are required.");
      return;
    }
    setSavingCustomExercise(true);
    setCreateExerciseError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/auth/exercises/custom", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(createExerciseForm),
      });
      if (!res.ok) throw new Error("Failed to create exercise");
      const exercise = await res.json();
      setAvailableExercises((prev) => [...prev, exercise]);
      addExerciseToWorkout(exercise);
    } catch (err) {
      setCreateExerciseError("Failed to save exercise. Please try again.");
    } finally {
      setSavingCustomExercise(false);
    }
  };

  // Get unique muscle groups from available exercises
  const getUniqueMuscleGroups = () => {
    const groups = availableExercises.map(ex => ex.muscleGroup);
    return ["All", ...Array.from(new Set(groups)).sort()];
  };

  // Get unique equipment types from available exercises
  const getUniqueEquipmentTypes = () => {
    const types = availableExercises.map(ex => ex.equipment).filter(Boolean);
    return ["All", ...Array.from(new Set(types as string[])).sort()];
  };

  // Filter exercises based on selected muscle group and equipment
  const getFilteredExercises = () => {
    return availableExercises.filter(ex => {
      const muscleMatch = selectedMuscleGroupFilter === "All" || ex.muscleGroup === selectedMuscleGroupFilter;
      const equipMatch = selectedEquipmentFilter === "All" || ex.equipment === selectedEquipmentFilter;
      return muscleMatch && equipMatch;
    });
  };

  // Check if all sets in all exercises are completed
  const areAllSetsCompleted = () => {
    return todayExercises.every((exercise) =>
      exercise.workoutSets.every((set) => set.completed)
    );
  };

  // Set-level actions
  const addSetBelow = (exerciseId: string, setIdx: number) => {
    const updatedExercises = todayExercises.map((ex) =>
      ex.exerciseId === exerciseId
        ? {
            ...ex,
            recommendation: ex.recommendation
              ? { ...ex.recommendation, setRecommendations: [] }
              : ex.recommendation,
            workoutSets: cleanupDropSetGroups([
              ...ex.workoutSets.slice(0, setIdx + 1),
              {
                weight: "",
                reps: "",
                completed: false,
                isDropSet: false,
                isNewlyAdded: true,
              },
              ...ex.workoutSets.slice(setIdx + 1),
            ]),
          }
        : ex,
    );
    setTodayExercises(updatedExercises);
    setOpenSetMenu(null);
    loadProgressionRecommendationsForExercises(updatedExercises);
  };

  const createDropSet = (exerciseId: string, setIdx: number) => {
    const updatedExercises = todayExercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex;

      const targetSet = ex.workoutSets[setIdx];
      if (!targetSet || targetSet.isDropSet || targetSet.dropSetGroupId) {
        return ex;
      }

      const dropSetGroupId = createDropSetGroupId();
      const updatedSets = [...ex.workoutSets];
      updatedSets[setIdx] = {
        ...targetSet,
        dropSetGroupId,
      };
      updatedSets.splice(
        setIdx + 1,
        0,
        {
          weight: "",
          reps: "",
          completed: false,
          isDropSet: true,
          dropSetGroupId,
          isNewlyAdded: true,
        },
        {
          weight: "",
          reps: "",
          completed: false,
          isDropSet: true,
          dropSetGroupId,
          isNewlyAdded: true,
        },
      );

      return {
        ...ex,
        // Clear stale setRecommendations immediately — positions have shifted
        // and old entries would falsely match the new drop set positions.
        // The re-fetch below will repopulate with the correct layout.
        recommendation: ex.recommendation
          ? { ...ex.recommendation, setRecommendations: [] }
          : ex.recommendation,
        workoutSets: updatedSets,
      };
    });

    setTodayExercises(updatedExercises);
    setOpenSetMenu(null);
    loadProgressionRecommendationsForExercises(updatedExercises);
  };

  const addAnotherDropSet = (exerciseId: string, setIdx: number) => {
    const updatedExercises = todayExercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex;

      const targetSet = ex.workoutSets[setIdx];
      const dropSetGroupId = targetSet?.dropSetGroupId;
      if (!dropSetGroupId) return ex;

      const lastIndexInGroup = ex.workoutSets.reduce(
        (lastIndex, set, index) =>
          set.dropSetGroupId === dropSetGroupId ? index : lastIndex,
        setIdx,
      );

      const updatedSets = [...ex.workoutSets];
      updatedSets.splice(lastIndexInGroup + 1, 0, {
        weight: "",
        reps: "",
        completed: false,
        isDropSet: true,
        dropSetGroupId,
        isNewlyAdded: true,
      });

      return {
        ...ex,
        recommendation: ex.recommendation
          ? { ...ex.recommendation, setRecommendations: [] }
          : ex.recommendation,
        workoutSets: updatedSets,
      };
    });

    setTodayExercises(updatedExercises);
    setOpenSetMenu(null);
    loadProgressionRecommendationsForExercises(updatedExercises);
  };

  const removeDropSetGroup = (exerciseId: string, setIdx: number) => {
    const updatedExercises = todayExercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex;

      const targetSet = ex.workoutSets[setIdx];
      const dropSetGroupId = targetSet?.dropSetGroupId;
      if (!dropSetGroupId) return ex;

      const updatedSets = ex.workoutSets
        .filter((set) => !(set.isDropSet && set.dropSetGroupId === dropSetGroupId))
        .map((set) =>
          set.dropSetGroupId === dropSetGroupId
            ? { ...set, dropSetGroupId: undefined }
            : set,
        );

      return {
        ...ex,
        workoutSets: cleanupDropSetGroups(updatedSets),
      };
    });

    setTodayExercises(updatedExercises);
    setOpenSetMenu(null);
    loadProgressionRecommendationsForExercises(updatedExercises);
  };

  const skipSet = (exerciseId: string, setIdx: number) => {
    setTodayExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId
          ? {
              ...ex,
              workoutSets: ex.workoutSets.map((s, i) =>
                i === setIdx ? { ...s, completed: true } : s,
              ),
            }
          : ex,
      ),
    );
    setOpenSetMenu(null);
  };

  const deleteSet = (exerciseId: string, setIdx: number) => {
    if (!confirm("Delete this set?")) return;
    setTodayExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;

        const targetSet = ex.workoutSets[setIdx];
        if (!targetSet) return ex;

        const updatedSets = !targetSet.isDropSet && targetSet.dropSetGroupId
          ? ex.workoutSets.filter(
              (set, index) =>
                index !== setIdx && set.dropSetGroupId !== targetSet.dropSetGroupId,
            )
          : ex.workoutSets.filter((_, index) => index !== setIdx);

        return {
          ...ex,
          workoutSets: cleanupDropSetGroups(updatedSets),
        };
      }),
    );
    setOpenSetMenu(null);
  };

  const calculateProgress = (userProgram: UserProgram) => {
    const totalDays =
      userProgram.programme.weeks * userProgram.programme.daysPerWeek;
    const completedDays =
      (userProgram.currentWeek - 1) * userProgram.programme.daysPerWeek +
      (userProgram.currentDay - 1);
    return Math.round((completedDays / totalDays) * 100);
  };

  const startTimer = () => {
    if (!timerRunning && !workoutStartTime) {
      setWorkoutStartTime(new Date());
    }
    setTimerRunning(true);
  };

  const pauseTimer = () => {
    setTimerRunning(false);
  };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const toPositiveNumber = (raw: string | number | null | undefined) => {
    if (raw === null || raw === undefined) return null;
    const value = typeof raw === "number" ? raw : parseFloat(String(raw));
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  const calculateRepsFromOneRepMax = (oneRepMax: number, weight: number) => {
    if (!Number.isFinite(oneRepMax) || !Number.isFinite(weight) || weight <= 0) {
      return "";
    }

    // Inverse Epley: reps = 30 * (1RM / weight - 1)
    const reps = 30 * (oneRepMax / weight - 1);
    const rounded = Math.max(1, Math.round(reps));
    return String(rounded);
  };

  const formatWeightForInput = (weight: number) => {
    const rounded = Math.max(0.5, Math.round(weight * 10) / 10);
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  // Convert a kg string stored in state to the user's preferred display string.
  const displaySetWeight = (kgStr: string): string => {
    if (!kgStr.trim()) return kgStr;
    const kg = parseFloat(kgStr);
    if (isNaN(kg)) return kgStr;
    if (unitSystem === "imperial") {
      const lbs = Math.round(kgToLbs(kg) * 10) / 10;
      return Number.isInteger(lbs) ? String(lbs) : lbs.toFixed(1);
    }
    return kgStr;
  };

  // Convert the user's typed input (in their preferred unit) back to a kg string.
  const inputWeightToKg = (input: string): string => {
    if (!input.trim()) return input;
    const val = parseFloat(input);
    if (isNaN(val)) return input;
    if (unitSystem === "imperial") {
      const kg = Math.round(lbsToKg(val) * 10) / 10;
      return Number.isInteger(kg) ? String(kg) : kg.toFixed(1);
    }
    return input;
  };

  const weightUnit = unitSystem === "imperial" ? "lbs" : "kg";

  const downloadShareImage = (blob: Blob, filename: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const openImageInNewTab = (dataUrl: string) => {
    const newWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!newWindow) return;

    newWindow.document.write(
      `<html><head><title>Workout Summary</title></head><body style="margin:0;background:#0B1220;display:flex;align-items:center;justify-content:center;"><img src="${dataUrl}" alt="Workout summary" style="max-width:100%;height:auto;" /></body></html>`,
    );
    newWindow.document.close();
  };

  const clearSharePreview = () => {
    setSharePreviewUrl("");
    setSharePreviewFileName("");
    setSharePreviewBlob(null);
  };

  const closeShareSummaryPanel = () => {
    setShowShareSummaryPanel(false);
    setShareSummaryError("");
    clearSharePreview();
  };

  const buildShareImage = async () => {
    if (!summaryShareCaptureRef.current) {
      throw new Error("Share summary container missing");
    }

    const shareCanvas = await html2canvas(summaryShareCaptureRef.current, {
      backgroundColor: "#0B1220",
      scale: Math.min(3, Math.max(2, window.devicePixelRatio || 1)),
      useCORS: true,
      ignoreElements: (element) =>
        element instanceof HTMLElement &&
        element.dataset.shareIgnore === "true",
    });

    const dataUrl = shareCanvas.toDataURL("image/png", 1);
    const blob = await fetch(dataUrl).then((response) => response.blob());

    if (!blob || blob.size === 0) {
      throw new Error("Could not generate share image.");
    }

    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `workout-summary-${dateStamp}.png`;

    setSharePreviewUrl(dataUrl);
    setSharePreviewFileName(fileName);
    setSharePreviewBlob(blob);

    return { dataUrl, blob, fileName };
  };

  const handleDownloadSharePreview = () => {
    if (!sharePreviewBlob || !sharePreviewFileName) {
      setShareSummaryError("Generate the share image first.");
      return;
    }

    downloadShareImage(sharePreviewBlob, sharePreviewFileName);
  };

  const handleShareWorkoutSummary = async () => {
    if (!summaryShareCaptureRef.current || sharingSummary) return;

    setSharingSummary(true);
    setShareSummaryError("");

    try {
      const { dataUrl, blob, fileName } = await buildShareImage();
      const shareFile = new File([blob], fileName, { type: "image/png" });
      const sharePayload = {
        title: "Workout Complete",
        text: "My workout summary",
        files: [shareFile],
      };

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare(sharePayload)
      ) {
        try {
          await navigator.share(sharePayload);
        } catch (shareErr: any) {
          if (shareErr?.name === "AbortError") {
            return;
          }
          downloadShareImage(blob, fileName);
          setShareSummaryError(
            "We couldn't open sharing here, so your image was downloaded.",
          );
        }
      } else if (navigator.share) {
        try {
          await navigator.share({
            title: "Workout Complete",
            text: "Workout complete. Sharing my session summary.",
          });
          setShareSummaryError(
            "Preview image generated below. We also downloaded it so you can attach it to your post.",
          );
          downloadShareImage(blob, fileName);
        } catch (shareErr: any) {
          if (shareErr?.name === "AbortError") {
            return;
          }
          downloadShareImage(blob, fileName);
          setShareSummaryError(
            "Sharing wasn't available with image attachment here, so your image was downloaded.",
          );
        }
      } else {
        try {
          downloadShareImage(blob, fileName);
          setShareSummaryError(
            "Sharing isn't supported on this device, so your image was downloaded.",
          );
        } catch {
          openImageInNewTab(dataUrl);
          setShareSummaryError(
            "Sharing isn't supported here. We opened your image in a new tab instead.",
          );
        }
      }
    } catch (err) {
      console.error("Failed to share workout summary:", err);
      setShareSummaryError(
        "We couldn't generate your share image right now. Please try again.",
      );
    } finally {
      setSharingSummary(false);
    }
  };

  const renderWorkoutSummaryCore = () => (
    <>
      <h2 className="text-white text-2xl font-extrabold tracking-tight text-center mb-4">
        Workout Complete
      </h2>

      <div className="space-y-3 mb-6">
        {/* Volume vs last workout + vs week 1 */}
        {(weeklySummary.previousWorkoutComparison ||
          (weeklySummary.strengthGainVsProgramStart !== null &&
            !isNaN(weeklySummary.strengthGainVsProgramStart))) && (
          <div className="grid grid-cols-2 gap-3">
            {weeklySummary.previousWorkoutComparison && (
              <div className="glass-subtile p-3 rounded-lg border border-[#86FF99]/30">
                <p className="text-[#A0AEC0] text-[10px] uppercase tracking-wide">Vs last session</p>
                <p className="text-white font-bold text-sm mt-1">
                  {weeklySummary.previousWorkoutComparison.totalVolumeChangePct === null
                    ? "No baseline"
                    : `${weeklySummary.previousWorkoutComparison.totalVolumeChangePct > 0 ? "+" : ""}${weeklySummary.previousWorkoutComparison.totalVolumeChangePct.toFixed(1)}% volume`}
                </p>
                <p className="text-[#86FF99] text-xs font-semibold mt-0.5">
                  {(() => {
                    const rawKg = weeklySummary.previousWorkoutComparison.totalExtraWeightMovedKg;
                    const val = unitSystem === "imperial" ? Math.round(kgToLbs(Math.abs(rawKg)) * 10) / 10 : Math.abs(rawKg);
                    const unit = weightUnit;
                    return rawKg > 0
                      ? `+${val.toFixed(1)}${unit} load`
                      : rawKg < 0
                        ? `-${val.toFixed(1)}${unit} less`
                        : "Same load";
                  })()}
                </p>
              </div>
            )}
            {weeklySummary.strengthGainVsProgramStart !== null &&
              !isNaN(weeklySummary.strengthGainVsProgramStart) && (
                <div className="glass-subtile p-3 rounded-lg border border-[#246BFD]/30">
                  <p className="text-[#A0AEC0] text-[10px] uppercase tracking-wide">Vs week 1</p>
                  <p className="text-white font-bold text-sm mt-1">
                    {weeklySummary.strengthGainVsProgramStart > 0
                      ? `+${weeklySummary.strengthGainVsProgramStart.toFixed(1)}% stronger`
                      : weeklySummary.strengthGainVsProgramStart < 0
                        ? `-${Math.abs(weeklySummary.strengthGainVsProgramStart).toFixed(1)}% weaker`
                        : "No change"}
                  </p>
                </div>
              )}
          </div>
        )}

        {/* Personal records */}
        {weeklySummary.personalRecords && weeklySummary.personalRecords.length > 0 && (
          <div className="glass-subtile p-3 rounded-lg border border-[#FBA3FF]/30">
            <p className="text-[#FBA3FF] text-sm font-bold mb-2">🏆 Personal Records</p>
            {(() => {
              const grouped: Record<string, any[]> = {};
              weeklySummary.personalRecords.forEach((pr: any) => {
                if (pr.metric !== "volume") {
                  if (!grouped[pr.exerciseName]) grouped[pr.exerciseName] = [];
                  grouped[pr.exerciseName].push(pr);
                }
              });
              return Object.entries(grouped).slice(0, 4).map(([name, records]) => {
                const w = records.find((r) => r.metric === "weight");
                const r = records.find((r) => r.metric === "repsAtWeight");
                if (!w && !r) return null;
                return (
                  <div key={name} className="mb-1 last:mb-0">
                    {w && <p className="text-white text-sm">{name}: {unitSystem === "imperial" ? `${Math.round(kgToLbs(w.value) * 10) / 10}lbs` : `${w.value}kg`} — new best</p>}
                    {r && <p className="text-white text-sm">{name}: {r.value} reps @ {unitSystem === "imperial" ? `${Math.round(kgToLbs(r.contextWeightKg) * 10) / 10}lbs` : `${r.contextWeightKg}kg`} — new best</p>}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Volume updates (set added / exercise added) */}
        {weeklySummary.recommendations?.some((rec: any) => rec.volumeSuggestion) && (
          <div className="glass-subtile p-3 rounded-lg border border-[#FFC857]/30">
            <p className="text-[#FFC857] text-sm font-semibold mb-1.5">Volume updates</p>
            {weeklySummary.recommendations
              .filter((rec: any) => rec.volumeSuggestion)
              .map((rec: any, idx: number) => (
                <p key={idx} className="text-[#D1D5DB] text-sm mb-1 last:mb-0">
                  <span className="font-medium text-white">{getExerciseName(rec.exerciseId)}</span>
                  {rec.volumeSuggestion === "add_set"
                    ? " — set added for next session"
                    : " — complementary exercise added to programme"}
                </p>
              ))}
          </div>
        )}

        {/* Streak */}
        {weeklySummary.streak && (
          <div className="glass-subtile p-3 rounded-lg border border-[#FF8C42]/30">
            <p className="text-[#FFC857] text-sm font-semibold">
              {weeklySummary.streak.streakCount > 0
                ? `${weeklySummary.streak.streakCount} window streak 🔥`
                : "Start your streak"}
            </p>
            <div className="w-full h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
              <div
                className="h-full bg-[#FFC857]"
                style={{
                  width: `${Math.min(100, Math.round((weeklySummary.streak.currentWindowWorkouts / Math.max(weeklySummary.streak.streakGoal, 1)) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[#A0AEC0] text-xs mt-1.5">
              {weeklySummary.streak.currentWindowWorkouts}/{weeklySummary.streak.streakGoal} workouts this window
              {weeklySummary.streak.milestoneReached && weeklySummary.streak.milestoneWindowCount
                ? ` · ${weeklySummary.streak.milestoneWindowCount} windows milestone!`
                : ""}
            </p>
          </div>
        )}

        {/* End-of-week: sets per muscle group */}
        {weeklySummary.isEndOfWeek && weeklySummary.weeklySetsByMuscleGroup &&
          Object.keys(weeklySummary.weeklySetsByMuscleGroup).length > 0 && (
          <div className="glass-subtile p-3 rounded-lg border border-[#86FF99]/20">
            <p className="text-[#86FF99] text-sm font-semibold mb-2">Weekly volume</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {(Object.entries(weeklySummary.weeklySetsByMuscleGroup as Record<string, number>))
                .sort((a, b) => b[1] - a[1])
                .map(([muscle, sets]) => (
                  <p key={muscle} className="text-sm">
                    <span className="text-[#A0AEC0]">{muscle}</span>
                    <span className="text-white font-semibold"> {sets} sets</span>
                  </p>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  // Simple update: just stores the raw value. For weight fields the Epley
  // cascade runs in finalizeWeightChange (onBlur), not here (onChange), so
  // that mid-typing intermediate values never trigger wrong recalculations.
  const updateSetData = (
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps",
    value: string,
  ) => {
    setTodayExercises((prev) =>
      prev.map((exercise) =>
        exercise.exerciseId === exerciseId
          ? {
              ...exercise,
              workoutSets: exercise.workoutSets.map((set, idx) =>
                idx === setIndex ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    );
  };

  // Called onBlur of the weight input. Uses the weight that was present when the
  // field was focused (saved in weightAtFocusRef) so the 1RM is always derived
  // from a clean committed value, never from a partial typed string.
  const finalizeWeightChange = (exerciseId: string, setIndex: number) => {
    const captured = weightAtFocusRef.current;
    weightAtFocusRef.current = null;

    setTodayExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.exerciseId !== exerciseId) return exercise;

        const setToUpdate = exercise.workoutSets[setIndex];
        if (!setToUpdate) return exercise;

        const previousEditedWeight =
          captured?.exerciseId === exerciseId && captured?.setIndex === setIndex
            ? toPositiveNumber(captured.weight)
            : toPositiveNumber(setToUpdate.weight);

        const newEditedWeight = toPositiveNumber(setToUpdate.weight);

        // Nothing to do if the new weight is invalid or unchanged
        if (!newEditedWeight) return exercise;
        if (previousEditedWeight && previousEditedWeight === newEditedWeight)
          return exercise;

        const weightDelta =
          previousEditedWeight && newEditedWeight
            ? newEditedWeight - previousEditedWeight
            : null;

        const recommendationForSet = getRecommendationForSet(
          exercise,
          setIndex,
        );

        // Use the programme recommendation as the primary 1RM anchor — it is the
        // stable "ground truth" (original planned weight × reps) and does not
        // drift with each edit. Only fall back to the previous-edit values when
        // no recommendation exists (custom exercise / first-ever set).
        const fallbackWeight = toPositiveNumber(
          recommendationForSet?.recommendedWeight,
        );
        const fallbackReps = toPositiveNumber(
          recommendationForSet?.recommendedReps,
        );

        const anchorWeight = fallbackWeight || previousEditedWeight;
        const anchorReps   = fallbackReps   || toPositiveNumber(setToUpdate.reps);

        const oneRepMax =
          anchorWeight && anchorReps
            ? estimate1RM(anchorWeight, anchorReps)
            : null;

        if (!oneRepMax) return exercise;

        const updatedSets = exercise.workoutSets.map((set, idx) => {
          if (idx < setIndex) return set;

          let nextWeightRaw =
            idx === setIndex ? setToUpdate.weight : set.weight;
          if (idx > setIndex && weightDelta !== null) {
            const currentWeight = toPositiveNumber(set.weight);
            if (currentWeight) {
              nextWeightRaw = formatWeightForInput(currentWeight + weightDelta);
            }
          }

          const nextWeight = toPositiveNumber(nextWeightRaw);
          if (!nextWeight) {
            return idx === setIndex
              ? { ...set, weight: setToUpdate.weight }
              : { ...set, weight: nextWeightRaw };
          }

          // If the user has returned to exactly the anchor weight, restore the
          // anchor reps directly — the formula doesn't round-trip cleanly
          // (estimate1RM then getSuggestedReps at the same weight gives ~10 not 11).
          const suggestedReps =
            !anchorWeight || !anchorReps
              ? 1
              : Math.abs(nextWeight - anchorWeight) < 0.5
                ? anchorReps
                : getSuggestedReps(anchorWeight, anchorReps, nextWeight);

          return {
            ...set,
            weight: idx === setIndex ? setToUpdate.weight : nextWeightRaw,
            reps: String(suggestedReps),
          };
        });

        const orderedRecommendations = getOrderedSetRecommendations(exercise);

        const updatedRecommendation = exercise.recommendation
          ? {
              ...exercise.recommendation,
              setRecommendations: orderedRecommendations.map((rec, recIdx) => {
                const mappedSetIdx = getSetIndexForRecommendationIndex(
                  exercise.workoutSets,
                  recIdx,
                );

                if (mappedSetIdx == null || mappedSetIdx < setIndex) {
                  return rec;
                }

                const updatedSet = updatedSets[mappedSetIdx];
                if (!updatedSet) return rec;

                const recWeight = toPositiveNumber(updatedSet.weight);
                const recReps = parseInt(updatedSet.reps, 10);

                return {
                  ...rec,
                  // Do NOT update recommendedWeight or recommendedReps — they are the
                  // original programme targets and must stay stable so that
                  // finalizeWeightChange always has a clean 1RM anchor regardless of
                  // how many times the user edits the weight field.
                };
              }),
            }
          : exercise.recommendation;

        return {
          ...exercise,
          workoutSets: updatedSets,
          recommendation: updatedRecommendation,
        };
      }),
    );
  };

  const toggleSetCompletion = (exerciseId: string, setIndex: number) => {
    setTodayExercises((prev) =>
      prev.map((exercise) =>
        exercise.exerciseId === exerciseId
          ? {
              ...exercise,
              workoutSets: exercise.workoutSets.map((set, idx) => {
                if (idx === setIndex) {
                  // Only allow completion if weight and reps are filled
                  const canComplete = set.weight.trim() && set.reps.trim();
                  if (!canComplete) {
                    return {
                      ...set,
                      completed: false,
                      completedTargetReps: null,
                    };
                  }

                  if (set.completed) {
                    return {
                      ...set,
                      completed: false,
                      completedTargetReps: null,
                    };
                  }

                  return {
                    ...set,
                    completed: true,
                    completedTargetReps: getTargetRepsForSet(exercise, setIndex),
                  };
                }
                return set;
              }),
            }
          : exercise,
      ),
    );
    // Reset rest timer whenever a set is marked complete
    setRestSeconds(0);
  };

  const addSet = (exerciseId: string) => {
    const updatedExercises = todayExercises.map((exercise) =>
      exercise.exerciseId === exerciseId
        ? {
            ...exercise,
            recommendation: exercise.recommendation
              ? { ...exercise.recommendation, setRecommendations: [] }
              : exercise.recommendation,
            workoutSets: [
              ...exercise.workoutSets,
              {
                weight: "",
                reps: "",
                completed: false,
                isDropSet: false,
                isNewlyAdded: true,
              },
            ],
          }
        : exercise,
    );
    setTodayExercises(updatedExercises);
    loadProgressionRecommendationsForExercises(updatedExercises);
  };

  const skipWorkout = async () => {
    setSkippingWorkout(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/auth/workouts/skip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to skip workout");
      }
      localStorage.removeItem("workoutSession");
      setShowSkipModal(false);
      // Refresh the page to load the next day's workout
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to skip workout");
      setShowSkipModal(false);
    } finally {
      setSkippingWorkout(false);
    }
  };

  const saveWorkout = async () => {
    if (!userProgram) {
      setError("Cannot save workout - missing program");
      return;
    }

    const startTime = workoutStartTime ?? new Date();
    if (!workoutStartTime) {
      setWorkoutStartTime(startTime);
    }

    setSavingWorkout(true);
    try {
      const exercisesWithData = todayExercises.filter((exercise) =>
        exercise.workoutSets.some(
          (set) => set.completed && set.weight && set.reps,
        ),
      );

      if (exercisesWithData.length === 0) {
        setError("Please complete at least one set before saving");
        setSavingWorkout(false);
        return;
      }

      const workoutData = exercisesWithData.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.workoutSets
          .filter((set) => set.completed && set.weight && set.reps)
          .map((set) => ({
            weight: parseFloat(set.weight),
            reps: parseInt(set.reps),
            targetReps: set.completedTargetReps ?? parseInt(set.reps),
            completed: set.completed,
            isDropSet: set.isDropSet,
            dropSetGroupId: set.dropSetGroupId,
          })),
      }));

      const programmeUpdates = todayExercises.map((exercise, index) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.workoutSets.length,
        reps: exercise.reps,
        orderIndex: index,
        strengthRole: exercise.strengthRole,
        notes: serializeSetDefinitions(exercise.workoutSets),
      }));

      const duration = Math.floor(
        (new Date().getTime() - startTime.getTime()) / 1000 / 60,
      );

      const response = await fetch("/auth/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          exercises: workoutData,
          duration: duration,
          notes: "",
          programmeUpdates,
          temporaryRecoveryAdjustmentActive: recoveryAdjustmentStatus.isActive,
        }),
      });

      if (!response.ok) {
        let backendMessage = "";
        try {
          const errorPayload = await response.json();
          backendMessage =
            errorPayload?.details || errorPayload?.error || "";
        } catch {
          // ignore non-JSON error payloads
        }
        throw new Error(
          backendMessage || `Failed to save workout (${response.status})`,
        );
      }

      const result = await response.json();

      // Show weekly summary if available, or mark as completed
      if (result.weeklySummary) {
        persistHistoryCacheForExercises(
          todayExercises,
          userProgram?.currentWeek,
          userProgram?.currentDay,
        );
        localStorage.removeItem("workoutSession");
        setWeeklySummary({
          ...result.weeklySummary,
          recommendations: result.recommendations,
          streak: result.streak,
        });
        setCompletedWorkoutId(result.workoutId || null);
        setWorkoutCompleted(true);
      } else {
        // Show completion screen with recommendations
        persistHistoryCacheForExercises(
          todayExercises,
          userProgram?.currentWeek,
          userProgram?.currentDay,
        );
        localStorage.removeItem("workoutSession");
        setWeeklySummary({
          recommendations: result.recommendations,
          streak: result.streak,
        });
        setCompletedWorkoutId(result.workoutId || null);
        setWorkoutCompleted(true);
      }
    } catch (err: any) {
      console.error("Error saving workout:", err);
      setError(err.message || "Failed to save workout");
    } finally {
      setSavingWorkout(false);
    }
  };

  const advanceToNextDay = async (statusOverride?: RecoveryAdjustmentStatus) => {
    try {
      localStorage.removeItem("workoutSession");
      const response = await fetch(
        "/auth/workouts/complete-day",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to advance to next day");
      }

      const result = await response.json();

      setUserProgram((prev) =>
        prev
          ? {
              ...prev,
              currentWeek: result.currentWeek,
              currentDay: result.currentDay,
              programme: prev.programme,
            }
          : prev,
      );

      // Reset timer and workout state
      setTimerRunning(false);
      setSecondsElapsed(0);
      setWorkoutStartTime(null);
      setWeeklySummary(null);
      setWorkoutCompleted(false);
      setCompletedWorkoutId(null);
      setShowWorkoutFeedbackModal(false);
      setWorkoutDifficultyScore(7);
      setStartingRecoveryState("NORMAL");
      setWorkoutFeedbackError("");
      setShowRecoveryAdjustmentModal(false);
      setRecoveryStreakCount(0);
      setUnderperformingExerciseName("");
      setUnderperformingExerciseId("");
      setAdjustmentTriggerType(null);
      setRecoveryAdjustmentError("");
      setOverperformingExercises([]);
      setShowExerciseOverperformanceModal(false);
      setExerciseIncreaseError("");

      // Fetch the next day's exercises
      const programmeResponse = await fetch(
        `/auth/programmes/${userProgram?.programme?.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!programmeResponse.ok) {
        throw new Error("Failed to fetch programme details");
      }

      const programmeData = await programmeResponse.json();
      const adjustmentStatus =
        statusOverride ||
        (await fetchRecoveryAdjustmentStatus(recoveryAdjustmentStatus));
      const nextDayExercises = programmeData.exercises.filter(
        (exercise: ProgrammeExercise) =>
          exercise.dayNumber === result.currentDay,
      );

      const workoutExercises: WorkoutExercise[] = nextDayExercises.map(
        (exercise: ProgrammeExercise) => {
          const adjustedSetCount = getAdjustedSetCount(
            exercise.sets,
            exercise.exercise.id,
            adjustmentStatus,
          );
          const cachedDefinitions = getCachedSetDefinitions(
            userProgram?.programme?.id,
            result.currentDay,
            exercise.exercise.id,
          );
          const initialSets = createWorkoutSetsFromDefinitions(
            adjustedSetCount,
            exercise.notes,
            cachedDefinitions,
          ).slice(0, adjustedSetCount);

          return {
            id: exercise.id,
            name: exercise.exercise.name,
            muscleGroup: exercise.exercise.muscleGroup,
            sets: adjustedSetCount,
            reps: exercise.reps,
            notes: exercise.notes,
            exerciseId: exercise.exercise.id,
            workoutSets: initialSets,
          };
        },
      );

      setTodayExercises(workoutExercises);
      await loadProgressionRecommendationsForExercises(
        workoutExercises,
        result.currentDay,
      );
    } catch (err: any) {
      console.error("Error advancing to next day:", err);
      setError(err.message || "Failed to advance to next day");
    }
  };

  const getExerciseName = (exerciseId: string): string => {
    const exercise = todayExercises.find((ex) => ex.exerciseId === exerciseId);
    return exercise ? exercise.name : "Unknown Exercise";
  };

  const openWorkoutFeedbackModal = () => {
    setShowWorkoutFeedbackModal(true);
    setWorkoutFeedbackError("");
  };

  const submitWorkoutFeedbackAndContinue = async () => {
    if (!completedWorkoutId) {
      setWorkoutFeedbackError("Unable to save feedback for this workout.");
      return;
    }

    try {
      setSubmittingWorkoutFeedback(true);
      setWorkoutFeedbackError("");

      const response = await fetch(
        `/auth/workouts/${completedWorkoutId}/feedback`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            perceivedDifficulty: workoutDifficultyScore,
            startRecovery: startingRecoveryState,
          }),
        },
      );

      if (!response.ok) {
        let backendMessage = "";
        try {
          const errorPayload = await response.json();
          backendMessage =
            errorPayload?.details || errorPayload?.error || "";
        } catch {
          // ignore non-JSON error payloads
        }
        throw new Error(
          backendMessage || `Failed to save workout feedback (${response.status})`,
        );
      }

      const payload = await response.json();

      const shouldSuggestAdjustments = Boolean(payload?.shouldSuggestAdjustments);
      const shouldSuggestExerciseIncrease = Boolean(payload?.shouldSuggestExerciseIncrease);
      const incomingOverperformingExercises: OverperformingExercise[] = Array.isArray(
        payload?.overperformingExercises,
      )
        ? payload.overperformingExercises
        : [];
      const streakCount = Number(payload?.recoveryStreakCount || 0);
      const triggerType =
        payload?.adjustmentTriggerType === "MISSED_TARGETS"
          ? "MISSED_TARGETS"
          : payload?.adjustmentTriggerType === "EASY_PROGRESS"
            ? "EASY_PROGRESS"
            : payload?.adjustmentTriggerType === "FATIGUE"
              ? "FATIGUE"
              : null;
      const missedTargetRepStreak = Boolean(payload?.missedTargetRepStreak);
      const missedTargetExerciseId =
        typeof payload?.underperformingExerciseId === "string"
          ? payload.underperformingExerciseId
          : "";
      const missedTargetExerciseName =
        typeof payload?.underperformingExerciseName === "string"
          ? payload.underperformingExerciseName
          : "";

      setShowWorkoutFeedbackModal(false);

      if (shouldSuggestAdjustments) {
        setAdjustmentTriggerType(triggerType);
        setRecoveryStreakCount(streakCount);
        setUnderperformingExerciseId(
          missedTargetRepStreak ? missedTargetExerciseId : "",
        );
        setUnderperformingExerciseName(
          missedTargetRepStreak ? missedTargetExerciseName : "",
        );
        setRecoveryAdjustmentError("");
        setShowRecoveryAdjustmentModal(true);
        return;
      }

      if (shouldSuggestExerciseIncrease && incomingOverperformingExercises.length > 0) {
        setOverperformingExercises(incomingOverperformingExercises);
        setExerciseIncreaseError("");
        setShowExerciseOverperformanceModal(true);
        return;
      }

      await advanceToNextDay();
    } catch (error: any) {
      setWorkoutFeedbackError(
        error?.message || "Failed to save workout feedback",
      );
    } finally {
      setSubmittingWorkoutFeedback(false);
    }
  };

  const applyRecoveryAdjustmentsAndContinue = async () => {
    try {
      setApplyingRecoveryAdjustments(true);
      setRecoveryAdjustmentError("");

      const response = await fetch(
        "/auth/workouts/recovery-adjustments/apply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            workoutId: completedWorkoutId,
            triggerType:
              adjustmentTriggerType ||
              (underperformingExerciseId ? "MISSED_TARGETS" : "FATIGUE"),
            targetExerciseId: underperformingExerciseId || undefined,
            targetExerciseName: underperformingExerciseName || undefined,
          }),
        },
      );

      if (!response.ok) {
        let backendMessage = "";
        try {
          const errorPayload = await response.json();
          backendMessage =
            errorPayload?.details || errorPayload?.error || "";
        } catch {
          // ignore non-JSON error payloads
        }
        throw new Error(
          backendMessage || `Failed to apply adjustments (${response.status})`,
        );
      }

      const payload = await response.json();
      if (payload?.triggerType === "MISSED_TARGETS") {
        setShowRecoveryAdjustmentModal(false);
        await advanceToNextDay();
        return;
      }

      const acceptedStatus: RecoveryAdjustmentStatus = {
        isActive: true,
        sessionsRemaining: Number(payload?.sessionsRemaining || 0),
        setTarget:
          typeof payload?.setTarget === "number" && payload.setTarget > 0
            ? Number(payload.setTarget)
            : undefined,
        weightMultiplier: Number(payload?.weightMultiplier || 1),
        triggerType:
          payload?.triggerType === "MISSED_TARGETS"
            ? "MISSED_TARGETS"
            : payload?.triggerType === "EASY_PROGRESS"
              ? "EASY_PROGRESS"
            : payload?.triggerType === "FATIGUE"
              ? "FATIGUE"
              : undefined,
        targetExerciseId:
          typeof payload?.targetExerciseId === "string"
            ? payload.targetExerciseId
            : undefined,
        targetExerciseName:
          typeof payload?.targetExerciseName === "string"
            ? payload.targetExerciseName
            : undefined,
      };
      setRecoveryAdjustmentStatus(acceptedStatus);
      setAdjustmentTriggerType(acceptedStatus.triggerType || null);

      setShowRecoveryAdjustmentModal(false);
      await advanceToNextDay(acceptedStatus);
    } catch (error: any) {
      setRecoveryAdjustmentError(
        error?.message || "Failed to apply recovery adjustments",
      );
    } finally {
      setApplyingRecoveryAdjustments(false);
    }
  };

  const applyExerciseIncreaseAndContinue = async () => {
    if (overperformingExercises.length === 0) {
      await advanceToNextDay();
      return;
    }

    try {
      setApplyingExerciseIncrease(true);
      setExerciseIncreaseError("");

      const response = await fetch(
        "/auth/workouts/recovery-adjustments/apply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            workoutId: completedWorkoutId,
            triggerType: "EXERCISE_OVERPERFORMANCE",
            exerciseAdjustments: overperformingExercises,
          }),
        },
      );

      if (!response.ok) {
        let backendMessage = "";
        try {
          const errorPayload = await response.json();
          backendMessage = errorPayload?.details || errorPayload?.error || "";
        } catch {
          // ignore
        }
        throw new Error(
          backendMessage || `Failed to apply exercise adjustments (${response.status})`,
        );
      }

      setShowExerciseOverperformanceModal(false);
      await advanceToNextDay();
    } catch (error: any) {
      setExerciseIncreaseError(
        error?.message || "Failed to apply exercise increase",
      );
    } finally {
      setApplyingExerciseIncrease(false);
    }
  };

  const applyRecommendationToExercise = (
    exercise: WorkoutExercise,
    recommendation: WorkoutExercise["recommendation"] | undefined,
  ): WorkoutExercise => {
    if (!recommendation) {
      return exercise;
    }

    const setRecommendations = [...(recommendation.setRecommendations ?? [])].sort(
      (a, b) => a.setNumber - b.setNumber,
    );
    const wasDeload = exercise.recommendation?.progressionType === "DELOAD";
    const isDeload = recommendation.progressionType === "DELOAD";
    const isTransitioningOutOfDeload = wasDeload && !isDeload;
    const baseWorkoutSets =
      isTransitioningOutOfDeload && exercise.workoutSets.length < exercise.sets
        ? createWorkoutSetsFromDefinitions(exercise.sets, exercise.notes).map(
            (restoredSet, setIdx) => {
              const existingSet = exercise.workoutSets[setIdx];
              return existingSet
                ? {
                    ...restoredSet,
                    ...existingSet,
                    completed: false,
                    completedTargetReps: null,
                  }
                : restoredSet;
            },
          )
        : exercise.workoutSets;
    const targetSetCount =
      isDeload && setRecommendations.length > 0
        ? Math.max(1, setRecommendations.length)
        : baseWorkoutSets.length;
    const workoutSets = isDeload
      ? baseWorkoutSets.slice(0, targetSetCount)
      : baseWorkoutSets;

    // The backend recommendations endpoint applies any active recovery/progression
    // adjustment multiplier authoritatively (server-side expiry computed from DB).
    // Do NOT re-apply locally from client state — that causes the multiplier to
    // persist past expiry when client state lags behind the server.
    const effectiveRecommendation = recommendation;

    let recommendationIndex = 0;

    return {
      ...exercise,
      recommendation: effectiveRecommendation,
      workoutSets: workoutSets.map((set, idx) => {
        if (set.isNewlyAdded) {
          return set;
        }
        const setRecommendation =
          effectiveRecommendation.setRecommendations?.[recommendationIndex];
        recommendationIndex += 1;
        const recommendedWeight =
          setRecommendation && setRecommendation.recommendedWeight > 0
            ? String(setRecommendation.recommendedWeight)
            : "";
        const recommendedReps =
          setRecommendation && setRecommendation.recommendedReps > 0
            ? String(setRecommendation.recommendedReps)
            : "";

        return {
          ...set,
          weight:
            isTransitioningOutOfDeload || !set.weight.trim()
              ? recommendedWeight
              : set.weight,
          reps:
            isTransitioningOutOfDeload || !set.reps.trim()
              ? recommendedReps
              : set.reps,
        };
      }),
    };
  };

  const loadProgressionRecommendations = async (dayNumberOverride?: number) => {
    if (!userProgram || todayExercises.length === 0) return;

    setLoadingRecommendations(true);
    const requestId = ++recommendationsRequestRef.current;
    try {
      const exerciseIds = todayExercises.map((ex) => ex.exerciseId);
      const setCounts = todayExercises.map((ex) => ex.workoutSets.length);
      const setLayouts = encodeURIComponent(
        JSON.stringify(buildSetLayoutsPayload(todayExercises)),
      );
      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("No auth token found, skipping recommendations");
        setLoadingRecommendations(false);
        return;
      }

      const effectiveDayNumber = dayNumberOverride ?? userProgram.currentDay;

      const response = await fetch(
        `/auth/workouts/recommendations?exerciseIds=${exerciseIds.join(
          ",",
        )}&setCounts=${setCounts.join(",")}&setLayouts=${setLayouts}&dayNumber=${effectiveDayNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          console.warn("Auth token expired or invalid, skipping recommendations");
          setLoadingRecommendations(false);
          return;
        }
        throw new Error(`Failed to load recommendations: ${response.status}`);
      }

      const result = await response.json();

      if (requestId !== recommendationsRequestRef.current) {
        return;
      }

      setTodayExercises((prev) =>
        prev.map((exercise) => {
          const recommendation = result.recommendations.find(
            (rec: any) => rec.exerciseId === exercise.exerciseId,
          );
          return applyRecommendationToExercise(exercise, recommendation);
        }),
      );
    } catch (err: any) {
      console.error("Error loading recommendations:", err);
      // Don't show error to user, just log it
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const loadProgressionRecommendationsForExercises = async (
    exercises: WorkoutExercise[],
    dayNumberOverride?: number,
  ) => {
    if (!userProgram || exercises.length === 0) return;

    const requestId = ++recommendationsRequestRef.current;
    try {
      const exerciseIds = exercises.map((ex) => ex.exerciseId);
      const setCounts = exercises.map((ex) => ex.workoutSets.length);
      const setLayouts = encodeURIComponent(
        JSON.stringify(buildSetLayoutsPayload(exercises)),
      );
      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("No auth token found, skipping recommendations");
        return;
      }

      const effectiveDayNumber = dayNumberOverride ?? userProgram.currentDay;

      const response = await fetch(
        `/auth/workouts/recommendations?exerciseIds=${exerciseIds.join(
          ",",
        )}&setCounts=${setCounts.join(",")}&setLayouts=${setLayouts}&dayNumber=${effectiveDayNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          console.warn("Auth token expired or invalid, skipping recommendations");
          return;
        }
        throw new Error(`Failed to load recommendations: ${response.status}`);
      }

      const result = await response.json();

      if (requestId !== recommendationsRequestRef.current) {
        return;
      }

      setTodayExercises((prev) =>
        prev.map((exercise) => {
          const recommendation = result.recommendations.find(
            (rec: any) => rec.exerciseId === exercise.exerciseId,
          );
          return applyRecommendationToExercise(exercise, recommendation);
        }),
      );
    } catch (err: any) {
      console.error("Error loading recommendations:", err);
    }
  };

  useEffect(() => {
    const fetchUserProgram = async () => {
      try {
        setLoading(true);
        setError("");

        // Check if there's a saved session first
        const savedSession = localStorage.getItem("workoutSession");
        if (savedSession) {
          try {
            const session = JSON.parse(savedSession);
            setUserProgram(session.userProgram);
            setTodayExercises(session.todayExercises);
            if (session.workoutStartTime) {
              setWorkoutStartTime(new Date(session.workoutStartTime));
            }
            setTimerRunning(session.timerRunning);
            setSecondsElapsed(session.secondsElapsed);
            setLoading(false);
            return; // Exit early - don't fetch fresh data
          } catch (err) {
            console.error("Failed to restore workout session:", err);
            // Fall through to fetch fresh data
          }
        }

        const [response, adjustmentStatus] = await Promise.all([
          fetch("/auth/user-programs", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),
          fetchRecoveryAdjustmentStatus(recoveryAdjustmentStatus),
        ]);

        if (!response.ok) {
          throw new Error("Failed to fetch user program");
        }

        const userPrograms = await response.json();

        const activeProgram =
          userPrograms.find((up: any) => up.status === "ACTIVE") ||
          userPrograms[0];

        if (!activeProgram) {
          setError(
            "No active programme found. Please select a programme first.",
          );
          setLoading(false);
          return;
        }

        const programmeResponse = await fetch(
          `/auth/programmes/${activeProgram.programmeId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (!programmeResponse.ok) {
          throw new Error("Failed to fetch programme details");
        }

        const programmeData = await programmeResponse.json();

        const fullUserProgram = {
          ...activeProgram,
          programme: programmeData,
        };

        setUserProgram(fullUserProgram);

        if (!programmeData.exercises || programmeData.exercises.length === 0) {
          setError(
            "This programme has no exercises configured. Please add exercises in the Programme Editor.",
          );
          setLoading(false);
          return;
        }

        const currentDayExercises = programmeData.exercises.filter(
          (exercise: ProgrammeExercise) =>
            exercise.dayNumber === activeProgram.currentDay,
        );

        if (currentDayExercises.length === 0) {
          setError(
            `No exercises scheduled for Day ${activeProgram.currentDay}. Please add exercises in the Programme Editor.`,
          );
          setLoading(false);
          return;
        }

        const workoutExercises: WorkoutExercise[] = currentDayExercises.map(
          (exercise: ProgrammeExercise) => {
            const adjustedSetCount = getAdjustedSetCount(
              exercise.sets,
              exercise.exercise.id,
              adjustmentStatus,
            );
            const cachedDefinitions = getCachedSetDefinitions(
              activeProgram.programmeId,
              activeProgram.currentDay,
              exercise.exercise.id,
            );
            const initialSets = createWorkoutSetsFromDefinitions(
              adjustedSetCount,
              exercise.notes,
              cachedDefinitions,
            ).slice(0, adjustedSetCount);

            return {
              id: exercise.id,
              name: exercise.exercise.name,
              muscleGroup: exercise.exercise.muscleGroup,
              sets: adjustedSetCount,
              reps: exercise.reps,
              strengthRole: exercise.strengthRole,
              notes: exercise.notes,
              exerciseId: exercise.exercise.id,
              workoutSets: initialSets,
            };
          },
        );

        setTodayExercises(workoutExercises);
      } catch (err: any) {
        console.error("Error fetching user program:", err);
        setError(err.message || "Failed to load workout programme");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProgram();
  }, []);

  useEffect(() => {
    if (userProgram && todayExercises.length > 0) {
      loadProgressionRecommendations(userProgram.currentDay);
    }
  }, [userProgram?.currentDay]);

  useEffect(() => {
    if (!userProgram?.programme?.weeks || !userProgram?.id) return;

    const deloadWeekNumber = userProgram.programme.weeks + 1;
    const isDeloadWeek = userProgram.currentWeek === deloadWeekNumber;

    if (!isDeloadWeek) return;

    const promptSeenKey = `deloadPromptSeen:${userProgram.id}:${deloadWeekNumber}`;
    const alreadySeen = localStorage.getItem(promptSeenKey) === "true";

    if (!alreadySeen) {
      setShowDeloadWeekModal(true);
      localStorage.setItem(promptSeenKey, "true");
    }
  }, [userProgram?.id, userProgram?.currentWeek, userProgram?.programme?.weeks]);

  useEffect(() => {
    if (workoutCompleted) {
      localStorage.removeItem("workoutSession");
    }
  }, [workoutCompleted]);

  // Save workout session to localStorage whenever state changes
  useEffect(() => {
    if (!workoutCompleted && userProgram && todayExercises.length > 0) {
      const sessionData = {
        userProgram,
        todayExercises,
        workoutStartTime: workoutStartTime?.toISOString() || null,
        timerRunning,
        secondsElapsed,
      };
      localStorage.setItem("workoutSession", JSON.stringify(sessionData));
      persistLayoutCacheForExercises(
        todayExercises,
        userProgram.programme?.id,
        userProgram.currentDay,
      );
    }
  }, [
    userProgram,
    todayExercises,
    workoutStartTime,
    timerRunning,
    secondsElapsed,
    workoutCompleted,
  ]);

  // Warn before leaving if workout is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn if workout has been started (timer has run or is running)
      if (!workoutCompleted && (timerRunning || secondsElapsed > 0)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [workoutCompleted, timerRunning, secondsElapsed]);

  // Handle scroll lock when modal opens/closes
  useEffect(() => {
    console.log(
      "💬 Modal visibility changed:",
      showLeavingModal,
      "nextLocation:",
      nextLocation,
    );
    if (showLeavingModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showLeavingModal, nextLocation]);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
        setRestSeconds((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  if (loading) {
    return (
      <div className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16 justify-center items-center">
        <p className="text-white text-center">
          Loading your workout programme...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16">
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg px-6 py-4 mb-4 max-w-md">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
          <button
            onClick={() => (window.location.href = "/programmes")}
            className="px-6 py-3 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium"
          >
            Go to Programmes
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`min-h-screen text-[#5E6272] flex flex-col p-4 ${
        areAllSetsCompleted() && !workoutCompleted ? "pb-36" : "pb-32"
      }`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      {/* Top Bar */}
      <TopBar
        title="Workouts"
        pageIcon={<Calendar size={18} />}
        menuItems={[
          { label: "Dashboard", onClick: () => safeNavigate("/dashboard") },
          { label: "Programmes", onClick: () => safeNavigate("/programmes") },
          { label: "Track Metrics", onClick: () => safeNavigate("/metrics") },
          { label: "Settings", onClick: () => safeNavigate("/settings") },
          { label: "End Programme", onClick: () => setShowEndProgrammeModal(true) },
        ]}
      />

      <div className="flex items-center justify-between mt-2 mb-1">
        <div className="flex flex-col">
          <h3 className="text-base font-semibold text-white leading-tight">
            {userProgram?.programme.name || "Loading..."}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#A0AEC0] uppercase tracking-wide">
              Week {userProgram?.currentWeek || 1} · Day {userProgram?.currentDay || 1}
            </span>
            {userProgram?.programme.bodyPartFocus && (
              <span className="text-[10px] text-[#FBA3FF] bg-[#FBA3FF]/10 px-1.5 py-0.5 rounded-full">
                {userProgram.programme.bodyPartFocus}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Skip session — small icon button */}
          <button
            onClick={() => setShowSkipModal(true)}
            className="glass-button p-2 rounded-full text-[#5E6272] hover:text-white"
            aria-label="Skip this session"
            title="Skip this session"
          >
            <SkipForward size={16} />
          </button>

          <div className="relative" ref={programmeCalendarRef}>
            <button
              onClick={() => setShowProgrammeCalendarDropdown((previous) => !previous)}
              className="glass-button p-2 rounded-full text-[#9ED3FF] hover:text-white"
              aria-label="Open programme calendar"
              title="Programme calendar"
            >
              <Calendar size={16} />
            </button>

            {showProgrammeCalendarDropdown && userProgram && (
          <div className="glass-modal absolute right-0 mt-2 w-72 rounded-2xl p-4 border border-white/10 z-50">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-white font-semibold">Programme Calendar</p>
                <p className="text-xs text-[#A0AEC0] mt-1">
                  {userProgram.programme.weeks + 1} weeks total (including
                  deload)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustProgrammeWeeks(-1)}
                  disabled={updatingProgrammeWeeks}
                  className="glass-button p-1.5 rounded-md text-[#A0AEC0] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Decrease programme by one week"
                  title="Remove 1 week"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => adjustProgrammeWeeks(1)}
                  disabled={updatingProgrammeWeeks}
                  className="glass-button p-1.5 rounded-md text-[#A0AEC0] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Increase programme by one week"
                  title="Add 1 week"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {getProgrammeRPEByWeek(userProgram.programme.weeks).map(
                (rpe, index) => {
                  const weekNumber = index + 1;
                  const isDeloadWeek =
                    weekNumber === userProgram.programme.weeks + 1;

                  return (
                    <div
                      key={weekNumber}
                      className="glass-subtile rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white font-medium">
                          Week {weekNumber}
                          {isDeloadWeek ? " (Deload)" : ""}
                        </p>
                        <p className="text-xs text-[#C6B5FF] font-semibold">
                          RPE {rpe}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Array.from(
                          { length: userProgram.programme.daysPerWeek },
                          (_, dayIndex) => {
                            const dayNumber = dayIndex + 1;
                            const completed = isWorkoutDayCompleted(
                              weekNumber,
                              dayNumber,
                            );

                            return completed ? (
                              <button
                                key={`${weekNumber}-${dayNumber}`}
                                type="button"
                                onClick={() =>
                                  openReadOnlyWorkoutForDay(weekNumber, dayNumber)
                                }
                                className="text-[11px] px-2 py-1 rounded-md font-semibold bg-green-500/25 text-green-300 border border-green-400/40 hover:bg-green-500/35 transition-colors"
                                title={`View completed workout for Week ${weekNumber}, Day ${dayNumber}`}
                              >
                                Day {dayNumber}
                              </button>
                            ) : (
                              <div
                                key={`${weekNumber}-${dayNumber}`}
                                className="text-[11px] px-2 py-1 rounded-md font-semibold bg-red-500/20 text-red-300 border border-red-400/40"
                              >
                                Day {dayNumber}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}
      </div>
    </div>
      </div>

      {/* ── Workout timers ── */}
      <div className={`mt-3 transition-all ${
        secondsElapsed > 0
          ? "sticky top-0 z-40 -mx-4 px-4 py-2 bg-[#0B1220]/95 backdrop-blur-md border-b border-white/5"
          : "px-4"
      }`}>
        {!timerRunning && secondsElapsed === 0 ? (
          <div className="flex flex-col gap-2">
          <button
            onClick={startTimer}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#86FF99]/10 border border-[#86FF99]/30 text-[#86FF99] font-semibold text-sm hover:bg-[#86FF99]/20 transition-colors"
          >
            <Play size={16} />
            Start Workout
          </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* Workout timer */}
            <div className={`glass-card rounded-xl flex items-center gap-3 ${secondsElapsed > 0 ? "px-3 py-2" : "p-3 flex-col"}`}>
              {secondsElapsed > 0 ? (
                <>
                  <div className="flex flex-col items-start flex-1">
                    <p className="text-[#A0AEC0] text-[9px] uppercase tracking-widest">Workout</p>
                    <span className="text-white font-bold text-lg tracking-tight tabular-nums">{formatTime(secondsElapsed)}</span>
                  </div>
                  <button
                    onClick={timerRunning ? pauseTimer : startTimer}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      timerRunning ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-[#86FF99]/20 text-[#86FF99] hover:bg-[#86FF99]/30"
                    }`}
                  >
                    {timerRunning ? <><Pause size={10} /> Pause</> : <><Play size={10} /> Resume</>}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[#A0AEC0] text-[10px] uppercase tracking-widest mb-1">Workout</p>
                  <span className="text-white font-bold text-2xl tracking-tight tabular-nums">{formatTime(secondsElapsed)}</span>
                  <button
                    onClick={timerRunning ? pauseTimer : startTimer}
                    className={`mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      timerRunning ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-[#86FF99]/20 text-[#86FF99] hover:bg-[#86FF99]/30"
                    }`}
                  >
                    {timerRunning ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Resume</>}
                  </button>
                </>
              )}
            </div>

            {/* Rest timer */}
            <div className={`glass-card rounded-xl flex items-center gap-3 ${secondsElapsed > 0 ? "px-3 py-2" : "p-3 flex-col"}`}>
              {secondsElapsed > 0 ? (
                <>
                  <div className="flex flex-col items-start flex-1">
                    <p className="text-[#A0AEC0] text-[9px] uppercase tracking-widest">Rest</p>
                    <span className={`font-bold text-lg tracking-tight tabular-nums ${
                      restSeconds >= 180 ? "text-red-400" : restSeconds >= 90 ? "text-[#FFC857]" : "text-[#9ED3FF]"
                    }`}>{formatTime(restSeconds)}</span>
                  </div>
                  <p className="text-[#5E6272] text-[9px]">resets<br/>each set</p>
                </>
              ) : (
                <>
                  <p className="text-[#A0AEC0] text-[10px] uppercase tracking-widest mb-1">Rest</p>
                  <span className={`font-bold text-2xl tracking-tight tabular-nums ${
                    restSeconds >= 180 ? "text-red-400" : restSeconds >= 90 ? "text-[#FFC857]" : "text-[#9ED3FF]"
                  }`}>{formatTime(restSeconds)}</span>
                  <p className="mt-2 text-[#5E6272] text-[10px]">resets each set</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-4" ref={menuRef}>

        {todayExercises.length > 0 ? (
          todayExercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className={`glass-card rounded-xl p-4 overflow-visible ${
                openExerciseMenu === exercise.exerciseId
                  ? "relative z-[70]"
                  : "relative z-10"
              } ${
                selectedExerciseId === exercise.exerciseId
                  ? "border-2 border-blue-400/70"
                  : ""
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <MuscleIcon muscleGroup={exercise.muscleGroup} size={44} />
                    <div>
                      <h4 className="text-white font-semibold text-base">
                        {exercise.name}
                      </h4>
                      <div className="flex text-sm gap-2 mt-1">
                        <span className="text-green-400">
                          {exercise.workoutSets.length} Working Set
                          {exercise.workoutSets.length !== 1 ? "s" : ""}
                        </span>
                        {userProgram?.programme?.progressionFocus ===
                          "STRENGTH" &&
                          exercise.strengthRole && (
                            <span className="text-blue-300 uppercase tracking-wide">
                              {exercise.strengthRole.replace("_", " ")}
                            </span>
                          )}
                        <span className="text-pink-400">
                          {exercise.muscleGroup}
                        </span>
                      </div>
                    </div>
                  </div>

                  {exercise.recommendation && (
                    <div className="glass-subtile mt-2 p-2 rounded-lg">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedRecommendations);
                          if (newExpanded.has(exercise.id)) {
                            newExpanded.delete(exercise.id);
                          } else {
                            newExpanded.add(exercise.id);
                          }
                          setExpandedRecommendations(newExpanded);
                        }}
                        className="flex items-center gap-1 mb-1 w-full cursor-pointer text-left hover:opacity-80 transition-opacity"
                      >
                        <Target size={12} className="text-blue-400" />
                        <span className="text-xs text-blue-400 font-semibold">
                          Recommended Target
                        </span>
                        <span className="ml-auto text-blue-400 text-xs">
                          {expandedRecommendations.has(exercise.id) ? "▼" : "▶"}
                        </span>
                      </button>
                      {expandedRecommendations.has(exercise.id) && exercise.recommendation.recommendedRPE && (
                        <div className="text-xs text-purple-300 font-semibold">
                          {exercise.recommendation.recommendedRPE === 7 &&
                            "RPE 7: Hard effort, about three reps left in reserve (you could still do a few more reps)."}
                          {exercise.recommendation.recommendedRPE === 8 &&
                            "RPE 8: Very hard effort, about two reps left in reserve (only a couple more possible)."}
                          {exercise.recommendation.recommendedRPE === 9 &&
                            "RPE 9: Extremely hard effort, about one rep left in reserve (almost at failure)."}
                          {exercise.recommendation.recommendedRPE === 10 &&
                            "RPE 10: Maximum effort, no reps left in reserve (cannot complete another rep)."}
                          {exercise.recommendation.recommendedRPE === 5 &&
                            "RPE 5: Recovery effort, light and controlled (deload week)."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className="relative flex items-center gap-2"
                  ref={(el) => {
                    if (el)
                      exerciseMenuRefs.current.set(exercise.exerciseId, el);
                  }}
                >
                  <button
                    onClick={() => openExerciseHistory(exercise)}
                    className="text-[#9CA3AF] hover:text-white p-1 transition-colors"
                    aria-label={`Open ${exercise.name} history`}
                    title="Exercise history"
                  >
                    <History size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setOpenExerciseMenu((s) =>
                        s === exercise.exerciseId ? null : exercise.exerciseId,
                      );
                    }}
                    className="text-white p-1"
                    aria-haspopup="true"
                    aria-expanded={openExerciseMenu === exercise.exerciseId}
                  >
                    <MoreHorizontal />
                  </button>

                  {openExerciseMenu === exercise.exerciseId && (
                    <div className="glass-menu absolute right-0 mt-2 w-56 rounded-lg shadow-lg z-[80]">
                      <div className="px-3 py-2 text-xs text-[#9CA3AF] font-semibold">
                        EXERCISE
                      </div>
                      <button
                        disabled={index === 0}
                        className={`w-full text-left px-3 py-2 text-sm ${
                          index === 0
                            ? "text-[#4B5563] cursor-not-allowed"
                            : "hover:bg-[#2A2E38] text-white"
                        }`}
                        onClick={() => moveExercise(exercise.exerciseId, "up")}
                      >
                        Move Exercise Up
                      </button>
                      <button
                        disabled={index === todayExercises.length - 1}
                        className={`w-full text-left px-3 py-2 text-sm ${
                          index === todayExercises.length - 1
                            ? "text-[#4B5563] cursor-not-allowed"
                            : "hover:bg-[#2A2E38] text-white"
                        }`}
                        onClick={() =>
                          moveExercise(exercise.exerciseId, "down")
                        }
                      >
                        Move Exercise Down
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                        onClick={() => replaceExercise(exercise.exerciseId)}
                      >
                        Replace Exercise
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                        onClick={() => addSetToExercise(exercise.exerciseId)}
                      >
                        Add Set
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                        onClick={() => skipNextSet(exercise.exerciseId)}
                      >
                        Skip Set
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-red-500 text-sm"
                        onClick={() => deleteExerciseById(exercise.exerciseId)}
                      >
                        Delete Exercise
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {exercise.workoutSets.map((set, setIdx) => {
                const isDropRow = isVisualDropSetRow(exercise.workoutSets, setIdx);

                return (
                <div
                  key={setIdx}
                  className={`flex items-center gap-2 mt-3 overflow-visible ${
                    isDropRow ? "ml-5" : ""
                  }`}
                >
                  <div
                    className="relative"
                    ref={(el) => {
                      const key = `${exercise.exerciseId}:${setIdx}`;
                      if (el) setMenuRefs.current.set(key, el);
                    }}
                  >
                    {(() => {
                      const key = `${exercise.exerciseId}:${setIdx}`;
                      return (
                        <>
                          <button
                            onClick={(event) => {
                              if (openSetMenu === key) {
                                setOpenSetMenu(null);
                                setSetMenuPosition(null);
                                return;
                              }

                              const rect = event.currentTarget.getBoundingClientRect();
                              const menuWidth = 176;
                              const menuHeight = 240;
                              const scrollX = window.scrollX;
                              const scrollY = window.scrollY;
                              const left = Math.max(
                                8,
                                Math.min(
                                  rect.right + 8 + scrollX,
                                  window.innerWidth + scrollX - menuWidth - 8,
                                ),
                              );
                              const top = Math.max(
                                8,
                                Math.min(
                                  rect.top - 8 + scrollY,
                                  window.innerHeight + scrollY - menuHeight - 8,
                                ),
                              );

                              setSetMenuPosition({ top, left });
                              setOpenSetMenu(key);
                            }}
                            className="w-4 text-[#9CA3AF] p-0"
                            aria-haspopup="true"
                            aria-expanded={openSetMenu === key}
                          >
                            ⋮
                          </button>
                        </>
                      );
                    })()}
                  </div>
                  {isDropRow && (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#FBA3FF] min-w-[52px]">
                      Drop Set
                    </span>
                  )}
                  <input
                    type="number"
                    placeholder={`Weight (${weightUnit})`}
                    value={(() => {
                      const key = `${exercise.exerciseId}-${setIdx}`;
                      return key in weightDisplayValues
                        ? weightDisplayValues[key]
                        : displaySetWeight(set.weight);
                    })()}
                    disabled={setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed}
                    onFocus={() => {
                      const key = `${exercise.exerciseId}-${setIdx}`;
                      setSelectedExerciseId(exercise.exerciseId);
                      setWeightDisplayValues((prev) => ({
                        ...prev,
                        [key]: displaySetWeight(set.weight),
                      }));
                      weightAtFocusRef.current = {
                        exerciseId: exercise.exerciseId,
                        setIndex: setIdx,
                        weight: set.weight,
                      };
                    }}
                    onChange={(e) => {
                      const key = `${exercise.exerciseId}-${setIdx}`;
                      setWeightDisplayValues((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }));
                    }}
                    onBlur={() => {
                      const key = `${exercise.exerciseId}-${setIdx}`;
                      const raw = weightDisplayValues[key];
                      if (raw !== undefined) {
                        updateSetData(
                          exercise.exerciseId,
                          setIdx,
                          "weight",
                          inputWeightToKg(raw),
                        );
                        setWeightDisplayValues((prev) => {
                          const next = { ...prev };
                          delete next[key];
                          return next;
                        });
                      }
                      finalizeWeightChange(exercise.exerciseId, setIdx);
                    }}
                    className={`glass-input text-white rounded-md px-2 py-1 w-2/5 placeholder:text-[#8A93A7] text-sm ${
                      setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    style={{ MozAppearance: "textfield" }}
                    inputMode="decimal"
                  />
                  <input
                    type="number"
                    placeholder="Reps"
                    value={set.reps}
                    disabled={setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed}
                    onChange={(e) => {
                      setSelectedExerciseId(exercise.exerciseId);
                      updateSetData(
                        exercise.exerciseId,
                        setIdx,
                        "reps",
                        e.target.value,
                      );
                    }}
                    onFocus={() => setSelectedExerciseId(exercise.exerciseId)}
                    className={`glass-input text-white rounded-md px-2 py-1 w-2/5 placeholder:text-[#8A93A7] text-sm ${
                      setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    style={{ MozAppearance: "textfield" }}
                    inputMode="numeric"
                  />
                  {(() => {
                    const repsIcon = getSetRepIcon(
                      set,
                      getTargetRepsForSet(exercise, setIdx),
                    );
                    return (
                      <div className="w-7 flex justify-center items-center flex-shrink-0">
                        {repsIcon ? (
                          <img
                            src={repsIcon.src}
                            alt={repsIcon.alt}
                            className="w-5 h-5"
                          />
                        ) : null}
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => {
                      // Only allow toggle if both weight and reps are filled
                      if (set.weight.trim() && set.reps.trim()) {
                        toggleSetCompletion(exercise.exerciseId, setIdx);
                      }
                    }}
                    disabled={
                      (setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed) ||
                      !set.weight.trim() || 
                      !set.reps.trim()
                    }
                    className={`rounded-full p-1 transition-colors ${
                      set.completed
                        ? "bg-green-600 hover:bg-green-700"
                        : ((setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed) ||
                          !set.weight.trim() || 
                          !set.reps.trim())
                        ? "bg-[#1a1a1a] cursor-not-allowed opacity-50"
                        : "glass-pressable"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        set.completed
                          ? "bg-white text-green-600"
                          : ((setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed) ||
                            !set.weight.trim() || 
                            !set.reps.trim())
                          ? "bg-[#404040]"
                          : "bg-[#5E6272]"
                      }`}
                    >
                      {set.completed && <Check size={10} />}
                    </div>
                  </button>
                </div>
                );
              })}

              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => addSet(exercise.exerciseId)}
                  className="glass-button flex items-center gap-2 text-sm font-medium text-white px-4 py-1.5 rounded-full"
                >
                  Add Set{" "}
                  <span className="text-green-400 text-lg leading-none">+</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-[#5E6272]">
            <p>No exercises scheduled for today</p>
            <button
              onClick={() => (window.location.href = "/programmes")}
              className="mt-4 px-6 py-3 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium"
            >
              Select a Programme
            </button>
          </div>
        )}

        {(() => {
          if (!openSetMenu || !setMenuPosition) return null;

          const [exerciseId, setIdxRaw] = openSetMenu.split(":");
          const setIdx = Number(setIdxRaw);
          if (!exerciseId || Number.isNaN(setIdx)) return null;

          const activeExercise = todayExercises.find(
            (exercise) => exercise.exerciseId === exerciseId,
          );
          const activeSet = activeExercise?.workoutSets?.[setIdx];
          if (!activeExercise || !activeSet) return null;

          return (
            <div
              ref={setMenuDropdownRef}
              className="glass-menu absolute w-44 rounded-lg shadow-lg z-[90]"
              style={{ top: setMenuPosition.top, left: setMenuPosition.left }}
            >
              <div className="px-3 py-2 text-xs text-[#9CA3AF] font-semibold">
                SET
              </div>
              {!activeSet.isDropSet && !activeSet.dropSetGroupId && (
                <button
                  className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                  onClick={() => {
                    createDropSet(activeExercise.exerciseId, setIdx);
                    setOpenSetMenu(null);
                    setSetMenuPosition(null);
                  }}
                >
                  Create Drop Set
                </button>
              )}
              {activeSet.dropSetGroupId && (
                <>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                    onClick={() => {
                      addAnotherDropSet(activeExercise.exerciseId, setIdx);
                      setOpenSetMenu(null);
                      setSetMenuPosition(null);
                    }}
                  >
                    Add Another Drop Set
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                    onClick={() => {
                      removeDropSetGroup(activeExercise.exerciseId, setIdx);
                      setOpenSetMenu(null);
                      setSetMenuPosition(null);
                    }}
                  >
                    Remove Drop Set
                  </button>
                </>
              )}
              <button
                className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                onClick={() => {
                  addSetBelow(activeExercise.exerciseId, setIdx);
                  setOpenSetMenu(null);
                  setSetMenuPosition(null);
                }}
              >
                Add Set Below
              </button>
              <button
                className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                onClick={() => {
                  skipSet(activeExercise.exerciseId, setIdx);
                  setOpenSetMenu(null);
                  setSetMenuPosition(null);
                }}
              >
                Skip Set
              </button>
              <button
                className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-red-500 text-sm"
                onClick={() => {
                  deleteSet(activeExercise.exerciseId, setIdx);
                  setOpenSetMenu(null);
                  setSetMenuPosition(null);
                }}
              >
                Delete Set
              </button>
            </div>
          );
        })()}
      </div>

      {/* Add Exercise Button */}
      {todayExercises.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={openAddExerciseModal}
            className="flex items-center gap-2 text-sm font-medium text-[#0A0E1A] bg-[#00FFAD] hover:bg-[#00E599] px-6 py-3 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Exercise
          </button>
        </div>
      )}

      {/* Complete Workout Button - Sticky footer when all sets completed */}
      {areAllSetsCompleted() && !workoutCompleted && (
        <div className="sticky bottom-20 mt-6 py-4 px-4 glass-subtile rounded-2xl border border-white/10 animate-in slide-in-from-bottom-4 duration-500 z-40">
          <div className="flex justify-center">
            <button
              onClick={saveWorkout}
              disabled={savingWorkout}
              className={`px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 transition-all transform hover:scale-105 shadow-lg ${
                savingWorkout
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-[#00FFAD] hover:bg-[#00E599] text-[#0A0E1A] shadow-[#00FFAD]/25"
              }`}
            >
              <Check size={20} />
              {savingWorkout ? "Saving Workout..." : "Complete Workout"}
            </button>
          </div>
        </div>
      )}

      {/* Post-Workout Summary Modal */}
      {workoutCompleted &&
        weeklySummary &&
        !showWorkoutFeedbackModal &&
        !showRecoveryAdjustmentModal &&
        !showExerciseOverperformanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div
            ref={summaryShareRef}
            className="glass-modal rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            {renderWorkoutSummaryCore()}

            <div className="space-y-3" data-share-ignore="true">
              <button
                onClick={() => {
                  setShowShareSummaryPanel((prev) => !prev);
                  setShareSummaryError("");
                }}
                className="w-full rounded-lg py-3 font-semibold transition-colors flex items-center justify-center gap-2 glass-button text-white hover:text-white"
              >
                <Share2 size={18} />
                {showShareSummaryPanel
                  ? "Hide Share Workout Summary"
                  : "Share Workout Summary"}
              </button>

              {showShareSummaryPanel && (
                <div className="glass-subtile rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-white font-semibold">Share Workout Summary</p>
                    <button
                      onClick={closeShareSummaryPanel}
                      className="text-[#A0AEC0] hover:text-white"
                      aria-label="Close share workout summary"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <button
                    onClick={handleShareWorkoutSummary}
                    disabled={sharingSummary}
                    className={`w-full rounded-lg py-2.5 font-semibold transition-colors flex items-center justify-center gap-2 ${
                      sharingSummary
                        ? "bg-[#2A2E38] text-[#8A93A7] cursor-not-allowed"
                        : "glass-button text-white hover:text-white"
                    }`}
                  >
                    <Share2 size={16} />
                    {sharingSummary ? "Generating image..." : "Generate + Share"}
                  </button>

                  {sharePreviewUrl && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-[#A0AEC0]">Generated image</p>
                        <button
                          onClick={clearSharePreview}
                          className="text-[#A0AEC0] hover:text-white text-xs flex items-center gap-1"
                          aria-label="Close image preview"
                        >
                          <X size={14} /> Close preview
                        </button>
                      </div>

                      <img
                        src={sharePreviewUrl}
                        alt="Workout summary preview"
                        className="w-full rounded-2xl"
                      />

                      <button
                        onClick={handleDownloadSharePreview}
                        className="w-full mt-3 glass-button rounded-lg py-2 text-sm font-semibold text-white"
                      >
                        Download Image
                      </button>
                    </div>
                  )}
                </div>
              )}

              {shareSummaryError && (
                <p className="text-xs text-[#FBA3FF] text-center">{shareSummaryError}</p>
              )}

              <button
                onClick={() => {
                  if (isMuscleBuildingProgramme) {
                    openWorkoutFeedbackModal();
                    return;
                  }
                  advanceToNextDay();
                }}
                className="w-full bg-[#86FF99] hover:bg-[#6bd664] text-black font-semibold py-3 rounded-lg transition-colors"
              >
                {isMuscleBuildingProgramme
                  ? "Continue"
                  : "Continue to Next Workout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {workoutCompleted &&
        weeklySummary &&
        showWorkoutFeedbackModal &&
        isMuscleBuildingProgramme && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-white text-xl font-bold text-center mb-2">
                Quick Workout Feedback
              </h2>
              <p className="text-[#A0AEC0] text-sm text-center mb-5">
                This helps tune your muscle-building progression.
              </p>

              <div className="space-y-5">
                <div>
                  <p className="text-white text-sm font-semibold mb-3">
                    How hard was that workout? (1-10)
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 10 }, (_, index) => {
                      const score = index + 1;
                      const isSelected = workoutDifficultyScore === score;
                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setWorkoutDifficultyScore(score)}
                          className={`rounded-lg py-2 text-sm font-semibold border transition-colors ${
                            isSelected
                              ? "bg-[#00FFAD] text-[#0A0E1A] border-[#00FFAD]"
                              : "glass-subtile border-white/10 text-white hover:border-[#00FFAD]/60"
                          }`}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-white text-sm font-semibold mb-3">
                    How recovered did you feel starting today?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { value: "FRESH", label: "Fresh" },
                      { value: "NORMAL", label: "Normal" },
                      { value: "STILL_TIRED", label: "Still tired" },
                    ].map((option) => {
                      const isSelected = startingRecoveryState === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setStartingRecoveryState(
                              option.value as WorkoutRecoveryState,
                            )
                          }
                          className={`rounded-lg py-2.5 text-sm font-semibold border transition-colors ${
                            isSelected
                              ? "bg-[#00FFAD] text-[#0A0E1A] border-[#00FFAD]"
                              : "glass-subtile border-white/10 text-white hover:border-[#00FFAD]/60"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {workoutFeedbackError && (
                <p className="text-sm text-[#FBA3FF] mt-4 text-center">
                  {workoutFeedbackError}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowWorkoutFeedbackModal(false);
                    setWorkoutFeedbackError("");
                  }}
                  disabled={submittingWorkoutFeedback}
                  className="glass-button flex-1 py-3 rounded-lg text-white font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitWorkoutFeedbackAndContinue}
                  disabled={submittingWorkoutFeedback}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                    submittingWorkoutFeedback
                      ? "bg-[#2A2E38] text-[#8A93A7] cursor-not-allowed"
                      : "bg-[#86FF99] hover:bg-[#6bd664] text-black"
                  }`}
                >
                  {submittingWorkoutFeedback
                    ? "Saving..."
                    : "Save Feedback + Continue"}
                </button>
              </div>
            </div>
          </div>
        )}

      {workoutCompleted &&
        weeklySummary &&
        showRecoveryAdjustmentModal &&
        isMuscleBuildingProgramme && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-white text-xl font-bold text-center mb-2">
                {adjustmentTriggerType === "EASY_PROGRESS"
                  ? "Progression Suggestion"
                  : "Recovery Suggestion"}
              </h2>
              <p className="text-[#A0AEC0] text-sm text-center mb-4">
                {adjustmentTriggerType === "EASY_PROGRESS"
                  ? "You rated the last 3 workouts as 4/10 or lower and met or exceeded all target reps."
                  : underperformingExerciseName
                    ? `You missed target reps for ${underperformingExerciseName} on 2 consecutive occurrences of this training day.`
                    : `You reported 8/10+ difficulty and feeling still tired for ${recoveryStreakCount} workouts in a row.`}
              </p>
              <p className="text-[#D1D5DB] text-sm text-center mb-5">
                {adjustmentTriggerType === "EASY_PROGRESS"
                  ? "Suggested adjustment: increase load by 5% for your next training days, then resume normal progression."
                  : adjustmentTriggerType === "MISSED_TARGETS"
                    ? "Suggested one-time override: reduce load by 10% for the next occurrence of this exercise on this training day only."
                    : "Suggested adjustment: reduce load by 10% and set all exercises to 3 sets to improve recovery."}
              </p>

              {recoveryAdjustmentError && (
                <p className="text-sm text-[#FBA3FF] mb-4 text-center">
                  {recoveryAdjustmentError}
                </p>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={applyRecoveryAdjustmentsAndContinue}
                  disabled={applyingRecoveryAdjustments}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    applyingRecoveryAdjustments
                      ? "bg-[#2A2E38] text-[#8A93A7] cursor-not-allowed"
                      : "bg-[#86FF99] hover:bg-[#6bd664] text-black"
                  }`}
                >
                  {applyingRecoveryAdjustments
                    ? "Applying..."
                    : adjustmentTriggerType === "EASY_PROGRESS"
                      ? "Approve +5% Increase"
                      : adjustmentTriggerType === "MISSED_TARGETS"
                        ? "Approve -10% One-Time Override"
                        : "Approve Adjustments"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowRecoveryAdjustmentModal(false);
                    setRecoveryAdjustmentError("");
                    await advanceToNextDay();
                  }}
                  disabled={applyingRecoveryAdjustments}
                  className="w-full glass-button py-3 rounded-lg text-white font-semibold"
                >
                  {adjustmentTriggerType === "EASY_PROGRESS"
                    ? "Keep Current Load"
                    : adjustmentTriggerType === "MISSED_TARGETS"
                      ? "Keep Current Load"
                    : "Stick With Current Progression"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Exercise Overperformance Modal */}
      {workoutCompleted &&
        weeklySummary &&
        showExerciseOverperformanceModal &&
        isMuscleBuildingProgramme && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-white text-xl font-bold text-center mb-2">
                Ready to Progress?
              </h2>
              <p className="text-[#A0AEC0] text-sm text-center mb-4">
                You've exceeded your target reps for{" "}
                {overperformingExercises.length === 1
                  ? `${overperformingExercises[0].exerciseName}`
                  : `${overperformingExercises.length} exercises`}{" "}
                for 2 sessions in a row.
              </p>
              {overperformingExercises.length > 1 && (
                <ul className="mb-4 space-y-1">
                  {overperformingExercises.map((ex) => (
                    <li
                      key={ex.exerciseId}
                      className="text-[#86FF99] text-sm text-center font-semibold"
                    >
                      {ex.exerciseName}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[#D1D5DB] text-sm text-center mb-5">
                Suggested adjustment: increase load by 5% on{" "}
                {overperformingExercises.length === 1
                  ? "this exercise"
                  : "these exercises"}{" "}
                for the next occurrence on this training day only, then normal progression resumes.
              </p>

              {exerciseIncreaseError && (
                <p className="text-sm text-[#FBA3FF] mb-4 text-center">
                  {exerciseIncreaseError}
                </p>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={applyExerciseIncreaseAndContinue}
                  disabled={applyingExerciseIncrease}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    applyingExerciseIncrease
                      ? "bg-[#2A2E38] text-[#8A93A7] cursor-not-allowed"
                      : "bg-[#86FF99] hover:bg-[#6bd664] text-black"
                  }`}
                >
                  {applyingExerciseIncrease ? "Applying..." : "Approve +5% Increase"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowExerciseOverperformanceModal(false);
                    setExerciseIncreaseError("");
                    await advanceToNextDay();
                  }}
                  disabled={applyingExerciseIncrease}
                  className="w-full glass-button py-3 rounded-lg text-white font-semibold"
                >
                  Keep Current Load
                </button>
              </div>
            </div>
          </div>
        )}

      {workoutCompleted && weeklySummary && (
        <div className="fixed -left-[10000px] top-0 pointer-events-none" aria-hidden="true">
          <div
            ref={summaryShareCaptureRef}
            className="glass-modal rounded-2xl p-8 w-[28rem]"
          >
            {renderWorkoutSummaryCore()}
          </div>
        </div>
      )}

      {showReadOnlyWorkoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-white text-xl font-bold">Completed Workout</h2>
                {readOnlyWorkout && (
                  <p className="text-[#A0AEC0] text-sm mt-1">
                    Week {readOnlyWorkout.weekNumber}, Day {readOnlyWorkout.dayNumber}
                    {readOnlyWorkout.duration
                      ? ` • ${readOnlyWorkout.duration} min`
                      : ""}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowReadOnlyWorkoutModal(false);
                  setReadOnlyWorkoutError("");
                }}
                className="text-[#5E6272] hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {readOnlyWorkoutLoading ? (
                <div className="text-center py-8 text-[#5E6272]">
                  Loading completed workout...
                </div>
              ) : readOnlyWorkoutError ? (
                <div className="text-center py-8 text-red-400">{readOnlyWorkoutError}</div>
              ) : !readOnlyWorkout ? (
                <div className="text-center py-8 text-[#5E6272]">
                  No workout data available for this day.
                </div>
              ) : (
                <div className="space-y-3">
                  {readOnlyWorkout.exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="glass-subtile rounded-xl p-4 border border-white/10"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <MuscleIcon muscleGroup={exercise.muscleGroup} size={32} />
                        <h3 className="text-white font-semibold">{exercise.name}</h3>
                      </div>

                      <div className="space-y-2">
                        {exercise.sets.map((set) => (
                          <div
                            key={`${exercise.id}-${set.setNumber}`}
                            className="grid grid-cols-[auto,1fr,1fr,auto] gap-2 text-sm items-center"
                          >
                            <span className="text-[#A0AEC0] w-12">Set {set.setNumber}</span>
                            <span className="text-white">
                              {typeof set.weight === "number"
                                ? `${set.weight}kg`
                                : "-"}
                            </span>
                            <span className="text-white">
                              {typeof set.reps === "number"
                                ? `${set.reps} reps`
                                : "-"}
                              {typeof set.targetReps === "number"
                                ? ` (target ${set.targetReps})`
                                : ""}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                set.completed ? "text-green-300" : "text-[#A0AEC0]"
                              }`}
                            >
                              {set.completed ? "Completed" : "Skipped"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaving Workout Modal */}
      {showExerciseHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-white text-xl font-bold">Exercise History</h2>
                <p className="text-[#A0AEC0] text-sm mt-1">{historyExerciseName}</p>
              </div>
              <button
                onClick={() => setShowExerciseHistoryModal(false)}
                className="text-[#5E6272] hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {historyLoading ? (
                <div className="text-center py-8 text-[#5E6272]">Loading history...</div>
              ) : historyError ? (
                <div className="text-center py-8 text-red-400">{historyError}</div>
              ) : exerciseHistory.length === 0 ? (
                <div className="text-center py-8 text-[#5E6272]">
                  No previous history found for this exercise yet.
                </div>
              ) : (
                <>
                  {(() => {
                    const allSets = exerciseHistory.flatMap(
                      (entry) => entry.sets || [],
                    );
                    const bestWeight = allSets.reduce(
                      (max, set) => Math.max(max, set.weight || 0),
                      0,
                    );
                    const bestReps = allSets.reduce(
                      (max, set) => Math.max(max, set.reps || 0),
                      0,
                    );

                    return (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="glass-subtile rounded-lg p-3 text-center">
                          <p className="text-[#5E6272] text-xs">Best Weight</p>
                          <p className="text-white font-semibold">{bestWeight}kg</p>
                        </div>
                        <div className="glass-subtile rounded-lg p-3 text-center">
                          <p className="text-[#5E6272] text-xs">Best Reps</p>
                          <p className="text-white font-semibold">{bestReps} reps</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-3">
                    {exerciseHistory.map((entry, idx) => (
                    <div
                      key={`${entry.date}-${idx}`}
                      className="glass-subtile rounded-xl p-4"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-white text-sm font-semibold">
                          {new Date(entry.date).toLocaleDateString()}
                        </p>
                        <p className="text-[#5E6272] text-xs">
                          Week {entry.weekNumber}, Day {entry.dayNumber}
                        </p>
                      </div>
                      <div className="space-y-1">
                        {[...entry.sets]
                          .sort((a, b) => a.setNumber - b.setNumber)
                          .map((set) => (
                            <p key={set.setNumber} className="text-[#D1D5DB] text-sm">
                              Set {set.setNumber}: {set.weight}kg × {set.reps} reps
                              {set.setType === "drop" && (
                                <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-[#FBA3FF]">
                                  Drop Set
                                </span>
                              )}
                            </p>
                          ))}
                      </div>
                    </div>
                    ))}
                  </div>

                  {hasMoreHistory && (
                    <button
                      onClick={loadMoreExerciseHistory}
                      disabled={historyLoadingMore}
                      className={`w-full mt-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        historyLoadingMore
                          ? "bg-[#2A2E38]/50 text-[#5E6272] cursor-not-allowed"
                          : "glass-button text-white"
                      }`}
                    >
                      {historyLoadingMore
                        ? "Loading more..."
                        : "Load more"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skip Workout Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1C1F26] border border-[#2F3544] rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white text-xl font-bold text-center mb-3">
              Skip this session?
            </h2>
            <p className="text-[#A0AEC0] text-sm text-center mb-1">
              This workout will be marked as missed and your programme will advance to the next day.
            </p>
            <p className="text-[#5E6272] text-xs text-center mb-6">
              Your exercise history won't be affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSkipModal(false)}
                className="flex-1 py-3 bg-[#2A2E38] hover:bg-[#3A3E48] text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={skipWorkout}
                disabled={skippingWorkout}
                className="flex-1 py-3 bg-[#FF6B6B] hover:bg-red-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {skippingWorkout ? "Skipping…" : "Skip Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeavingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-modal rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-white text-2xl font-bold text-center mb-4">
              Leave Workout?
            </h2>
            <p className="text-[#A0AEC0] text-center mb-6">
              Your workout progress will be saved. You can continue where you
              left off when you come back.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  console.log("Continue button clicked");
                  setShowLeavingModal(false);
                  setNextLocation(null);
                }}
                className="glass-button flex-1 px-4 py-3 rounded-lg text-white font-semibold transition-colors"
              >
                Continue Workout
              </button>
              <button
                onClick={() => {
                  console.log(
                    "Leave button clicked, navigating to",
                    nextLocation,
                  );
                  setShowLeavingModal(false);
                  // Keep the workout session saved - don't remove it!
                  if (nextLocation) {
                    navigate(nextLocation);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 font-semibold transition-colors border border-red-500/50"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl font-bold">
                {replaceTargetExerciseId ? "Replace Exercise" : "Add Exercise"}
              </h2>
              <button onClick={closeAddExerciseModal} className="text-[#5E6272] hover:text-white">
                <X size={24} />
              </button>
            </div>

            {showCreateExerciseForm ? (
              /* ── Create custom exercise form ── */
              <div className="flex flex-col gap-4 overflow-y-auto">
                <p className="text-[#A0AEC0] text-sm">Saved to your account and available in future workouts.</p>

                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Exercise name *</label>
                  <input
                    type="text"
                    value={createExerciseForm.name}
                    onChange={(e) => setCreateExerciseForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Paused Squat"
                    className="w-full glass-subtile rounded-lg px-3 py-2.5 text-white text-sm border border-white/10 focus:border-[#00FFAD]/60 outline-none"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Muscle group *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Chest","Back","Shoulders","Quads","Hamstrings","Glutes","Biceps","Triceps","Calves","Abs","Forearms"].map((mg) => (
                      <button
                        key={mg}
                        type="button"
                        onClick={() => setCreateExerciseForm((f) => ({ ...f, muscleGroup: mg }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          createExerciseForm.muscleGroup === mg
                            ? "bg-[#00FFAD] text-black border-[#00FFAD]"
                            : "glass-chip border-white/10 text-[#B8C1D9] hover:text-white hover:border-white/30"
                        }`}
                      >
                        {mg}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Equipment</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["None","Barbell","Dumbbell","Cable","Machine","Bodyweight","Resistance Band","Kettlebell"].map((eq) => {
                      const val = eq === "None" ? "" : eq;
                      return (
                        <button
                          key={eq}
                          type="button"
                          onClick={() => setCreateExerciseForm((f) => ({ ...f, equipment: val }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                            createExerciseForm.equipment === val
                              ? "bg-[#9ED3FF] text-black border-[#9ED3FF]"
                              : "glass-chip border-white/10 text-[#B8C1D9] hover:text-white hover:border-white/30"
                          }`}
                        >
                          {eq}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Type</label>
                  <div className="flex gap-2">
                    {[{val:"isolation",label:"Isolation"},{val:"compound",label:"Compound"}].map(({val,label}) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCreateExerciseForm((f) => ({ ...f, category: val }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          createExerciseForm.category === val
                            ? "bg-[#246BFD] text-white border-[#246BFD]"
                            : "glass-chip border-white/10 text-[#B8C1D9] hover:text-white hover:border-white/30"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {createExerciseError && (
                  <p className="text-[#FBA3FF] text-sm">{createExerciseError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setShowCreateExerciseForm(false); setCreateExerciseError(""); }}
                    className="flex-1 glass-button py-2.5 rounded-lg text-white text-sm font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={saveCustomExercise}
                    disabled={savingCustomExercise}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${savingCustomExercise ? "bg-[#2A2E38] text-[#8A93A7] cursor-not-allowed" : "bg-[#00FFAD] text-black hover:bg-[#00e09a]"}`}
                  >
                    {savingCustomExercise ? "Saving..." : "Save & Add"}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Browse & filter ── */
              <>
                {/* Muscle group filter */}
                <div className="mb-2">
                  <p className="text-[#A0AEC0] text-xs uppercase tracking-wide mb-1.5">Muscle group</p>
                  <div className="flex flex-wrap gap-1.5">
                    {getUniqueMuscleGroups().map((group) => (
                      <button
                        key={group}
                        onClick={() => setSelectedMuscleGroupFilter(group)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedMuscleGroupFilter === group
                            ? "bg-[#00FFAD] text-black"
                            : "glass-chip text-[#B8C1D9] hover:text-white"
                        }`}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Equipment filter */}
                <div className="mb-3">
                  <p className="text-[#A0AEC0] text-xs uppercase tracking-wide mb-1.5">Equipment</p>
                  <div className="flex flex-wrap gap-1.5">
                    {getUniqueEquipmentTypes().map((eq) => (
                      <button
                        key={eq}
                        onClick={() => setSelectedEquipmentFilter(eq)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedEquipmentFilter === eq
                            ? "bg-[#9ED3FF] text-black"
                            : "glass-chip text-[#B8C1D9] hover:text-white"
                        }`}
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Create custom exercise button */}
                <button
                  onClick={() => setShowCreateExerciseForm(true)}
                  className="w-full mb-3 glass-button border border-dashed border-white/20 rounded-lg py-2.5 text-sm font-medium text-[#9ED3FF] hover:text-white hover:border-[#9ED3FF]/50 flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Create custom exercise
                </button>

                <div className="flex-1 overflow-y-auto">
                  {loadingExercises ? (
                    <div className="text-center py-8 text-[#5E6272]">Loading exercises...</div>
                  ) : (
                    <div className="space-y-2">
                      {getFilteredExercises().map((exercise) => {
                        const isAlreadyInWorkout = todayExercises.some(
                          (ex) => ex.exerciseId === exercise.id && ex.exerciseId !== replaceTargetExerciseId,
                        );
                        return (
                          <button
                            key={exercise.id}
                            onClick={() => addExerciseToWorkout(exercise)}
                            disabled={isAlreadyInWorkout}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              isAlreadyInWorkout
                                ? "glass-subtile border-[#404040] opacity-50 cursor-not-allowed"
                                : "glass-subtile hover:border-[#9ED3FF]/70"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <MuscleIcon muscleGroup={exercise.muscleGroup} size={38} />
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm">
                                  {exercise.name}
                                  {exercise.isCustom && (
                                    <span className="ml-2 text-[10px] text-[#9ED3FF] font-normal uppercase tracking-wide">custom</span>
                                  )}
                                </p>
                                <p className="text-[#5E6272] text-xs">
                                  {exercise.muscleGroup}{exercise.equipment ? ` · ${exercise.equipment}` : ""}
                                </p>
                              </div>
                            </div>
                            {isAlreadyInWorkout && (
                              <p className="text-[#FBA3FF] text-xs mt-1">Already in workout</p>
                            )}
                          </button>
                        );
                      })}
                      {getFilteredExercises().length === 0 && (
                        <p className="text-center text-[#5E6272] py-6 text-sm">No exercises match these filters.</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Deload Week Start Modal */}
      {showDeloadWeekModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="glass-modal rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-white text-2xl font-bold text-center mb-4">
              Deload Week Started
            </h2>
            <p className="text-[#A0AEC0] text-center mb-3">
              This week is your deload: lower load and fewer sets to help your body recover.
            </p>
            <p className="text-[#5E6272] text-center mb-6">
              We recommend doing this week. If you feel great with no joint pain,
              you can end this programme now and start a new one.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeloadWeekModal(false)}
                className="glass-button flex-1 px-4 py-3 rounded-lg text-white font-semibold transition-colors"
              >
                Continue Deload
              </button>
              <button
                onClick={() => {
                  setShowDeloadWeekModal(false);
                  setShowEndProgrammeModal(true);
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 font-semibold transition-colors border border-red-500/50"
              >
                End Programme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Programme Confirmation Modal */}
      {showEndProgrammeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-modal rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-white text-2xl font-bold text-center mb-4">
              End This Programme?
            </h2>
            <p className="text-[#A0AEC0] text-center mb-2">
              You're currently on{" "}
              <span className="font-semibold text-white">
                Week {userProgram?.currentWeek}, Day {userProgram?.currentDay}
              </span>
            </p>
            <p className="text-[#5E6272] text-center mb-6">
              Ending your programme will save your progress and mark this
              programme as completed. You'll be able to start a new programme
              and your workout history will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndProgrammeModal(false)}
                className="glass-button flex-1 px-4 py-3 rounded-lg text-white font-semibold transition-colors"
              >
                Continue Programme
              </button>
              <button
                onClick={endProgramme}
                disabled={endingProgramme}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  endingProgramme
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-500/50"
                }`}
              >
                {endingProgramme ? "Ending..." : "End Programme"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');

        .font-inter {
          font-family: 'Inter', sans-serif;
        }

        .glass-card,
        .glass-modal,
        .glass-subtile,
        .glass-menu,
        .glass-input,
        .glass-button,
        .glass-chip,
        .glass-pressable {
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        .glass-card {
          background: linear-gradient(145deg, rgba(36, 44, 62, 0.72), rgba(20, 26, 40, 0.62));
        }

        .glass-modal {
          background: linear-gradient(155deg, rgba(26, 34, 52, 0.86), rgba(14, 20, 32, 0.78));
        }

        .glass-subtile {
          background: linear-gradient(145deg, rgba(50, 62, 86, 0.44), rgba(30, 39, 58, 0.36));
        }

        .glass-menu {
          background: linear-gradient(170deg, rgba(30, 38, 58, 0.9), rgba(18, 24, 38, 0.84));
          border-color: rgba(255, 255, 255, 0.16);
        }

        .glass-input {
          background: linear-gradient(145deg, rgba(36, 45, 64, 0.6), rgba(24, 31, 46, 0.45));
          border-color: rgba(255, 255, 255, 0.1);
        }

        .glass-input:focus {
          outline: none;
          border-color: rgba(134, 255, 153, 0.7);
          box-shadow: 0 0 0 2px rgba(134, 255, 153, 0.16);
        }

        .glass-button,
        .glass-chip,
        .glass-pressable {
          background: linear-gradient(145deg, rgba(56, 66, 88, 0.45), rgba(30, 38, 56, 0.3));
        }

        .glass-button:hover,
        .glass-chip:hover,
        .glass-pressable:hover {
          background: linear-gradient(145deg, rgba(70, 82, 110, 0.5), rgba(40, 50, 74, 0.36));
        }

        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      <BottomBar onLogout={handleLogout} />
    </motion.div>
  );
}
