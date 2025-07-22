import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Circle,
} from "lucide-react";
import logo from "../assets/logo.png";
import icon from "../assets/icon_placeholder.png";
import BottomBar from "../components/BottomBar";

type Exercise = {
  isSelected: any;
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
  isSelected: boolean;
};

type ProgrammeDay = {
  dayNumber: number;
  exercises: ProgrammeExercise[];
  availableExercises: Exercise[];
  showAvailable: boolean;
};

export default function ProgrammeEditor() {
  const { programmeId } = useParams();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("Loading...");
  const [bodyFocus, setBodyFocus] = useState("Full Body");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<ProgrammeDay[]>([]);
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);

  const toggleDay = (dayNumber: number) => {
    setOpenDays((prev) => ({
      ...prev,
      [dayNumber]: !prev[dayNumber],
    }));
  };

  const toggleAvailableExercises = (dayNumber: number) => {
    setDays((prevDays) =>
      prevDays.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, showAvailable: !day.showAvailable }
          : day
      )
    );
  };

  // Fetch all exercises based on body focus
  const fetchAvailableExercises = async (focus: string) => {
    try {
      const res = await fetch(
        `http://localhost:4242/auth/exercises?muscleGroup=${encodeURIComponent(
          focus
        )}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!res.ok) {
        console.error("Failed to fetch exercises:", res.status);
        return [];
      }

      const exercises = await res.json();
      return exercises || [];
    } catch (err) {
      console.error("Error fetching exercises:", err);
      return [];
    }
  };

  const handleAddExercise = async (exerciseId: string, dayNumber: number) => {
    try {
      const exercise = allExercises.find((ex) => ex.id === exerciseId);
      if (!exercise) return;

      const postRes = await fetch(
        `http://localhost:4242/auth/programmes/${programmeId}/exercises`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            exerciseId: exercise.id,
            dayNumber,
            sets: 3,
            reps: "8-12",
          }),
        }
      );

      if (!postRes.ok) {
        const errorText = await postRes.text();
        console.error("Failed to add exercise:", postRes.status, errorText);
        throw new Error("Failed to add exercise");
      }

      const newProgrammeExercise = await postRes.json();

      setDays((prevDays) =>
        prevDays.map((day) =>
          day.dayNumber === dayNumber
            ? {
                ...day,
                exercises: [
                  ...day.exercises,
                  {
                    id: newProgrammeExercise.id,
                    name: exercise.name,
                    sets: newProgrammeExercise.sets,
                    reps: newProgrammeExercise.reps,
                    exerciseId: exercise.id,
                    isSelected: true,
                  },
                ],
                availableExercises: day.availableExercises.map((ex) =>
                  ex.id === exerciseId ? { ...ex, isSelected: true } : ex
                ),
              }
            : day
        )
      );
    } catch (err) {
      console.error("Error adding exercise:", err);
    }
  };

  const handleRemoveExercise = async (
    programmeExerciseId: string,
    exerciseId: string,
    dayNumber: number
  ) => {
    try {
      await fetch(
        `http://localhost:4242/auth/programmes/exercises/${programmeExerciseId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setDays((prev) =>
        prev.map((day) =>
          day.dayNumber === dayNumber
            ? {
                ...day,
                exercises: day.exercises.filter(
                  (ex) => ex.id !== programmeExerciseId
                ),
                availableExercises: day.availableExercises.map((ex) =>
                  ex.id === exerciseId ? { ...ex, isSelected: false } : ex
                ),
              }
            : day
        )
      );
    } catch (err) {
      console.error("Failed to remove exercise", err);
    }
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
        return ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core"];
      case "upper body":
        return ["Chest", "Back", "Shoulders", "Arms"];
      case "lower body":
        return ["Legs", "Glutes", "Core"];
      case "push":
        return ["Chest", "Shoulders", "Triceps"];
      case "pull":
        return ["Back", "Biceps"];
      case "legs":
        return ["Legs", "Glutes"];
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
          `http://localhost:4242/auth/programmes/${programmeId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch programme");

        setDisplayName(data.name);
        setDescription(data.description || "");
        setBodyFocus(data.bodyPartFocus || "Full Body");

        // Fetch available exercises based on body focus
        const muscleGroups = getMuscleGroupsForFocus(
          data.bodyPartFocus || "Full Body"
        );
        const exercisePromises = muscleGroups.map((group) =>
          fetchAvailableExercises(group)
        );
        const exerciseArrays = await Promise.all(exercisePromises);
        const availableExercises = exerciseArrays.flat();
        setAllExercises(availableExercises);

        // Group current programme exercises by day
        const grouped: Record<number, ProgrammeExercise[]> = {};
        const selectedExerciseIds = new Set<string>();

        data.exercises?.forEach((item: any) => {
          const day = item.dayNumber ?? 1;
          if (!grouped[day]) grouped[day] = [];

          const programmeExercise = {
            id: item.id,
            name: item.exercise?.name || "Unnamed",
            sets: item.sets ?? 3,
            reps: item.reps ?? "8-12",
            exerciseId: item.exercise?.id || item.exerciseId,
            isSelected: true,
          };

          grouped[day].push(programmeExercise);
          selectedExerciseIds.add(programmeExercise.exerciseId);
        });

        // Create days array with available exercises
        const daysPerWeek = data.daysPerWeek || 3;
        const loadedDays: ProgrammeDay[] = [];

        for (let i = 1; i <= daysPerWeek; i++) {
          loadedDays.push({
            dayNumber: i,
            exercises: grouped[i] || [],
            availableExercises: availableExercises.map((ex) => ({
              ...ex,
              isSelected: selectedExerciseIds.has(ex.id),
            })),
            showAvailable: false,
          });
        }

        setDays(loadedDays);
        setOpenDays(
          Object.fromEntries(loadedDays.map((d) => [d.dayNumber, true]))
        );
      } catch (err: any) {
        console.error("Error loading programme:", err);
        setError(err.message || "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProgramme();
  }, [programmeId]);

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
      <div className="flex justify-between items-center mt-4 px-2">
        <h2 className="text-white text-xl font-semibold">Programmes</h2>
        <img
          src={icon}
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>

      {/* Programme Name */}
      <div className="mt-6 mb-4 text-center">
        <h3 className="text-white text-xl font-semibold">{displayName}</h3>
        <p className="text-sm text-[#5E6272]">{description}</p>
        <p className="text-xs text-[#FBA3FF] mt-1">{bodyFocus}</p>
      </div>

      {/* Loading or Error */}
      {loading ? (
        <p className="text-white text-center">Loading...</p>
      ) : error ? (
        <p className="text-red-400 text-center">{error}</p>
      ) : (
        <div className="space-y-8">
          {days.map((day) => {
            const isOpen = openDays[day.dayNumber];
            return (
              <div key={day.dayNumber} className="space-y-2">
                {/* Day Header */}
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
                </div>

                {/* Exercise List */}
                {isOpen && (
                  <div className="space-y-2">
                    {/* Selected Exercises */}
                    {day.exercises.length > 0 ? (
                      day.exercises.map((ex) => (
                        <div
                          key={ex.id}
                          className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 flex items-center justify-between"
                        >
                          <CheckCircle className="text-green-500 w-5 h-5 mr-3" />
                          <div className="flex-1 text-center">
                            <p className="font-semibold text-white">
                              {ex.name}
                            </p>
                            <div className="flex justify-center gap-3 text-sm mt-1">
                              <span className="text-[#00FFAD]">
                                {ex.sets} sets
                              </span>
                              <span className="text-[#5E6272]">
                                {ex.reps} reps
                              </span>
                            </div>
                          </div>
                          <XCircle
                            className="text-red-500 w-5 h-5 ml-3 cursor-pointer hover:text-red-400"
                            onClick={() =>
                              handleRemoveExercise(
                                ex.id,
                                ex.exerciseId,
                                day.dayNumber
                              )
                            }
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-[#5E6272] text-sm">
                        No exercises selected yet.
                      </p>
                    )}

                    {/* Add Exercise Button */}
                    <button
                      onClick={() => toggleAvailableExercises(day.dayNumber)}
                      className="text-sm text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      <Plus size={16} />
                      {day.showAvailable
                        ? "Hide Available Exercises"
                        : "Add Exercise"}
                    </button>

                    {/* Available Exercises */}
                    {day.showAvailable && (
                      <div className="mt-3 space-y-2 border-t border-[#2F3544] pt-3">
                        <h4 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
                          Available Exercises
                        </h4>
                        {day.availableExercises.length > 0 ? (
                          day.availableExercises
                            .filter((ex) => !ex.isSelected)
                            .map((ex) => (
                              <div
                                key={ex.id}
                                className="bg-[#1A1D23] border border-[#2A2D36] rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-[#3F4554]"
                                onClick={() =>
                                  handleAddExercise(ex.id, day.dayNumber)
                                }
                              >
                                <Circle className="text-[#5E6272] w-5 h-5 mr-3" />
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
                                  </div>
                                </div>
                                <Plus className="text-blue-400 w-5 h-5 ml-3" />
                              </div>
                            ))
                        ) : (
                          <p className="text-[#5E6272] text-sm">
                            No available exercises found.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
