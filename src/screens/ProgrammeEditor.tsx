import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import logo from "../assets/logo.png";
import icon from "../assets/icon_placeholder.png";
import BottomBar from "../components/BottomBar";

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
};

type ProgrammeDay = {
  dayNumber: number;
  exercises: Exercise[];
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

  const toggleDay = (dayNumber: number) => {
    setOpenDays((prev) => ({
      ...prev,
      [dayNumber]: !prev[dayNumber],
    }));
  };

  const handleAddExercise = async (dayNumber: number) => {
    try {
      // Fetch a random exercise matching the programme's body focus
      const res = await fetch(
        `http://localhost:4242/auth/exercises/random?focus=${encodeURIComponent(
          bodyFocus
        )}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch random exercise");
      }

      const randomExercise = await res.json();

      // POST that exercise to the programme
      const postRes = await fetch(
        `http://localhost:4242/auth/programmes/${programmeId}/exercises`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            exerciseId: randomExercise.id,
            dayNumber,
            sets: 3,
            reps: "10",
          }),
        }
      );

      if (!postRes.ok) {
        throw new Error("Failed to add exercise to programme");
      }

      const newExercise = await postRes.json();

      // Add to UI
      setDays((prevDays) =>
        prevDays.map((day) =>
          day.dayNumber === dayNumber
            ? {
                ...day,
                exercises: [
                  ...day.exercises,
                  {
                    id: newExercise.id,
                    name: randomExercise.name,
                    sets: newExercise.sets,
                    reps: newExercise.reps,
                  },
                ],
              }
            : day
        )
      );
    } catch (err) {
      console.error("Error adding exercise:", err);
    }
  };

  const handleRemoveExercise = async (
    exerciseId: string,
    dayNumber: number
  ) => {
    try {
      await fetch(
        `http://localhost:4242/auth/programmes/exercises/${exerciseId}`,
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
                exercises: day.exercises.filter((ex) => ex.id !== exerciseId),
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

        const grouped: Record<number, Exercise[]> = {};
        data.exercises?.forEach((item: any) => {
          const day = item.dayNumber ?? 1;
          if (!grouped[day]) grouped[day] = [];

          grouped[day].push({
            id: item.id,
            name: item.exercise?.name || "Unnamed",
            sets: item.sets ?? 3,
            reps: item.reps ?? "10",
          });
        });

        const loadedDays: ProgrammeDay[] = Object.entries(grouped).map(
          ([dayStr, exercises]) => ({
            dayNumber: Number(dayStr),
            exercises,
          })
        );

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
                              <span className="text-[#FBA3FF]">
                                {bodyFocus}
                              </span>
                            </div>
                          </div>
                          <XCircle
                            className="text-red-500 w-5 h-5 ml-3 cursor-pointer"
                            onClick={() =>
                              handleRemoveExercise(ex.id, day.dayNumber)
                            }
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-white text-sm">No exercises yet.</p>
                    )}

                    {/* Add Exercise */}
                    <button
                      onClick={() => handleAddExercise(day.dayNumber)}
                      className="text-sm text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      <Plus size={16} />
                      Add Exercise
                    </button>
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
