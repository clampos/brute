import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { pageTransition, easeOut } from "../utils/animations";
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  Check,
  X,
  Save,
  BarChart2,
  RefreshCw,
} from "lucide-react";
import MuscleIcon from "../components/MuscleIcon";
import logo from "../assets/logo.png";
import icon from "../assets/icon_placeholder.png";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";

type Exercise = {
  isSelected: boolean;
  id: string;
  name: string;
  muscleGroup: string;
  category: string;
  equipment?: string;
  instructions?: string;
};

type ProgrammeExercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  exerciseId: string;
  muscleGroup?: string;
  isSelected: boolean;
  strengthRole: "MAIN_LIFT" | "SUPPLEMENTAL" | "ACCESSORY";
};

type ProgrammeDay = {
  dayNumber: number;
  exercises: ProgrammeExercise[];
  availableExercises: Exercise[];
  showAvailable: boolean;
  hasChanges: boolean;
  exerciseOptions: Exercise[]; // Initial 3 exercise options
  showMoreOptions: boolean; // Whether to show additional options
  loadingAvailable?: boolean; // whether the full available list is loading
};

type ProgrammeExerciseResponse = {
  id: string;
  dayNumber: number;
  sets: number;
  reps: string;
  strengthRole?: "MAIN_LIFT" | "SUPPLEMENTAL" | "ACCESSORY";
  exercise?: {
    id: string;
    name: string;
  };
  exerciseId: string;
};

type ProgrammeResponse = {
  name: string;
  description?: string;
  bodyPartFocus?: string;
  progressionFocus?: "MUSCLE_BUILDING" | "STRENGTH";
  daysPerWeek?: number;
  experienceLevel?: string;
  exercises?: ProgrammeExerciseResponse[];
  error?: string;
};

const defaultStrengthRoleForIndex = (
  index: number,
): "MAIN_LIFT" | "SUPPLEMENTAL" | "ACCESSORY" => {
  if (index === 0) return "MAIN_LIFT";
  if (index <= 2) return "SUPPLEMENTAL";
  return "ACCESSORY";
};

