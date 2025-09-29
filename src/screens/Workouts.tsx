import React, { useEffect, useState, useRef } from "react";
import {
  MoreHorizontal,
  Dumbbell,
  Play,
  Calendar,
  PauseCircleIcon,
  ChevronDown,
  ChevronRight,
  Check,
  TrendingUp,
  History,
  Target,
} from "lucide-react";
import BottomBar from "../components/BottomBar";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

type WorkoutSet = {
  weight: string;
  reps: string;
  rpe?: string;
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
    progressionType: string;
    reasoning: string;
  };
};

type WorkoutDay = {
  dayNumber: number;
  exercises: WorkoutExercise[];
  isExpanded: boolean;
};

type UserProgram = {
  id: string;
  programme: {
    id: string;
    name: string;
    description?: string;
    bodyPartFocus: string;
    daysPerWeek: number;
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
  const navigate = useNavigate();

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Programme state
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
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

  const toggleDay = (dayNumber: number) => {
    setWorkoutDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, isExpanded: !day.isExpanded }
          : day
      )
    );
  };

  const updateSetData = (
    dayNumber: number,
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps" | "rpe",
    value: string
  ) => {
    setWorkoutDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.exerciseId === exerciseId
                  ? {
                      ...exercise,
                      workoutSets: exercise.workoutSets.map((set, idx) =>
                        idx === setIndex ? { ...set, [field]: value } : set
                      ),
                    }
                  : exercise
              ),
            }
          : day
      )
    );
  };

  const toggleSetCompletion = (
    dayNumber: number,
    exerciseId: string,
    setIndex: number
  ) => {
    setWorkoutDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.exerciseId === exerciseId
                  ? {
                      ...exercise,
                      workoutSets: exercise.workoutSets.map((set, idx) =>
                        idx === setIndex
                          ? { ...set, completed: !set.completed }
                          : set
                      ),
                    }
                  : exercise
              ),
            }
          : day
      )
    );
  };

  const addSet = (dayNumber: number, exerciseId: string) => {
    setWorkoutDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.exerciseId === exerciseId
                  ? {
                      ...exercise,
                      workoutSets: [
                        ...exercise.workoutSets,
                        {
                          weight: "",
                          reps: "",
                          rpe: "",
                          completed: false,
                        },
                      ],
                    }
                  : exercise
              ),
            }
          : day
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
      const currentDay = workoutDays.find(
        (day) => day.dayNumber === userProgram.currentDay
      );

      if (!currentDay) {
        throw new Error("Current day not found");
      }

      const exercisesWithData = currentDay.exercises.filter((exercise) =>
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
            rpe: set.rpe ? parseInt(set.rpe) : undefined,
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

      alert(
        `Workout saved successfully!\n\nRecommendations for next session:\n${result.recommendations
          .map(
            (rec: any) =>
              `• ${getExerciseName(rec.exerciseId)}: ${
                rec.recommendedWeight
              }kg x ${rec.recommendedReps} reps\n  ${rec.reasoning}`
          )
          .join("\n\n")}`
      );

      await advanceToNextDay();
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

      loadProgressionRecommendations();
    } catch (err: any) {
      console.error("Error advancing to next day:", err);
      setError(err.message || "Failed to advance to next day");
    }
  };

  const getExerciseName = (exerciseId: string): string => {
    for (const day of workoutDays) {
      const exercise = day.exercises.find((ex) => ex.exerciseId === exerciseId);
      if (exercise) return exercise.name;
    }
    return "Unknown Exercise";
  };

  const loadProgressionRecommendations = async () => {
    if (!userProgram) return;

    setLoadingRecommendations(true);
    try {
      const currentDay = workoutDays.find(
        (day) => day.dayNumber === userProgram.currentDay
      );

      if (!currentDay) return;

      const exerciseIds = currentDay.exercises.map((ex) => ex.exerciseId);

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

      setWorkoutDays((prev) =>
        prev.map((day) =>
          day.dayNumber === userProgram.currentDay
            ? {
                ...day,
                exercises: day.exercises.map((exercise) => {
                  const recommendation = result.recommendations.find(
                    (rec: any) => rec.exerciseId === exercise.exerciseId
                  );
                  return {
                    ...exercise,
                    recommendation,
                  };
                }),
              }
            : day
        )
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
        console.log("📊 User programs response:", userPrograms);

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

        console.log("✅ Active program found:", activeProgram);

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
        console.log("📊 Programme data:", programmeData);

        const fullUserProgram = {
          ...activeProgram,
          programme: programmeData,
        };

        setUserProgram(fullUserProgram);

        // FIXED: Check if exercises exist and log them
        if (!programmeData.exercises || programmeData.exercises.length === 0) {
          console.error("❌ No exercises found in programme!");
          setError(
            "This programme has no exercises configured. Please add exercises in the Programme Editor."
          );
          setLoading(false);
          return;
        }

        console.log(
          `✅ Found ${programmeData.exercises.length} exercises in programme`
        );

        // Group exercises by day
        const groupedExercises: Record<number, WorkoutExercise[]> = {};

        programmeData.exercises.forEach((exercise: ProgrammeExercise) => {
          const day = exercise.dayNumber;
          console.log(
            `📝 Processing exercise for day ${day}:`,
            exercise.exercise.name
          );

          if (!groupedExercises[day]) {
            groupedExercises[day] = [];
          }

          const initialSets: WorkoutSet[] = Array.from(
            { length: exercise.sets },
            () => ({
              weight: "",
              reps: "",
              rpe: "",
              completed: false,
            })
          );

          groupedExercises[day].push({
            id: exercise.id,
            name: exercise.exercise.name,
            muscleGroup: exercise.exercise.muscleGroup,
            sets: exercise.sets,
            reps: exercise.reps,
            exerciseId: exercise.exercise.id,
            workoutSets: initialSets,
          });
        });

        console.log("📊 Grouped exercises by day:", groupedExercises);

        // Create workout days
        const days: WorkoutDay[] = [];
        for (let i = 1; i <= programmeData.daysPerWeek; i++) {
          const dayExercises = groupedExercises[i] || [];
          console.log(`Day ${i}: ${dayExercises.length} exercises`);

          days.push({
            dayNumber: i,
            exercises: dayExercises,
            isExpanded: i === activeProgram.currentDay,
          });
        }

        console.log("✅ Final workout days structure:", days);
        setWorkoutDays(days);
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
    if (userProgram && workoutDays.length > 0) {
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
          background:
            "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
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
          background:
            "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
        }}
      >
        <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
          <img
            src={logo}
            alt="Logo"
            className="w-[84.56px] h-[15px] object-contain md:w-[100px] md:h-[18px]"
          />
        </div>

        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg px-6 py-4 mb-4 max-w-md">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
          <button
            onClick={() => navigate("/programmes")}
            className="px-6 py-3 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium"
          >
            Go to Programmes
          </button>
        </div>

        <BottomBar onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16"
      style={{
        background:
          "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
      }}
    >
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
        <img
          src={logo}
          alt="Logo"
          className="w-[84.56px] h-[15px] object-contain md:w-[100px] md:h-[18px]"
        />
      </div>

      <div className="flex justify-between items-center mt-4 px-2 h-10 relative">
        <Calendar className="text-white w-6 h-6" />
        <h2 className="absolute left-1/2 transform -translate-x-1/2 text-white font-semibold text-xl">
          Workouts
        </h2>
        <MoreHorizontal className="text-white w-6 h-6" />
      </div>

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
                <PauseCircleIcon size={16} />
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

      <div className="px-4 mt-6 space-y-4">
        {workoutDays.map((day) => (
          <div key={day.dayNumber} className="space-y-2">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => toggleDay(day.dayNumber)}
            >
              {day.isExpanded ? (
                <ChevronDown className="text-green-500 w-4 h-4" />
              ) : (
                <ChevronRight className="text-green-500 w-4 h-4" />
              )}
              <h3 className="text-sm text-white font-semibold tracking-widest uppercase">
                Day {day.dayNumber}
                {day.dayNumber === userProgram?.currentDay && (
                  <span className="ml-2 text-xs text-[#00FFAD] normal-case">
                    (Current)
                  </span>
                )}
              </h3>
              <span className="text-xs text-[#5E6272]">
                {day.exercises.length} exercise
                {day.exercises.length !== 1 ? "s" : ""}
              </span>
            </div>

            {day.isExpanded && (
              <div className="space-y-3">
                {day.exercises.map((exercise, index) => (
                  <div
                    key={exercise.id}
                    className={`rounded-xl p-4 ${
                      day.dayNumber === userProgram?.currentDay && index === 0
                        ? "border-2 border-blue-500"
                        : "border border-[#2F3544]"
                    } bg-[#1C1F26]`}
                  >
                    <div className="flex justify-between items-start mb-3">
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
                            </p>
                            <p className="text-xs text-blue-200 mt-1">
                              {exercise.recommendation.reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                      <MoreHorizontal className="text-white" />
                    </div>

                    {exercise.workoutSets.map((set, setIdx) => (
                      <div
                        key={setIdx}
                        className="flex items-center gap-2 mt-3"
                      >
                        <div className="w-4 text-[#5E6272]">⋮</div>
                        <input
                          type="number"
                          placeholder="Weight (kg)"
                          value={set.weight}
                          onChange={(e) =>
                            updateSetData(
                              day.dayNumber,
                              exercise.exerciseId,
                              setIdx,
                              "weight",
                              e.target.value
                            )
                          }
                          className="bg-[#2A2E38] text-white rounded-md px-2 py-1 w-1/3 placeholder:text-[#5E6272] text-sm"
                          style={{ MozAppearance: "textfield" }}
                          inputMode="decimal"
                        />
                        <input
                          type="number"
                          placeholder="Reps"
                          value={set.reps}
                          onChange={(e) =>
                            updateSetData(
                              day.dayNumber,
                              exercise.exerciseId,
                              setIdx,
                              "reps",
                              e.target.value
                            )
                          }
                          className="bg-[#2A2E38] text-white rounded-md px-2 py-1 w-1/4 placeholder:text-[#5E6272] text-sm"
                          style={{ MozAppearance: "textfield" }}
                          inputMode="numeric"
                        />
                        <input
                          type="number"
                          placeholder="RPE"
                          value={set.rpe}
                          onChange={(e) =>
                            updateSetData(
                              day.dayNumber,
                              exercise.exerciseId,
                              setIdx,
                              "rpe",
                              e.target.value
                            )
                          }
                          className="bg-[#2A2E38] text-white rounded-md px-2 py-1 w-1/4 placeholder:text-[#5E6272] text-sm"
                          style={{ MozAppearance: "textfield" }}
                          inputMode="numeric"
                          min="1"
                          max="10"
                        />
                        <button
                          onClick={() =>
                            toggleSetCompletion(
                              day.dayNumber,
                              exercise.exerciseId,
                              setIdx
                            )
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
                        onClick={() =>
                          addSet(day.dayNumber, exercise.exerciseId)
                        }
                        className="flex items-center gap-2 text-sm font-medium text-white bg-[#2A2E38] hover:bg-[#3a3f4a] px-4 py-1.5 rounded-full"
                      >
                        Add Set{" "}
                        <span className="text-green-400 text-lg leading-none">
                          +
                        </span>
                      </button>
                    </div>
                  </div>
                ))}

                {day.exercises.length === 0 && (
                  <div className="text-center py-8 text-[#5E6272]">
                    <p>No exercises scheduled for this day</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {workoutDays.length === 0 && (
          <div className="text-center py-8 text-[#5E6272]">
            <p>No workout days found</p>
            <button
              onClick={() => navigate("/programmes")}
              className="mt-4 px-6 py-3 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium"
            >
              Select a Programme
            </button>
          </div>
        )}
      </div>

      <BottomBar onLogout={handleLogout} />

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
    </div>
  );
}
