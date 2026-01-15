import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import TopBar from "../components/TopBar";
import InstallPrompt from "../components/InstallPrompt";
import {
  MoreHorizontal,
  Calendar,
  Play,
  Pause,
  Check,
  Target,
} from "lucide-react";
import MuscleIcon from "../components/MuscleIcon";

type WorkoutSet = {
  weight: string;
  reps: string;
  completed: boolean;
};

type WorkoutExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  exerciseId: string;
  workoutSets: WorkoutSet[];
  recommendation?: {
    recommendedWeight: number;
    recommendedReps: number;
    recommendedRPE: number;
    progressionType: string;
    reasoning: string;
  };
};

type UserProgram = {
  id: string;
  programme: {
    id: string;
    name: string;
    description?: string;
    bodyPartFocus: string;
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
  exercise: {
    id: string;
    name: string;
    muscleGroup: string;
  };
};

export default function Workouts() {
  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Programme state
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [todayExercises, setTodayExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );
  const [workoutCompleted, setWorkoutCompleted] = useState(false);

  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

  // Exercise menu state
  const [openExerciseMenu, setOpenExerciseMenu] = useState<string | null>(null);
  // Set menu state (keyed by `${exerciseId}:${setIdx}`)
  const [openSetMenu, setOpenSetMenu] = useState<string | null>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenExerciseMenu(null);
        setOpenSetMenu(null);
      }
    };

    if (openExerciseMenu || openSetMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openExerciseMenu, openSetMenu]);

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
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:4242/auth/exercises/random?focus=${encodeURIComponent(
          exercise.muscleGroup
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch replacement exercise");
      const newEx = await res.json();
      setTodayExercises((prev) =>
        prev.map((ex) =>
          ex.exerciseId === exerciseId
            ? {
                ...ex,
                name: newEx.name,
                exerciseId: newEx.id,
                muscleGroup: newEx.muscleGroup || ex.muscleGroup,
              }
            : ex
        )
      );
    } catch (err) {
      console.error("Replace exercise error:", err);
      alert("Failed to replace exercise");
    } finally {
      setOpenExerciseMenu(null);
    }
  };

  const addSetToExercise = (exerciseId: string) => {
    setTodayExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId
          ? {
              ...ex,
              workoutSets: [
                ...ex.workoutSets,
                { weight: "", reps: "", completed: false },
              ],
            }
          : ex
      )
    );
    setOpenExerciseMenu(null);
  };

  const skipNextSet = (exerciseId: string) => {
    setTodayExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const idx = ex.workoutSets.findIndex((s) => !s.completed);
        if (idx === -1) return ex;
        const nextSets = ex.workoutSets.map((s, i) =>
          i === idx ? { ...s, completed: true } : s
        );
        return { ...ex, workoutSets: nextSets };
      })
    );
    setOpenExerciseMenu(null);
  };

  const deleteExerciseById = (exerciseId: string) => {
    if (!confirm("Delete this exercise from the workout?")) return;
    setTodayExercises((prev) =>
      prev.filter((ex) => ex.exerciseId !== exerciseId)
    );
    setOpenExerciseMenu(null);
  };

  // Set-level actions
  const addSetBelow = (exerciseId: string, setIdx: number) => {
    setTodayExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId
          ? {
              ...ex,
              workoutSets: [
                ...ex.workoutSets.slice(0, setIdx + 1),
                { weight: "", reps: "", completed: false },
                ...ex.workoutSets.slice(setIdx + 1),
              ],
            }
          : ex
      )
    );
    setOpenSetMenu(null);
  };

  const skipSet = (exerciseId: string, setIdx: number) => {
    setTodayExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId
          ? {
              ...ex,
              workoutSets: ex.workoutSets.map((s, i) =>
                i === setIdx ? { ...s, completed: true } : s
              ),
            }
          : ex
      )
    );
    setOpenSetMenu(null);
  };

  const deleteSet = (exerciseId: string, setIdx: number) => {
    if (!confirm("Delete this set?")) return;
    setTodayExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId
          ? {
              ...ex,
              workoutSets: ex.workoutSets.filter((_, i) => i !== setIdx),
            }
          : ex
      )
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
    const mins = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const updateSetData = (
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps",
    value: string
  ) => {
    setTodayExercises((prev) =>
      prev.map((exercise) =>
        exercise.exerciseId === exerciseId
          ? {
              ...exercise,
              workoutSets: exercise.workoutSets.map((set, idx) =>
                idx === setIndex ? { ...set, [field]: value } : set
              ),
            }
          : exercise
      )
    );
  };

  const toggleSetCompletion = (exerciseId: string, setIndex: number) => {
    setTodayExercises((prev) =>
      prev.map((exercise) =>
        exercise.exerciseId === exerciseId
          ? {
              ...exercise,
              workoutSets: exercise.workoutSets.map((set, idx) =>
                idx === setIndex ? { ...set, completed: !set.completed } : set
              ),
            }
          : exercise
      )
    );
  };

  const addSet = (exerciseId: string) => {
    setTodayExercises((prev) =>
      prev.map((exercise) =>
        exercise.exerciseId === exerciseId
          ? {
              ...exercise,
              workoutSets: [
                ...exercise.workoutSets,
                {
                  weight: "",
                  reps: "",
                  completed: false,
                },
              ],
            }
          : exercise
      )
    );
  };

  const saveWorkout = async () => {
    if (!userProgram || !workoutStartTime) {
      setError("Cannot save workout - missing program or start time");
      return;
    }

    setSavingWorkout(true);
    try {
      const exercisesWithData = todayExercises.filter((exercise) =>
        exercise.workoutSets.some(
          (set) => set.completed && set.weight && set.reps
        )
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
            completed: set.completed,
          })),
      }));

      const duration = Math.floor(
        (new Date().getTime() - workoutStartTime.getTime()) / 1000 / 60
      );

      const response = await fetch("http://localhost:4242/auth/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          exercises: workoutData,
          duration: duration,
          notes: "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save workout");
      }

      const result = await response.json();

      // Show weekly summary if available, or mark as completed
      if (result.weeklySummary) {
        setWeeklySummary(result.weeklySummary);
        setWorkoutCompleted(true);
      } else {
        // Show completion screen with recommendations
        setWeeklySummary({
          recommendations: result.recommendations,
        });
        setWorkoutCompleted(true);
      }
    } catch (err: any) {
      console.error("Error saving workout:", err);
      setError(err.message || "Failed to save workout");
    } finally {
      setSavingWorkout(false);
    }
  };

  const advanceToNextDay = async () => {
    try {
      const response = await fetch(
        "http://localhost:4242/auth/workouts/complete-day",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
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
            }
          : prev
      );

      setTimerRunning(false);
      setSecondsElapsed(0);
      setWorkoutStartTime(null);

      window.location.reload();
    } catch (err: any) {
      console.error("Error advancing to next day:", err);
      setError(err.message || "Failed to advance to next day");
    }
  };

  const getExerciseName = (exerciseId: string): string => {
    const exercise = todayExercises.find((ex) => ex.exerciseId === exerciseId);
    return exercise ? exercise.name : "Unknown Exercise";
  };

  const loadProgressionRecommendations = async () => {
    if (!userProgram || todayExercises.length === 0) return;

    setLoadingRecommendations(true);
    try {
      const exerciseIds = todayExercises.map((ex) => ex.exerciseId);

      const response = await fetch(
        `http://localhost:4242/auth/workouts/recommendations?exerciseIds=${exerciseIds.join(
          ","
        )}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load recommendations");
      }

      const result = await response.json();

      setTodayExercises((prev) =>
        prev.map((exercise) => {
          const recommendation = result.recommendations.find(
            (rec: any) => rec.exerciseId === exercise.exerciseId
          );
          return {
            ...exercise,
            recommendation,
          };
        })
      );
    } catch (err: any) {
      console.error("Error loading recommendations:", err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  useEffect(() => {
    const fetchUserProgram = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:4242/auth/user-programs",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch user program");
        }

        const userPrograms = await response.json();

        const activeProgram =
          userPrograms.find((up: any) => up.status === "ACTIVE") ||
          userPrograms[0];

        if (!activeProgram) {
          setError(
            "No active programme found. Please select a programme first."
          );
          setLoading(false);
          return;
        }

        const programmeResponse = await fetch(
          `http://localhost:4242/auth/programmes/${activeProgram.programmeId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
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
            "This programme has no exercises configured. Please add exercises in the Programme Editor."
          );
          setLoading(false);
          return;
        }

        const currentDayExercises = programmeData.exercises.filter(
          (exercise: ProgrammeExercise) =>
            exercise.dayNumber === activeProgram.currentDay
        );

        if (currentDayExercises.length === 0) {
          setError(
            `No exercises scheduled for Day ${activeProgram.currentDay}. Please add exercises in the Programme Editor.`
          );
          setLoading(false);
          return;
        }

        const workoutExercises: WorkoutExercise[] = currentDayExercises.map(
          (exercise: ProgrammeExercise) => {
            const initialSets: WorkoutSet[] = Array.from(
              { length: exercise.sets },
              () => ({
                weight: "",
                reps: "",
                completed: false,
              })
            );

            return {
              id: exercise.id,
              name: exercise.exercise.name,
              muscleGroup: exercise.exercise.muscleGroup,
              sets: exercise.sets,
              reps: exercise.reps,
              exerciseId: exercise.exercise.id,
              workoutSets: initialSets,
            };
          }
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
      loadProgressionRecommendations();
    }
  }, [userProgram?.currentDay]);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
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
      <div
        className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16 justify-center items-center"
        style={{
          backgroundColor: "#0A0E1A",
        }}
      >
        <p className="text-white text-center">
          Loading your workout programme...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16"
        style={{
          backgroundColor: "#0A0E1A",
        }}
      >
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
    <div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16"
      style={{
        backgroundColor: "#0A0E1A",
      }}
    >
      {/* Top Bar */}
      <TopBar
        title="Workouts"
        pageIcon={<Calendar size={18} />}
        menuItems={[
          { label: "Dashboard", onClick: () => navigate("/") },
          { label: "Programmes", onClick: () => navigate("/programmes") },
          { label: "Track Metrics", onClick: () => navigate("/metrics") },
          { label: "Settings", onClick: () => navigate("/settings") },
        ]}
      />

      <div className="text-center mt-2">
        <h3 className="text-lg font-semibold text-white">
          {userProgram?.programme.name || "Loading..."}
        </h3>
        {userProgram?.programme.description && (
          <p className="text-sm text-[#5E6272] mt-1">
            {userProgram.programme.description}
          </p>
        )}
        <p className="text-xs text-[#FBA3FF] mt-1">
          {userProgram?.programme.bodyPartFocus}
        </p>
      </div>

      <div className="flex justify-center items-center gap-2 mt-1 text-sm text-[#A0AEC0]">
        <span className="uppercase text-xs tracking-wide">
          Week {userProgram?.currentWeek || 1}, Day{" "}
          {userProgram?.currentDay || 1}
        </span>
        {!timerRunning && secondsElapsed === 0 ? (
          <button
            onClick={startTimer}
            className="flex items-center gap-1 text-[#86FF99] font-medium cursor-pointer"
            aria-label="Start Workout Timer"
          >
            <Play size={14} /> Start Workout Timer
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-full select-none">
            {timerRunning ? (
              <button
                onClick={pauseTimer}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-full p-1 flex items-center justify-center"
                aria-label="Pause Workout Timer"
              >
                <Pause size={16} />
              </button>
            ) : (
              <button
                onClick={startTimer}
                className="bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-full p-1 flex items-center justify-center"
                aria-label="Resume Workout Timer"
              >
                <Play size={16} />
              </button>
            )}

            <span
              className="tracking-wide font-inter text-sm"
              style={{ color: "#5E6272" }}
            >
              {formatTime(secondsElapsed)}
            </span>
          </div>
        )}
      </div>

      {workoutStartTime && (
        <div className="flex justify-center mt-4">
          <button
            onClick={saveWorkout}
            disabled={savingWorkout}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
              savingWorkout
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-[#00FFAD] hover:bg-[#00E599] text-black"
            }`}
          >
            <Check size={16} />
            {savingWorkout ? "Saving..." : "Complete Workout"}
          </button>
        </div>
      )}

      <div className="px-4 mt-6 space-y-4" ref={menuRef}>
        <h3 className="text-sm text-white font-semibold tracking-widest uppercase text-center">
          Today's Workout - Day {userProgram?.currentDay}
        </h3>

        {todayExercises.length > 0 ? (
          todayExercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className={`rounded-xl p-4 ${
                selectedExerciseId === exercise.exerciseId
                  ? "border-2 border-blue-500"
                  : "border border-[#2F3544]"
              } bg-[#1C1F26]`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <MuscleIcon muscleGroup={exercise.muscleGroup} size={28} />
                    <div>
                      <h4 className="text-white font-semibold text-base">
                        {exercise.name}
                      </h4>
                      <div className="flex text-sm gap-2 mt-1">
                        <span className="text-green-400">
                          {exercise.sets} Working Set
                          {exercise.sets !== 1 ? "s" : ""}
                        </span>
                        <span className="text-pink-400">
                          {exercise.muscleGroup}
                        </span>
                      </div>
                    </div>
                  </div>

                  {exercise.recommendation && (
                    <div className="mt-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <Target size={12} className="text-blue-400" />
                        <span className="text-xs text-blue-400 font-semibold">
                          Recommended Target
                        </span>
                      </div>
                      <p className="text-xs text-blue-300">
                        {exercise.recommendation.recommendedWeight}kg ×{" "}
                        {exercise.recommendation.recommendedReps} reps
                        {exercise.recommendation.recommendedRPE && (
                          <span className="ml-2 text-purple-300">
                            • RPE {exercise.recommendation.recommendedRPE}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-blue-200 mt-1">
                        {exercise.recommendation.reasoning}
                      </p>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenExerciseMenu((s) =>
                        s === exercise.exerciseId ? null : exercise.exerciseId
                      )
                    }
                    className="text-white p-1"
                    aria-haspopup
                    aria-expanded={openExerciseMenu === exercise.exerciseId}
                  >
                    <MoreHorizontal />
                  </button>

                  {openExerciseMenu === exercise.exerciseId && (
                    <div className="absolute right-0 mt-2 w-56 bg-[#1A1D23] border border-[#2F3544] rounded-lg shadow-lg z-50">
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

              {exercise.workoutSets.map((set, setIdx) => (
                <div key={setIdx} className="flex items-center gap-2 mt-3">
                  <div className="relative">
                    {(() => {
                      const key = `${exercise.exerciseId}:${setIdx}`;
                      return (
                        <>
                          <button
                            onClick={() =>
                              setOpenSetMenu((s) => (s === key ? null : key))
                            }
                            className="w-4 text-[#9CA3AF] p-0"
                            aria-haspopup
                            aria-expanded={openSetMenu === key}
                          >
                            ⋮
                          </button>

                          {openSetMenu === key && (
                            <div className="absolute left-8 w-44 mt-2 bg-[#1A1D23] border border-[#2F3544] rounded-lg shadow-lg z-50">
                              <div className="px-3 py-2 text-xs text-[#9CA3AF] font-semibold">
                                SET
                              </div>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                                onClick={() =>
                                  addSetBelow(exercise.exerciseId, setIdx)
                                }
                              >
                                Add Set Below
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                                onClick={() =>
                                  skipSet(exercise.exerciseId, setIdx)
                                }
                              >
                                Skip Set
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-red-500 text-sm"
                                onClick={() =>
                                  deleteSet(exercise.exerciseId, setIdx)
                                }
                              >
                                Delete Set
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    value={set.weight}
                    onChange={(e) => {
                      setSelectedExerciseId(exercise.exerciseId);
                      updateSetData(
                        exercise.exerciseId,
                        setIdx,
                        "weight",
                        e.target.value
                      );
                    }}
                    onFocus={() => setSelectedExerciseId(exercise.exerciseId)}
                    className="bg-[#2A2E38] text-white rounded-md px-2 py-1 w-2/5 placeholder:text-[#5E6272] text-sm"
                    style={{ MozAppearance: "textfield" }}
                    inputMode="decimal"
                  />
                  <input
                    type="number"
                    placeholder="Reps"
                    value={set.reps}
                    onChange={(e) => {
                      setSelectedExerciseId(exercise.exerciseId);
                      updateSetData(
                        exercise.exerciseId,
                        setIdx,
                        "reps",
                        e.target.value
                      );
                    }}
                    onFocus={() => setSelectedExerciseId(exercise.exerciseId)}
                    className="bg-[#2A2E38] text-white rounded-md px-2 py-1 w-2/5 placeholder:text-[#5E6272] text-sm"
                    style={{ MozAppearance: "textfield" }}
                    inputMode="numeric"
                  />
                  <button
                    onClick={() =>
                      toggleSetCompletion(exercise.exerciseId, setIdx)
                    }
                    className={`rounded-full p-1 transition-colors ${
                      set.completed
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-[#262A34] hover:bg-[#3a3f4a]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        set.completed
                          ? "bg-white text-green-600"
                          : "bg-[#5E6272]"
                      }`}
                    >
                      {set.completed && <Check size={10} />}
                    </div>
                  </button>
                </div>
              ))}

              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => addSet(exercise.exerciseId)}
                  className="flex items-center gap-2 text-sm font-medium text-white bg-[#2A2E38] hover:bg-[#3a3f4a] px-4 py-1.5 rounded-full"
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
      </div>

      {/* Post-Workout Summary Modal */}
      {workoutCompleted && weeklySummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1C1F26] rounded-2xl p-8 w-full max-w-md border border-[#2F3544] max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-2xl font-bold text-center mb-6">
              Congratulations on completing this workout!
            </h2>

            <div className="space-y-4 mb-6">
              {weeklySummary.strengthGainVsLastWeek !== null && (
                <div className="p-4 rounded-lg bg-[#2A2E38] border border-[#00FFAD]/30">
                  <p className="text-[#5E6272] text-sm mb-1">Week-over-week</p>
                  <p className="text-white font-semibold">
                    You are{" "}
                    <span
                      className={
                        weeklySummary.strengthGainVsLastWeek > 0
                          ? "text-[#86FF99]"
                          : "text-red-400"
                      }
                    >
                      {Math.abs(weeklySummary.strengthGainVsLastWeek)}%{" "}
                      {weeklySummary.strengthGainVsLastWeek > 0
                        ? "stronger"
                        : "weaker"}
                    </span>{" "}
                    this week compared to last week
                  </p>
                </div>
              )}

              {weeklySummary.strengthGainVsProgramStart !== null && (
                <div className="p-4 rounded-lg bg-[#2A2E38] border border-[#246BFD]/30">
                  <p className="text-[#5E6272] text-sm mb-1">
                    Since programme start
                  </p>
                  <p className="text-white font-semibold">
                    You are{" "}
                    <span className="text-[#246BFD]">
                      {weeklySummary.strengthGainVsProgramStart}%
                    </span>{" "}
                    stronger than when you started this programme
                  </p>
                </div>
              )}

              {weeklySummary.newRepMaxes &&
                weeklySummary.newRepMaxes.length > 0 && (
                  <div className="p-4 rounded-lg bg-[#2A2E38] border border-[#FBA3FF]/30">
                    <p className="text-[#FBA3FF] font-semibold mb-2">
                      🎉 New Rep Maxes!
                    </p>
                    {weeklySummary.newRepMaxes.map((pr: any, idx: number) => (
                      <p key={idx} className="text-white text-sm">
                        • {pr.exerciseName}: {pr.reps} reps
                      </p>
                    ))}
                  </div>
                )}

              {weeklySummary.recommendations &&
                weeklySummary.recommendations.length > 0 && (
                  <div className="p-4 rounded-lg bg-[#2A2E38] border border-[#246BFD]/30">
                    <p className="text-[#246BFD] font-semibold mb-2">
                      Next Session Recommendations
                    </p>
                    {weeklySummary.recommendations.map(
                      (rec: any, idx: number) => (
                        <div
                          key={idx}
                          className="text-white text-sm mb-2 last:mb-0"
                        >
                          <p className="font-medium">
                            {getExerciseName(rec.exerciseId)}
                          </p>
                          <p className="text-[#5E6272] text-xs">
                            {rec.recommendedWeight}kg × {rec.recommendedReps}{" "}
                            reps (RPE {rec.recommendedRPE})
                          </p>
                          <p className="text-[#5E6272] text-xs">
                            {rec.reasoning}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>

            <button
              onClick={() => {
                setWeeklySummary(null);
                setWorkoutCompleted(false);
                advanceToNextDay();
              }}
              className="w-full bg-[#86FF99] hover:bg-[#6bd664] text-black font-semibold py-3 rounded-lg transition-colors"
            >
              Continue to Next Workout
            </button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');

        .font-inter {
          font-family: 'Inter', sans-serif;
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
    </div>
  );
}