export default function ProgrammeEditor() {
  const { programmeId } = useParams();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("Loading...");
  const [bodyFocus, setBodyFocus] = useState("Full Body");
  const [description, setDescription] = useState("");
  const [progressionFocus, setProgressionFocus] = useState<
    "MUSCLE_BUILDING" | "STRENGTH"
  >("MUSCLE_BUILDING");
  const [experienceLevel, setExperienceLevel] = useState<string>("intermediate");
  const [days, setDays] = useState<ProgrammeDay[]>([]);
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [savedDay, setSavedDay] = useState<number | null>(null);
  const [submittingProgramme, setSubmittingProgramme] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [replacingExercise, setReplacingExercise] = useState<{
    dayNumber: number;
    progExId: string;
    muscleGroup: string;
    currentExerciseId: string;
  } | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceModalMuscleFilter, setReplaceModalMuscleFilter] = useState<string>("All");
  const [replaceModalEquipmentFilter, setReplaceModalEquipmentFilter] = useState<string>("All");

  const toggleDay = (dayNumber: number) => {
    setOpenDays((prev) => ({
      ...prev,
      [dayNumber]: !prev[dayNumber],
    }));
  };

  // Get 3 random exercises for initial display
  const getRandomExercises = (
    exercises: Exercise[],
    count: number = 3,
  ): Exercise[] => {
    const shuffled = [...exercises].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Load initial exercise options for a day (only 3)
  const loadInitialExerciseOptions = async (dayNumber: number) => {
    try {
      const muscleGroups = getMuscleGroupsForFocus(bodyFocus);
      const exercisePromises = muscleGroups.map((group) =>
        fetchAvailableExercises(group),
      );
      const exerciseArrays = await Promise.all(exercisePromises);
      const fetchedExercises = exerciseArrays.flat();

      // Remove duplicates based on exercise ID
      const uniqueExercises = fetchedExercises.filter(
        (exercise, index, self) =>
          index === self.findIndex((e) => e.id === exercise.id),
      );

      // Get only 3 random exercises for initial display
      const initialOptions = getRandomExercises(uniqueExercises, 3);

      setDays((prevDays) =>
        prevDays.map((day) =>
          day.dayNumber === dayNumber
            ? {
                ...day,
                exerciseOptions: initialOptions.map((ex) => ({
                  ...ex,
                  isSelected: day.exercises.some(
                    (existing) => existing.exerciseId === ex.id,
                  ),
                })),
                availableExercises: uniqueExercises.map((ex) => ({
                  ...ex,
                  isSelected: day.exercises.some(
                    (existing) => existing.exerciseId === ex.id,
                  ),
                })),
              }
            : day,
        ),
      );

      setAllExercises(uniqueExercises);
    } catch (err) {
      console.error("Error loading initial exercise options:", err);
      setError("Failed to load exercise options");
    }
  };

  const toggleAvailableExercises = async (dayNumber: number) => {
    const currentDay = days.find((d) => d.dayNumber === dayNumber);
    if (!currentDay) return;

    const isCurrentlyShowing = currentDay.showMoreOptions || false;

    if (!isCurrentlyShowing) {
      // show the panel immediately so users see a loading state
      setDays((prevDays) =>
        prevDays.map((day) =>
          day.dayNumber === dayNumber
            ? { ...day, showMoreOptions: true, loadingAvailable: true }
            : day,
        ),
      );

      // fetch full list and update the day when ready
      await fetchAndUpdateAvailableExercises(dayNumber);
    } else {
      // hide
      setDays((prevDays) =>
        prevDays.map((day) =>
          day.dayNumber === dayNumber
            ? { ...day, showMoreOptions: false }
            : day,
        ),
      );
    }
  };

  const fetchAndUpdateAvailableExercises = async (dayNumber: number) => {
    try {
      const muscleGroups = getMuscleGroupsForFocus(bodyFocus);
      console.debug(
        `[ProgrammeEditor] fetchAndUpdateAvailableExercises called for day=${dayNumber}, bodyFocus='${bodyFocus}', groups=${JSON.stringify(
          muscleGroups,
        )}`,
      );

      const exercisePromises = muscleGroups.map((group) =>
        fetchAvailableExercises(group),
      );
      const exerciseArrays = await Promise.all(exercisePromises);
      console.debug(
        `[ProgrammeEditor] fetch arrays lengths: ${exerciseArrays
          .map((a) => (Array.isArray(a) ? a.length : 0))
          .join(",")}`,
      );
      const fetchedExercises = exerciseArrays.flat();

      // Remove duplicates based on exercise ID
      const uniqueExercises = fetchedExercises.filter(
        (exercise, index, self) =>
          index === self.findIndex((e) => e.id === exercise.id),
      );

      setAllExercises(uniqueExercises);

      setDays((prevDays) =>
        prevDays.map((day) =>
          day.dayNumber === dayNumber
            ? {
                ...day,
                availableExercises: uniqueExercises.map((ex) => ({
                  ...ex,
                  isSelected: day.exercises.some(
                    (existing) => existing.exerciseId === ex.id,
                  ),
                })),
                loadingAvailable: false,
              }
            : day,
        ),
      );
    } catch (err) {
      console.error("Error fetching available exercises:", err);
      setError("Failed to load available exercises");
    }
  };

  // Fetch all exercises based on body focus
  const fetchAvailableExercises = async (
    focus: string,
  ): Promise<Exercise[]> => {
    try {
      const url = `/auth/exercises?muscleGroup=${encodeURIComponent(
        focus,
      )}`;

      console.debug(`[ProgrammeEditor] fetching exercises -> ${url}`);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.debug(
        `[ProgrammeEditor] fetch status: ${res.status} ${res.statusText}`,
      );

      if (!res.ok) {
        // try to read body for debug (may be small)
        let bodyText = "";
        try {
          bodyText = await res.text();
        } catch (e) {
          /* ignore */
        }
        console.error("Failed to fetch exercises:", res.status, bodyText);
        return [];
      }

      const exercises = await res.json();
      console.debug(
        `[ProgrammeEditor] fetched ${
          Array.isArray(exercises) ? exercises.length : 0
        } exercises for focus='${focus}'`,
      );
      return exercises || [];
    } catch (err) {
      console.error("Error fetching exercises:", err);
      return [];
    }
  };

  const handleAddExercise = (exerciseId: string, dayNumber: number) => {
    const exercise = allExercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;

    setDays((prevDays) =>
      prevDays.map((day) =>
        day.dayNumber === dayNumber
          ? (() => {
              const tempProgrammeExercise = {
                id: `temp-${Date.now()}-${exerciseId}`,
                name: exercise.name,
                sets: 3,
                reps: "8-12",
                exerciseId: exercise.id,
                muscleGroup: exercise.muscleGroup,
                isSelected: true,
                strengthRole:
                  progressionFocus === "STRENGTH"
                    ? defaultStrengthRoleForIndex(day.exercises.length)
                    : "ACCESSORY",
              };

              const nextExercises = [...day.exercises, tempProgrammeExercise];

              return {
                ...day,
                exercises: nextExercises,
                exerciseOptions: day.exerciseOptions.map((ex) =>
                  ex.id === exerciseId ? { ...ex, isSelected: true } : ex,
                ),
                availableExercises: day.availableExercises.map((ex) =>
                  ex.id === exerciseId ? { ...ex, isSelected: true } : ex,
                ),
                hasChanges: true,
              };
            })()
          : day,
      ),
    );
  };

  const handleStrengthRoleChange = (
    dayNumber: number,
    programmeExerciseId: string,
    strengthRole: "MAIN_LIFT" | "SUPPLEMENTAL" | "ACCESSORY",
  ) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === programmeExerciseId
                  ? { ...exercise, strengthRole }
                  : exercise,
              ),
              hasChanges: true,
            }
          : day,
      ),
    );
  };

  const handleRemoveExercise = (
    programmeExerciseId: string,
    exerciseId: string,
    dayNumber: number,
  ) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? {
              ...day,
              exercises: day.exercises.filter(
                (ex) => ex.id !== programmeExerciseId,
              ),
              exerciseOptions: day.exerciseOptions.map((ex) =>
                ex.id === exerciseId ? { ...ex, isSelected: false } : ex,
              ),
              availableExercises: day.availableExercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, isSelected: false } : ex,
              ),
              hasChanges: true,
            }
          : day,
      ),
    );
  };

  const handleReplaceExercise = (
    dayNumber: number,
    progExId: string,
    newExerciseId: string,
  ) => {
    const newEx = allExercises.find((e) => e.id === newExerciseId);
    if (!newEx) return;

    setDays((prev) =>
      prev.map((day) =>
        day.dayNumber !== dayNumber
          ? day
          : {
              ...day,
              exercises: day.exercises.map((ex) =>
                ex.id !== progExId
                  ? ex
                  : {
                      ...ex,
                      name: newEx.name,
                      exerciseId: newEx.id,
                      muscleGroup: newEx.muscleGroup,
                    },
              ),
              availableExercises: day.availableExercises.map((e) => ({
                ...e,
                isSelected:
                  e.id === newExerciseId
                    ? true
                    : e.id === replacingExercise?.currentExerciseId
                    ? false
                    : e.isSelected,
              })),
              hasChanges: true,
            },
      ),
    );
    setReplacingExercise(null);
    setShowReplaceModal(false);
  };

  const openReplaceModal = () => {
    if (!replacingExercise) return;
    setReplaceModalMuscleFilter(replacingExercise.muscleGroup || "All");
    setReplaceModalEquipmentFilter("All");
    setShowReplaceModal(true);
  };

  const closeReplaceModal = () => {
    setShowReplaceModal(false);
  };

  // Lock body scroll when the full replace modal is open
  useEffect(() => {
    if (showReplaceModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showReplaceModal]);

  const handleConfirmDay = async (dayNumber: number) => {
    setSavingDay(dayNumber);

    try {
      const day = days.find((d) => d.dayNumber === dayNumber);
      if (!day) return;

      console.log(`🔍 Confirming Day ${dayNumber}`);
      console.log(`📊 Current exercises in state:`, day.exercises);
      console.log(
        `📊 Exercises to save:`,
        day.exercises.filter((ex) => ex.isSelected),
      );

      // First, delete ALL existing exercises for this day from the database
      const deleteRes = await fetch(
        `/auth/programmes/${programmeId}/exercises/day/${dayNumber}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!deleteRes.ok) {
        console.error("Failed to delete existing exercises");
      }

      // Then add ONLY the exercises currently in the day.exercises array
      const exercisesToAdd = day.exercises.filter((ex) => ex.isSelected);
      const addedExercises: ProgrammeExercise[] = [];

      console.log(
        `✅ Adding ${exercisesToAdd.length} exercises to Day ${dayNumber}`,
      );

      for (const exercise of exercisesToAdd) {
        const postRes = await fetch(
          `/auth/programmes/${programmeId}/exercises`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              exerciseId: exercise.exerciseId,
              dayNumber,
              sets: exercise.sets,
              reps: exercise.reps,
              strengthRole: exercise.strengthRole,
            }),
          },
        );

        if (!postRes.ok) {
          throw new Error("Failed to add exercise");
        }

        const newProgrammeExercise = await postRes.json();
        console.log(`✅ Added exercise:`, newProgrammeExercise);

        addedExercises.push({
          id: newProgrammeExercise.id,
          name: exercise.name,
          sets: newProgrammeExercise.sets,
          reps: newProgrammeExercise.reps,
          exerciseId: exercise.exerciseId,
          isSelected: true,
          strengthRole:
            newProgrammeExercise.strengthRole || exercise.strengthRole,
        });
      }

      console.log(
        `✅ Final saved exercises for Day ${dayNumber}:`,
        addedExercises,
      );

      // Update the day with real IDs and mark as saved
      setDays((prevDays) =>
        prevDays.map((day) =>
          day.dayNumber === dayNumber
            ? {
                ...day,
                exercises: addedExercises,
                hasChanges: false,
                showMoreOptions: false,
              }
            : day,
        ),
      );

      setSavedDay(dayNumber);
      setTimeout(() => setSavedDay(null), 2000);
    } catch (err) {
      console.error("Error confirming day:", err);
      setError("Failed to save exercises for this day");
    } finally {
      setSavingDay(null);
    }
  };

  const handleConfirmAll = async () => {
    const token = localStorage.getItem("token");
    if (!token || !programmeId) return;

    setConfirmingAll(true);
    setError("");

    try {
      for (const day of days) {
        // Delete all existing exercises for this day
        await fetch(
          `/auth/programmes/${programmeId}/exercises/day/${day.dayNumber}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );

        // Re-add current exercises
        for (const exercise of day.exercises.filter((ex) => ex.isSelected)) {
          const res = await fetch(
            `/auth/programmes/${programmeId}/exercises`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                exerciseId: exercise.exerciseId,
                dayNumber: day.dayNumber,
                sets: exercise.sets,
                reps: exercise.reps,
                strengthRole: exercise.strengthRole,
              }),
            },
          );
          if (!res.ok) throw new Error(`Failed to save Day ${day.dayNumber}`);
        }
      }

      // Mark all days as saved
      setDays((prev) => prev.map((d) => ({ ...d, hasChanges: false })));
      navigate("/programmes");
    } catch (err: any) {
      setError(err.message ?? "Failed to save programme");
    } finally {
      setConfirmingAll(false);
    }
  };

  const handleSubmitProgramme = () => {
    navigate("/programmes");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

  // Get muscle groups to focus on based on body part focus
  const getMuscleGroupsForFocus = (focus: string): string[] => {
    switch (focus.toLowerCase()) {
      case "full body":
        return [
          "Chest", "Back", "Shoulders", "Quads", "Hamstrings",
          "Glutes", "Biceps", "Triceps", "Forearms", "Calves", "Abs",
        ];
      case "upper body":
      case "upper":
        return ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms"];
      case "lower body":
      case "lower":
        return ["Quads", "Hamstrings", "Glutes", "Calves", "Abs"];
      case "push":
        return ["Chest", "Shoulders", "Triceps"];
      case "pull":
        return ["Back", "Biceps", "Forearms"];
      case "legs":
        return ["Quads", "Hamstrings", "Glutes", "Calves"];
      // Generated programme labels
      case "upper / lower":
        return [
          "Chest", "Back", "Shoulders", "Biceps", "Triceps",
          "Quads", "Hamstrings", "Glutes", "Calves",
        ];
      case "push / pull / legs":
        return [
          "Chest", "Back", "Shoulders", "Biceps", "Triceps",
          "Quads", "Hamstrings", "Glutes", "Calves", "Abs",
        ];
      default:
        return [focus];
    }
  };

  // Load programme data
  useEffect(() => {
    const fetchProgramme = async () => {
      if (!programmeId) return;

      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/auth/programmes/${programmeId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        const data: ProgrammeResponse = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch programme");

        setDisplayName(data.name);
        setDescription(data.description || "");
        setBodyFocus(data.bodyPartFocus || "Full Body");
        const programmeProgressionFocus =
          data.progressionFocus || "MUSCLE_BUILDING";
        setProgressionFocus(programmeProgressionFocus);
        if (data.experienceLevel) setExperienceLevel(data.experienceLevel);

        // Group current programme exercises by day
        const grouped: Record<number, ProgrammeExercise[]> = {};

        data.exercises?.forEach((item: ProgrammeExerciseResponse) => {
          const day = item.dayNumber ?? 1;
          if (!grouped[day]) grouped[day] = [];

          const programmeExercise = {
            id: item.id,
            name: item.exercise?.name || "Unnamed",
            sets: item.sets ?? 3,
            reps: item.reps ?? "8-12",
            exerciseId: item.exercise?.id || item.exerciseId,
            isSelected: true,
            strengthRole:
              item.strengthRole ||
              defaultStrengthRoleForIndex((grouped[day] || []).length),
          };

          grouped[day].push(programmeExercise);
        });

        // Create days array
        const daysPerWeek = data.daysPerWeek || 3;
        const loadedDays: ProgrammeDay[] = [];

        for (let i = 1; i <= daysPerWeek; i++) {
          loadedDays.push({
            dayNumber: i,
            exercises: grouped[i] || [],
            availableExercises: [],
            exerciseOptions: [],
            showAvailable: false,
            showMoreOptions: false,
            loadingAvailable: false,
            hasChanges: false,
          });
        }

        setDays(loadedDays);
        setOpenDays(
          Object.fromEntries(loadedDays.map((d) => [d.dayNumber, true])),
        );

        // Fetch a single pool of available exercises for the programme focus
        try {
          const focus = data.bodyPartFocus || "Full Body";

          // Fetch across likely muscle groups for this focus (more robust than a single-focus fetch)
          const groups = getMuscleGroupsForFocus(focus);
          const arrays = await Promise.all(
            groups.map((g) => fetchAvailableExercises(g)),
          );
          let pool = arrays.flat();

          // Fallback: if nothing found, try the raw focus string (legacy behaviour)
          if (pool.length === 0) {
            console.debug(
              `[ProgrammeEditor] initial pool empty for focus='${focus}', groups=${JSON.stringify(
                groups,
              )}; trying raw focus fallback`,
            );
            pool = await fetchAvailableExercises(focus);
          }

          // Remove duplicates
          const uniquePool = pool.filter(
            (exercise, index, self) =>
              index === self.findIndex((e) => e.id === exercise.id),
          );

          console.debug(
            `[ProgrammeEditor] initial uniquePool size=${uniquePool.length} for focus='${focus}'`,
          );

          setAllExercises(uniquePool);

          // For each day with no existing exercises, pick 3 random selected exercises
          const withInitialSelections = loadedDays.map((day) => {
            if (!day.exercises || day.exercises.length === 0) {
              const selected = getRandomExercises(uniquePool, 3).map(
                (ex, idx) => ({
                  id: `temp-${Date.now()}-${ex.id}-${Math.floor(
                    Math.random() * 1000,
                  )}`,
                  name: ex.name,
                  sets: 3,
                  reps: "8-12",
                  exerciseId: ex.id,
                  isSelected: true,
                  strengthRole:
                    programmeProgressionFocus === "STRENGTH"
                      ? defaultStrengthRoleForIndex(idx)
                      : "ACCESSORY",
                }),
              );

              const selectedIds = new Set(selected.map((s) => s.exerciseId));

              return {
                ...day,
                exercises: selected,
                availableExercises: uniquePool.map((ex) => ({
                  ...ex,
                  isSelected: selectedIds.has(ex.id),
                })),
                exerciseOptions: [], // do not show recommended list beneath
                showMoreOptions: false,
              };
            }

            // If the day already has exercises, still provide the available pool
            return {
              ...day,
              exercises: day.exercises.map((ex) => ({
                ...ex,
                muscleGroup: uniquePool.find((a) => a.id === ex.exerciseId)?.muscleGroup || ex.muscleGroup || "",
              })),
              availableExercises: uniquePool.map((ex) => ({
                ...ex,
                isSelected: day.exercises.some(
                  (existing) => existing.exerciseId === ex.id,
                ),
              })),
              exerciseOptions: [],
            };
          });

          setDays(withInitialSelections);
          setOpenDays(
            Object.fromEntries(
              withInitialSelections.map((d) => [d.dayNumber, true]),
            ),
          );
        } catch (err) {
          console.error("Error loading initial exercise pool:", err);
          // fallback: keep loadedDays as-is
          setDays(loadedDays);
          setOpenDays(
            Object.fromEntries(loadedDays.map((d) => [d.dayNumber, true])),
          );
        }
      } catch (err: any) {
        console.error("Error loading programme:", err);
        setError(err.message || "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProgramme();
  }, [programmeId]);

  // Weekly sets per muscle group — recomputed live as exercises change
  const weeklyVolume = useMemo(() => {
    const vol: Record<string, number> = {};
    for (const day of days) {
      for (const ex of day.exercises) {
        const mg =
          ex.muscleGroup ||
          allExercises.find((a) => a.id === ex.exerciseId)?.muscleGroup ||
          "";
        if (!mg) continue;
        vol[mg] = (vol[mg] || 0) + ex.sets;
      }
    }
    return vol;
  }, [days, allExercises]);

  // Hypertrophy volume guidance per muscle (sets/week), tiered by experience level
  const volumeRangesByLevel: Record<string, Record<string, [number, number]>> = {
    beginner: {
      Chest:      [6,  12],
      Back:       [6,  12],
      Shoulders:  [6,  10],
      Quads:      [6,  12],
      Hamstrings: [6,  10],
      Glutes:     [6,  10],
      Biceps:     [4,  8],
      Triceps:    [4,  8],
      Calves:     [6,  10],
      Abs:        [6,  10],
    },
    intermediate: {
      Chest:      [10, 18],
      Back:       [10, 18],
      Shoulders:  [8,  18],
      Quads:      [10, 18],
      Hamstrings: [8,  14],
      Glutes:     [8,  14],
      Biceps:     [6,  12],
      Triceps:    [6,  12],
      Calves:     [8,  14],
      Abs:        [8,  14],
    },
    advanced: {
      Chest:      [14, 22],
      Back:       [14, 22],
      Shoulders:  [12, 22],
      Quads:      [14, 22],
      Hamstrings: [12, 20],
      Glutes:     [12, 20],
      Biceps:     [10, 16],
      Triceps:    [10, 16],
      Calves:     [12, 18],
      Abs:        [12, 18],
    },
  };

  const volumeRanges = volumeRangesByLevel[experienceLevel] ?? volumeRangesByLevel.intermediate;

  const getVolumeStatus = (muscle: string, sets: number): "low" | "optimal" | "high" => {
    const range = volumeRanges[muscle] ?? [10, 20];
    if (sets < range[0]) return "low";
    if (sets <= range[1]) return "optimal";
    return "high";
  };

  // Check if programme is ready to submit (no unsaved changes)
  const isReadyToSubmit =
    days.length > 0 && !days.some((day) => day.hasChanges);

  return (
    <motion.div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-32"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      <TopBar
        title="Programmes"
        pageIcon={null}
        menuItems={[
          { label: "Dashboard", onClick: () => navigate("/dashboard") },
          { label: "Programmes", onClick: () => navigate("/programmes") },
          { label: "Workouts", onClick: () => navigate("/workouts") },
          { label: "Track Metrics", onClick: () => navigate("/metrics") },
          { label: "Settings", onClick: () => navigate("/settings") },
        ]}
      />

      {/* Programme Header */}
      <div className="mt-3 mb-4 bg-[#1C1F26] border border-[#2F3544] rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-white text-lg font-bold leading-tight">{displayName}</h3>
            {description && <p className="text-[#9CA3AF] text-xs mt-1">{description}</p>}
          </div>
          <span className="text-xs font-medium text-[#8EC5FF] bg-[#246BFD]/15 px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
            {bodyFocus}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg px-4 py-2 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Weekly Volume Summary */}
      {!loading && (
        <div className="mb-5 bg-[#1C1F26] border border-[#2F3544] rounded-2xl p-4">
          <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <BarChart2 size={15} className="text-[#8EC5FF]" />
            Weekly Volume
          </h4>
          <div className="space-y-2.5">
            {Object.keys(volumeRanges)
              .map((muscle) => {
                const sets = weeklyVolume[muscle] ?? 0;
                const status = getVolumeStatus(muscle, sets);
                const range = volumeRanges[muscle]!;
                const pct = Math.min((sets / range[1]) * 100, 100);
                const barColor =
                  status === "optimal" ? "bg-[#00FFAD]" :
                  status === "low"     ? "bg-amber-400" :
                                         "bg-red-400";
                const textColor =
                  status === "optimal" ? "text-[#00FFAD]" :
                  status === "low"     ? "text-amber-400" :
                                         "text-red-400";
                const statusLabel =
                  status === "optimal" ? "✓" :
                  status === "low"     ? "↑" :
                                         "↓";
                return (
                  <div key={muscle} className="flex items-center gap-3">
                    <div className="w-24 text-[#9CA3AF] text-xs text-right flex-shrink-0">{muscle}</div>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${barColor}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <div className={`w-16 text-right text-xs flex-shrink-0 ${textColor}`}>
                      {sets}s {statusLabel}
                    </div>
                  </div>
                );
              })}
          </div>
          <p className="text-[#4B5563] text-xs mt-3 border-t border-white/5 pt-3">
            {experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)} targets shown. Updates live as you edit.
          </p>
        </div>
      )}

      {/* Confirm Programme Button */}
      {!loading && (
        <div className="mb-6">
          <motion.button
            onClick={handleConfirmAll}
            disabled={confirmingAll || days.length === 0}
            whileHover={confirmingAll || days.length === 0 ? {} : { y: -2, boxShadow: "0 12px 40px rgba(36,107,253,0.5)" }}
            whileTap={confirmingAll || days.length === 0 ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`w-full py-4 rounded-2xl font-bold text-base tracking-wide flex items-center justify-center transition-all duration-200 ${
              confirmingAll || days.length === 0
                ? "bg-white/5 text-[#5E6272] cursor-not-allowed border border-white/10"
                : "bg-gradient-to-r from-[#246BFD] via-[#7B61FF] to-[#BE9EFF] text-white shadow-[0_8px_32px_rgba(36,107,253,0.35)] hover:opacity-95"
            }`}
          >
            {confirmingAll ? "Saving..." : "Confirm Programme"}
          </motion.button>
          <p className="text-[#5E6272] text-xs text-center mt-2">
            Check you are happy with each day before confirming
          </p>
        </div>
      )}

      {/* Loading or Error */}
      {loading ? (
        <p className="text-white text-center">Loading...</p>
      ) : (
        <div className="space-y-8">
          {days.map((day) => {
            const isOpen = openDays[day.dayNumber];
            const isSaving = savingDay === day.dayNumber;

            return (
              <div key={day.dayNumber} className="space-y-2">
                {/* Day Header */}
                {(() => {
                  const totalSets = day.exercises.reduce((s, ex) => s + ex.sets, 0);
                  const setsColor =
                    totalSets > 30 ? "text-red-400" :
                    totalSets > 25 ? "text-amber-400" :
                    totalSets > 0  ? "text-[#00FFAD]" :
                                     "text-[#5E6272]";
                  return (
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleDay(day.dayNumber)}
                      >
                        {isOpen ? (
                          <ChevronDown className="text-green-500 w-4 h-4" />
                        ) : (
                          <ChevronRight className="text-green-500 w-4 h-4" />
                        )}
                        <h2 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
                          Day {day.dayNumber}
                        </h2>
                        {day.hasChanges && (
                          <div className="w-2 h-2 bg-amber-400 rounded-full ml-1" title="Unsaved changes"></div>
                        )}
                      </div>
                      <span className={`text-xs font-semibold ${setsColor}`}>
                        {totalSets} sets
                      </span>
                    </div>
                  );
                })()}

                {/* Exercise Content */}
                {isOpen && (
                  <div className="space-y-4">
                    {/* Selected Exercises */}
                    {day.exercises.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
                          Selected Exercises ({day.exercises.length})
                        </h4>
                        {day.exercises.map((ex) => {
                          const isReplacing =
                            replacingExercise?.progExId === ex.id &&
                            replacingExercise?.dayNumber === day.dayNumber;

                          const replacementOptions = isReplacing
                            ? allExercises.filter(
                                (a) =>
                                  a.muscleGroup === replacingExercise.muscleGroup &&
                                  a.id !== ex.exerciseId &&
                                  !day.exercises.some((e) => e.exerciseId === a.id),
                              ).slice(0, 6)
                            : [];

                          return (
                            <div key={ex.id}>
                              <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 flex items-center justify-between transition-all">
                                <div className="flex items-center gap-3">
                                  <MuscleIcon
                                    muscleGroup={
                                      allExercises.find((a) => a.id === ex.exerciseId)?.muscleGroup || ex.muscleGroup || ""
                                    }
                                    size={44}
                                  />
                                  <div className="flex-1 text-center">
                                    <p className="font-semibold text-white flex items-center justify-center gap-2">
                                      {ex.name}
                                    </p>
                                    <div className="flex justify-center gap-3 text-sm mt-1">
                                      <span className="text-[#00FFAD]">{ex.sets} sets</span>
                                      <span className="text-[#5E6272]">{ex.reps} reps</span>
                                    </div>
                                    {progressionFocus === "STRENGTH" && (
                                      <div className="mt-2 flex items-center justify-center gap-2">
                                        <span className="text-xs text-[#9CA3AF]">Role</span>
                                        <select
                                          value={ex.strengthRole}
                                          onChange={(event) =>
                                            handleStrengthRoleChange(
                                              day.dayNumber,
                                              ex.id,
                                              event.target.value as "MAIN_LIFT" | "SUPPLEMENTAL" | "ACCESSORY",
                                            )
                                          }
                                          className="bg-[#111318] border border-[#2F3544] text-white text-xs rounded px-2 py-1"
                                        >
                                          <option value="MAIN_LIFT">Main Lift</option>
                                          <option value="SUPPLEMENTAL">Supplemental</option>
                                          <option value="ACCESSORY">Accessory</option>
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                  <button
                                    onClick={() =>
                                      setReplacingExercise(
                                        isReplacing
                                          ? null
                                          : {
                                              dayNumber: day.dayNumber,
                                              progExId: ex.id,
                                              muscleGroup:
                                                allExercises.find((a) => a.id === ex.exerciseId)?.muscleGroup ||
                                                ex.muscleGroup ||
                                                "",
                                              currentExerciseId: ex.exerciseId,
                                            },
                                      )
                                    }
                                    className={`p-1 rounded-lg transition-colors ${
                                      isReplacing
                                        ? "text-[#8EC5FF] bg-[#246BFD]/20"
                                        : "text-[#5E6272] hover:text-[#8EC5FF]"
                                    }`}
                                    title="Replace exercise"
                                  >
                                    <RefreshCw size={15} />
                                  </button>
                                  <XCircle
                                    className="text-[#5E6272] w-5 h-5 cursor-pointer hover:text-red-400 transition-colors"
                                    onClick={() =>
                                      handleRemoveExercise(ex.id, ex.exerciseId, day.dayNumber)
                                    }
                                  />
                                </div>
                              </div>

                              {/* Inline replace picker */}
                              {isReplacing && (
                                <div className="mt-2 space-y-1.5">
                                  {replacementOptions.length === 0 ? (
                                    <p className="text-[#5E6272] text-xs text-center py-3">No other exercises available for this muscle group</p>
                                  ) : (
                                    <>
                                      {replacementOptions.map((alt) => (
                                        <button
                                          key={alt.id}
                                          onClick={() =>
                                            handleReplaceExercise(day.dayNumber, ex.id, alt.id)
                                          }
                                          className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#1C1F26] border border-[#2F3544] rounded-xl hover:border-[#246BFD]/50 hover:bg-[#246BFD]/8 transition-all"
                                        >
                                          <MuscleIcon muscleGroup={alt.muscleGroup} size={36} />
                                          <span className="text-sm text-[#9CA3AF] hover:text-white text-left flex-1 font-medium">
                                            {alt.name}
                                          </span>
                                          <RefreshCw size={13} className="text-[#246BFD] flex-shrink-0" />
                                        </button>
                                      ))}
                                      <button
                                        onClick={openReplaceModal}
                                        className="w-full py-2.5 px-3 rounded-xl border border-[#2F3544] bg-white/4 hover:bg-white/8 hover:border-[#3F4554] text-xs text-[#8EC5FF] font-semibold tracking-wide transition-all flex items-center justify-center gap-2"
                                      >
                                        <Plus size={13} />
                                        View all exercises
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Controls: show only selected exercises initially and an Add More button */}
                    <div className="space-y-2">
                      {/* If a small recommended list exists (rare), show it; otherwise keep UI minimal */}
                      {day.exerciseOptions &&
                        day.exerciseOptions.length > 0 && (
                          <>
                            <h4 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
                              Recommended for {bodyFocus}
                            </h4>
                            {day.exerciseOptions
                              .filter((ex) => !ex.isSelected)
                              .slice(0, 3)
                              .map((ex) => (
                                <div
                                  key={ex.id}
                                  className="bg-[#1A1D23] border border-[#2A2D36] rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-[#3F4554] transition-colors"
                                  onClick={() =>
                                    handleAddExercise(ex.id, day.dayNumber)
                                  }
                                >
                                  <MuscleIcon
                                    muscleGroup={ex.muscleGroup}
                                    size={36}
                                  />
                                  <div className="flex-1 text-center">
                                    <p className="font-semibold text-[#9CA3AF]">
                                      {ex.name}
                                    </p>
                                  </div>
                                  <Plus className="text-blue-400 w-5 h-5 ml-3" />
                                </div>
                              ))}
                          </>
                        )}

                      {/* Add More Exercise Button (always visible) */}
                      <button
                        onClick={() => toggleAvailableExercises(day.dayNumber)}
                        className="w-full text-sm text-blue-400 flex items-center justify-center gap-2 py-2 hover:text-blue-300 transition-colors"
                      >
                        <Plus size={16} />
                        {day.showMoreOptions
                          ? "Hide More Options"
                          : "Add More Exercises"}
                      </button>

                      {/* Additional Available Exercises (shown when the user expands) */}
                      {day.showMoreOptions && (
                        <div className="mt-3 space-y-2 border-t border-[#2F3544] pt-3">
                          <h4 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
                            All Available Exercises ({bodyFocus})
                          </h4>
                          {day.loadingAvailable ? (
                            <p className="text-[#5E6272] text-sm text-center py-4">
                              Loading exercises...
                            </p>
                          ) : day.availableExercises.length > 0 ? (
                            day.availableExercises
                              .filter((ex) => !ex.isSelected)
                              .map((ex) => (
                                <div
                                  key={ex.id}
                                  className="bg-[#1A1D23] border border-[#2A2D36] rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-[#3F4554] transition-colors"
                                  onClick={() =>
                                    handleAddExercise(ex.id, day.dayNumber)
                                  }
                                >
                                  <MuscleIcon
                                    muscleGroup={ex.muscleGroup}
                                    size={36}
                                  />
                                  <div className="flex-1 text-center">
                                    <p className="font-semibold text-[#9CA3AF]">
                                      {ex.name}
                                    </p>
                                    <div className="flex justify-center gap-3 text-sm mt-1">
                                      <span className="text-[#6B7280]">
                                        {ex.muscleGroup}
                                      </span>
                                      <span className="text-[#6B7280]">
                                        {ex.category}
                                      </span>
                                      {ex.equipment && (
                                        <span className="text-[#6B7280]">
                                          {ex.equipment}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Plus className="text-blue-400 w-5 h-5 ml-3" />
                                </div>
                              ))
                          ) : (
                            <p className="text-[#5E6272] text-sm text-center py-4">
                              All available exercises have been added.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full Replace Exercise Modal */}
      {showReplaceModal && replacingExercise && (() => {
        const uniqueMuscleGroups = ["All", ...Array.from(new Set(allExercises.map((e) => e.muscleGroup).filter(Boolean))).sort()];
        const uniqueEquipment = ["All", ...Array.from(new Set(allExercises.map((e) => e.equipment || "").filter(Boolean))).sort()];

        const filtered = allExercises.filter((e) => {
          const muscleMatch = replaceModalMuscleFilter === "All" || e.muscleGroup === replaceModalMuscleFilter;
          const equipMatch = replaceModalEquipmentFilter === "All" || (e.equipment || "") === replaceModalEquipmentFilter;
          const notCurrentExercise = e.id !== replacingExercise.currentExerciseId;
          const day = days.find((d) => d.dayNumber === replacingExercise.dayNumber);
          const notAlreadyInDay = !day?.exercises.some(
            (ex) => ex.exerciseId === e.id && ex.exerciseId !== replacingExercise.currentExerciseId,
          );
          return muscleMatch && equipMatch && notCurrentExercise && notAlreadyInDay;
        });

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1C1F26] border border-[#2F3544] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2F3544]">
                <div>
                  <h2 className="text-white font-bold text-lg">Replace Exercise</h2>
                  <p className="text-[#5E6272] text-xs mt-0.5">Tap to swap in</p>
                </div>
                <button
                  onClick={closeReplaceModal}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#9CA3AF] hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Muscle group filter chips */}
              <div className="flex-shrink-0 flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-[#2F3544]">
                {uniqueMuscleGroups.map((group) => (
                  <button
                    key={group}
                    onClick={() => setReplaceModalMuscleFilter(group)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      replaceModalMuscleFilter === group
                        ? "bg-[#246BFD] text-white"
                        : "bg-white/8 text-[#9CA3AF] hover:text-white"
                    }`}
                  >
                    {group}
                  </button>
                ))}
              </div>

              {/* Equipment filter chips */}
              <div className="flex-shrink-0 flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide border-b border-[#2F3544]">
                {uniqueEquipment.map((eq) => (
                  <button
                    key={eq}
                    onClick={() => setReplaceModalEquipmentFilter(eq)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs transition-colors ${
                      replaceModalEquipmentFilter === eq
                        ? "bg-[#2F3544] text-white"
                        : "text-[#5E6272] hover:text-white"
                    }`}
                  >
                    {eq}
                  </button>
                ))}
              </div>

              {/* Exercise list */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#1F2330]">
                {filtered.length === 0 ? (
                  <p className="text-[#5E6272] text-sm text-center py-10">No exercises match these filters</p>
                ) : (
                  filtered.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => {
                        handleReplaceExercise(replacingExercise.dayNumber, replacingExercise.progExId, exercise.id);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <MuscleIcon muscleGroup={exercise.muscleGroup} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{exercise.name}</p>
                        <p className="text-[#5E6272] text-xs mt-0.5">
                          {exercise.muscleGroup}{exercise.equipment ? ` · ${exercise.equipment}` : ""}
                        </p>
                      </div>
                      <RefreshCw size={15} className="text-[#246BFD] flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <BottomBar onLogout={handleLogout} />
    </motion.div>
  );
}
