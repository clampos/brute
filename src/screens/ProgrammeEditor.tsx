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
  Check,
  X,
  Save,
} from "lucide-react";
import logo from "../assets/logo.png";
import icon from "../assets/icon_placeholder.png";
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
  isSelected: boolean;
};

type ProgrammeDay = {
  dayNumber: number;
  exercises: ProgrammeExercise[];
  availableExercises: Exercise[];
  showAvailable: boolean;
  hasChanges: boolean;
  exerciseOptions: Exercise[]; // Initial 3 exercise options
  showMoreOptions: boolean; // Whether to show additional options
};

// Add proper type for the API response
type ProgrammeExerciseResponse = {
  id: string;
  dayNumber: number;
  sets: number;
  reps: string;
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
  daysPerWeek?: number;
  exercises?: ProgrammeExerciseResponse[];
  error?: string;
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
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [submittingProgramme, setSubmittingProgramme] = useState(false);

  const toggleDay = (dayNumber: number) => {
    setOpenDays((prev) => ({
      ...prev,
      [dayNumber]: !prev[dayNumber],
    }));
  };

  // Get 3 random exercises for initial display
  const getRandomExercises = (
    exercises: Exercise[],
    count: number = 3
  ): Exercise[] => {
    const shuffled = [...exercises].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Load initial exercise options for a day
  const loadInitialExerciseOptions = async (dayNumber: number) => {
    try {
      const muscleGroups = getMuscleGroupsForFocus(bodyFocus);
      const exercisePromises = muscleGroups.map((group) =>
        fetchAvailableExercises(group)
      );
      const exerciseArrays = await Promise.all(exercisePromises);
      const fetchedExercises = exerciseArrays.flat();

      // Remove duplicates based on exercise ID
      const uniqueExercises = fetchedExercises.filter(
        (exercise, index, self) =>
          index === self.findIndex((e) => e.id === exercise.id)
      );

      const initialOptions = getRandomExercises(uniqueExercises, 3);

      setDays((prevDays) =>
        prevDays.map((day) =>
          day.dayNumber === dayNumber
            ? {
                ...day,
                exerciseOptions: initialOptions.map((ex) => ({
                  ...ex,
                  isSelected: day.exercises.some(
                    (existing) => existing.exerciseId === ex.id
                  ),
                })),
                availableExercises: uniqueExercises.map((ex) => ({
                  ...ex,
                  isSelected: day.exercises.some(
                    (existing) => existing.exerciseId === ex.id
                  ),
                })),
              }
            : day
        )
      );

      setAllExercises(uniqueExercises);
    } catch (err) {
      console.error("Error loading initial exercise options:", err);
      setError("Failed to load exercise options");
    }
  };

  const toggleAvailableExercises = async (dayNumber: number) => {
    const currentDay = days.find((d) => d.dayNumber === dayNumber);
    const isCurrentlyShowing = currentDay?.showMoreOptions || false;

    setDays((prevDays) =>
      prevDays.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, showMoreOptions: !day.showMoreOptions }
          : day
      )
    );

    // If toggling ON and we don't have fresh exercises, fetch them
    if (!isCurrentlyShowing) {
      await fetchAndUpdateAvailableExercises(dayNumber);
    }
  };

  const fetchAndUpdateAvailableExercises = async (dayNumber: number) => {
    try {
      const muscleGroups = getMuscleGroupsForFocus(bodyFocus);
      const exercisePromises = muscleGroups.map((group) =>
        fetchAvailableExercises(group)
      );
      const exerciseArrays = await Promise.all(exercisePromises);
      const fetchedExercises = exerciseArrays.flat();

      // Remove duplicates based on exercise ID
      const uniqueExercises = fetchedExercises.filter(
        (exercise, index, self) =>
          index === self.findIndex((e) => e.id === exercise.id)
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
                    (existing) => existing.exerciseId === ex.id
                  ),
                })),
              }
            : day
        )
      );
    } catch (err) {
      console.error("Error fetching available exercises:", err);
      setError("Failed to load available exercises");
    }
  };

  // Fetch all exercises based on body focus
  const fetchAvailableExercises = async (
    focus: string
  ): Promise<Exercise[]> => {
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

  const handleAddExercise = (exerciseId: string, dayNumber: number) => {
    const exercise = allExercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;

    // Create temporary programme exercise object
    const tempProgrammeExercise = {
      id: `temp-${Date.now()}-${exerciseId}`, // Temporary ID
      name: exercise.name,
      sets: 3,
      reps: "8-12",
      exerciseId: exercise.id,
      isSelected: true,
    };

    setDays((prevDays) =>
      prevDays.map((day) =>
        day.dayNumber === dayNumber
          ? {
              ...day,
              exercises: [...day.exercises, tempProgrammeExercise],
              exerciseOptions: day.exerciseOptions.map((ex) =>
                ex.id === exerciseId ? { ...ex, isSelected: true } : ex
              ),
              availableExercises: day.availableExercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, isSelected: true } : ex
              ),
              hasChanges: true,
            }
          : day
      )
    );
  };

  const handleRemoveExercise = (
    programmeExerciseId: string,
    exerciseId: string,
    dayNumber: number
  ) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? {
              ...day,
              exercises: day.exercises.filter(
                (ex) => ex.id !== programmeExerciseId
              ),
              exerciseOptions: day.exerciseOptions.map((ex) =>
                ex.id === exerciseId ? { ...ex, isSelected: false } : ex
              ),
              availableExercises: day.availableExercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, isSelected: false } : ex
              ),
              hasChanges: true,
            }
          : day
      )
    );
  };

  const handleConfirmDay = async (dayNumber: number) => {
    setSavingDay(dayNumber);

    try {
      const day = days.find((d) => d.dayNumber === dayNumber);
      if (!day) return;

      // First, delete all existing exercises for this day
      const existingExercises = day.exercises.filter(
        (ex) => !ex.id.startsWith("temp-")
      );

      for (const exercise of existingExercises) {
        await fetch(
          `http://localhost:4242/auth/programmes/exercises/${exercise.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
      }

      // Then add all current exercises (including new ones)
      const exercisesToAdd = day.exercises.filter((ex) => ex.isSelected);
      const addedExercises: ProgrammeExercise[] = [];

      for (const exercise of exercisesToAdd) {
        const postRes = await fetch(
          `http://localhost:4242/auth/programmes/${programmeId}/exercises`,
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
            }),
          }
        );

        if (!postRes.ok) {
          throw new Error("Failed to add exercise");
        }

        const newProgrammeExercise = await postRes.json();
        addedExercises.push({
          id: newProgrammeExercise.id,
          name: exercise.name,
          sets: newProgrammeExercise.sets,
          reps: newProgrammeExercise.reps,
          exerciseId: exercise.exerciseId,
          isSelected: true,
        });
      }

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
            : day
        )
      );

      // Show success message briefly
      setTimeout(() => {
        setError("");
      }, 2000);
    } catch (err) {
      console.error("Error confirming day:", err);
      setError("Failed to save exercises for this day");
    } finally {
      setSavingDay(null);
    }
  };

  const handleSubmitProgramme = async () => {
    // Check if there are any unsaved changes
    const hasUnsavedChanges = days.some((day) => day.hasChanges);
    if (hasUnsavedChanges) {
      setError("Please confirm all days before submitting the programme");
      return;
    }

    setSubmittingProgramme(true);
    try {
      // Create a UserProgram entry to enable workout generation
      const response = await fetch(`http://localhost:4242/auth/user-programs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          programmeId: programmeId,
          startDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit programme");
      }

      const userProgram = await response.json();

      // Navigate to workout or programmes list with success message
      navigate("/programmes", {
        state: {
          message:
            "Programme successfully submitted! You can now start workouts.",
        },
      });
    } catch (err: any) {
      console.error("Error submitting programme:", err);
      setError(err.message || "Failed to submit programme");
    } finally {
      setSubmittingProgramme(false);
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

        const data: ProgrammeResponse = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch programme");

        setDisplayName(data.name);
        setDescription(data.description || "");
        setBodyFocus(data.bodyPartFocus || "Full Body");

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
            hasChanges: false,
          });
        }

        setDays(loadedDays);
        setOpenDays(
          Object.fromEntries(loadedDays.map((d) => [d.dayNumber, true]))
        );

        // Load initial exercise options for each day
        for (const day of loadedDays) {
          await loadInitialExerciseOptions(day.dayNumber);
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

  // Check if programme is ready to submit (no unsaved changes)
  const isReadyToSubmit =
    days.length > 0 && !days.some((day) => day.hasChanges);

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

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg px-4 py-2 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Submit Programme Button */}
      {!loading && (
        <div className="mb-6 flex justify-center">
          <button
            onClick={handleSubmitProgramme}
            disabled={submittingProgramme || !isReadyToSubmit}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
              submittingProgramme || !isReadyToSubmit
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-[#00FFAD] hover:bg-[#00E599] text-black"
            }`}
          >
            <Save size={16} />
            {submittingProgramme
              ? "Submitting..."
              : isReadyToSubmit
              ? "Submit Programme"
              : "Confirm All Days First"}
          </button>
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
                      <div className="w-2 h-2 bg-orange-500 rounded-full ml-2"></div>
                    )}
                  </div>

                  {/* Confirm Day Button */}
                  {isOpen && day.hasChanges && (
                    <button
                      onClick={() => handleConfirmDay(day.dayNumber)}
                      disabled={isSaving}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        isSaving
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      {isSaving ? "Saving..." : "Confirm Day"}
                    </button>
                  )}
                </div>

                {/* Exercise Content */}
                {isOpen && (
                  <div className="space-y-4">
                    {/* Selected Exercises */}
                    {day.exercises.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
                          Selected Exercises
                        </h4>
                        {day.exercises.map((ex) => (
                          <div
                            key={ex.id}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between transition-all ${
                              ex.id.startsWith("temp-")
                                ? "bg-[#1A1D23] border-orange-500/50"
                                : "bg-[#1C1F26] border-[#2F3544]"
                            }`}
                          >
                            <CheckCircle className="text-green-500 w-5 h-5 mr-3" />
                            <div className="flex-1 text-center">
                              <p className="font-semibold text-white flex items-center justify-center gap-2">
                                {ex.name}
                                {ex.id.startsWith("temp-") && (
                                  <span className="text-xs text-orange-400">
                                    (unsaved)
                                  </span>
                                )}
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
                              className="text-red-500 w-5 h-5 ml-3 cursor-pointer hover:text-red-400 transition-colors"
                              onClick={() =>
                                handleRemoveExercise(
                                  ex.id,
                                  ex.exerciseId,
                                  day.dayNumber
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Initial Exercise Options (Always show 3) */}
                    <div className="space-y-2">
                      <h4 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
                        Recommended for {bodyFocus}
                      </h4>
                      {day.exerciseOptions.length > 0 ? (
                        day.exerciseOptions
                          .filter((ex) => !ex.isSelected)
                          .map((ex) => (
                            <div
                              key={ex.id}
                              className="bg-[#1A1D23] border border-[#2A2D36] rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-[#3F4554] transition-colors"
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
                          Loading exercise options...
                        </p>
                      )}

                      {/* Add More Exercise Button */}
                      <button
                        onClick={() => toggleAvailableExercises(day.dayNumber)}
                        className="w-full text-sm text-blue-400 flex items-center justify-center gap-2 py-2 hover:text-blue-300 transition-colors"
                      >
                        <Plus size={16} />
                        {day.showMoreOptions
                          ? "Hide More Options"
                          : "Add More Exercises"}
                      </button>

                      {/* Additional Available Exercises */}
                      {day.showMoreOptions && (
                        <div className="mt-3 space-y-2 border-t border-[#2F3544] pt-3">
                          <h4 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
                            All Available Exercises ({bodyFocus})
                          </h4>
                          {day.availableExercises.length > 0 ? (
                            day.availableExercises
                              .filter((ex) => !ex.isSelected)
                              .filter(
                                (ex) =>
                                  !day.exerciseOptions.some(
                                    (opt) => opt.id === ex.id
                                  )
                              ) // Don't show exercises already in initial options
                              .map((ex) => (
                                <div
                                  key={ex.id}
                                  className="bg-[#1A1D23] border border-[#2A2D36] rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-[#3F4554] transition-colors"
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
                          ) : day.availableExercises.length === 0 ? (
                            <p className="text-[#5E6272] text-sm text-center py-4">
                              Loading exercises...
                            </p>
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

      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
