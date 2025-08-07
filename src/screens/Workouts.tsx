import React, { useEffect, useState, useRef } from "react";
import {
  MoreHorizontal,
  Dumbbell,
  Play,
  Calendar,
  PauseCircleIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import BottomBar from "../components/BottomBar";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

type WorkoutExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  exerciseId: string;
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

  // Start or resume timer
  const startTimer = () => {
    if (!timerRunning) {
      setTimerRunning(true);
    }
  };

  // Pause timer
  const pauseTimer = () => {
    setTimerRunning(false);
  };

  // Format seconds as mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Toggle day expansion
  const toggleDay = (dayNumber: number) => {
    setWorkoutDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, isExpanded: !day.isExpanded }
          : day
      )
    );
  };

  // Fetch user's active programme
  useEffect(() => {
    const fetchUserProgram = async () => {
      try {
        setLoading(true);
        setError("");

        // First, get user's active programme
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

        // Get the most recent active program
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

        // Fetch the full programme details
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

        // Group exercises by day
        const groupedExercises: Record<number, WorkoutExercise[]> = {};

        programmeData.exercises.forEach((exercise: ProgrammeExercise) => {
          const day = exercise.dayNumber;
          if (!groupedExercises[day]) {
            groupedExercises[day] = [];
          }

          groupedExercises[day].push({
            id: exercise.id,
            name: exercise.exercise.name,
            muscleGroup: exercise.exercise.muscleGroup,
            sets: exercise.sets,
            reps: exercise.reps,
            exerciseId: exercise.exercise.id,
          });
        });

        // Create workout days
        const days: WorkoutDay[] = [];
        for (let i = 1; i <= programmeData.daysPerWeek; i++) {
          days.push({
            dayNumber: i,
            exercises: groupedExercises[i] || [],
            isExpanded: i === activeProgram.currentDay, // Expand current day by default
          });
        }

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

  // Timer effect
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
        {/* Logo */}
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
      {/* Logo */}
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
        <img
          src={logo}
          alt="Logo"
          className="w-[84.56px] h-[15px] object-contain md:w-[100px] md:h-[18px]"
        />
      </div>

      {/* Top Bar */}
      <div className="flex justify-between items-center mt-4 px-2 h-10 relative">
        <Calendar className="text-white w-6 h-6" />
        <h2 className="absolute left-1/2 transform -translate-x-1/2 text-white font-semibold text-xl">
          Workouts
        </h2>
        <MoreHorizontal className="text-white w-6 h-6" />
      </div>

      {/* Programme Info */}
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

      {/* Week Info & Timer */}
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
            {/* Play or Pause button always on the left, smaller size */}
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

            {/* Timer text with color #5E6272, smaller font */}
            <span
              className="tracking-wide font-inter text-sm"
              style={{ color: "#5E6272" }}
            >
              {formatTime(secondsElapsed)}
            </span>
          </div>
        )}
      </div>

      {/* Workout Days */}
      <div className="px-4 mt-6 space-y-4">
        {workoutDays.map((day) => (
          <div key={day.dayNumber} className="space-y-2">
            {/* Day Header */}
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

            {/* Day Exercises */}
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
                      </div>
                      <MoreHorizontal className="text-white" />
                    </div>

                    {/* Input Sets */}
                    {Array.from({ length: exercise.sets }, (_, setIdx) => (
                      <div
                        key={setIdx}
                        className="flex items-center gap-2 mt-3"
                      >
                        <div className="w-4 text-[#5E6272]">⋮</div>
                        <input
                          type="number"
                          placeholder="Weight"
                          className="bg-[#2A2E38] text-white rounded-md px-2 py-1 w-1/2 placeholder:text-[#5E6272] text-sm"
                          style={{ MozAppearance: "textfield" }}
                          inputMode="numeric"
                        />
                        <input
                          type="number"
                          placeholder={
                            typeof exercise.reps === "string"
                              ? exercise.reps
                              : `${exercise.reps}`
                          }
                          className="bg-[#2A2E38] text-white rounded-md px-2 py-1 w-1/2 placeholder:text-[#5E6272] text-sm"
                          style={{ MozAppearance: "textfield" }}
                          inputMode="numeric"
                        />
                        <div className="bg-[#262A34] rounded-full p-1">
                          <div className="w-4 h-4 bg-[#5E6272] rounded-full" />
                        </div>
                      </div>
                    ))}

                    {/* Add Set Button */}
                    <div className="mt-4 flex justify-center">
                      <button className="flex items-center gap-2 text-sm font-medium text-white bg-[#2A2E38] hover:bg-[#3a3f4a] px-4 py-1.5 rounded-full">
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

      {/* Bottom Bar */}
      <BottomBar onLogout={handleLogout} />

      {/* Remove number input spinners with global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');

        /* Apply Inter font */
        .font-inter {
          font-family: 'Inter', sans-serif;
        }

        /* Chrome, Safari, Edge, Opera */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        /* Firefox */
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
