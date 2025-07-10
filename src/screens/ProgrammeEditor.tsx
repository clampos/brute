import React, { useState } from "react";
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
  const { programmeName } = useParams();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(
    decodeURIComponent(programmeName || "Unnamed Programme")
  );
  const [bodyFocus, setBodyFocus] = useState("Full Body");
  const [description, setDescription] = useState(
    "This is a placeholder description for the programme."
  );

  const [days, setDays] = useState<ProgrammeDay[]>([
    {
      dayNumber: 1,
      exercises: [
        { id: "1", name: "Squat", sets: 4, reps: "6-8" },
        { id: "2", name: "Bench Press", sets: 4, reps: "6-8" },
      ],
    },
    {
      dayNumber: 2,
      exercises: [
        { id: "3", name: "Deadlift", sets: 3, reps: "5" },
        { id: "4", name: "Overhead Press", sets: 4, reps: "8-10" },
      ],
    },
  ]);

  const [openDays, setOpenDays] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(days.map((d) => [d.dayNumber, true]))
  );

  const toggleDay = (dayNumber: number) => {
    setOpenDays((prev) => ({
      ...prev,
      [dayNumber]: !prev[dayNumber],
    }));
  };

  const handleAddExercise = (dayNumber: number) => {
    const updatedDays = days.map((day) => {
      if (day.dayNumber === dayNumber) {
        return {
          ...day,
          exercises: [
            ...day.exercises,
            {
              id: `${Date.now()}`,
              name: "New Exercise",
              sets: 3,
              reps: "10",
            },
          ],
        };
      }
      return day;
    });

    setDays(updatedDays);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

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
        <h2
          className="text-white"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: "20px",
          }}
        >
          Programmes
        </h2>
        <img
          src={icon}
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>

      {/* Programme Name Display */}
      <div className="mt-6 mb-4 text-center">
        <h3 className="text-white text-xl font-semibold">{displayName}</h3>
      </div>

      {/* Programme Days */}
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
                  {day.exercises.map((ex) => (
                    <div
                      key={ex.id}
                      className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 flex items-center justify-between"
                    >
                      {/* Left: Green Tick */}
                      <CheckCircle className="text-green-500 w-5 h-5 mr-3" />

                      {/* Center: Exercise Details */}
                      <div className="flex-1 text-center">
                        <p className="font-semibold text-white">{ex.name}</p>
                        <div className="flex justify-center gap-3 text-sm mt-1">
                          <span className="text-[#00FFAD]">{ex.sets} sets</span>
                          <span className="text-[#FBA3FF]">Full Body</span>
                        </div>
                      </div>

                      {/* Right: Red Cross */}
                      <XCircle className="text-red-500 w-5 h-5 ml-3" />
                    </div>
                  ))}

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

      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
