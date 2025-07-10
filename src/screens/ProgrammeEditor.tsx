// src/screens/ProgrammeEditor.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, GripVertical } from "lucide-react";
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
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };
  const { programmeName } = useParams(); // Comes from the URL e.g. /editor/Full%20Body
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
      {/* Programme Metadata */}
      <div className="bg-[#1C1F26] rounded-xl p-4 space-y-4 mb-8">
        <div>
          <label className="text-sm text-gray-400">Programme Name</label>
          <input
            className="w-full mt-1 px-3 py-2 bg-[#2A2D39] rounded-md text-white outline-none"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">Focus</label>
          <input
            className="w-full mt-1 px-3 py-2 bg-[#2A2D39] rounded-md text-white outline-none"
            value={bodyFocus}
            onChange={(e) => setBodyFocus(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">Description</label>
          <textarea
            className="w-full mt-1 px-3 py-2 bg-[#2A2D39] rounded-md text-white outline-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Programme Days */}
      <div className="space-y-8">
        {days.map((day) => (
          <div key={day.dayNumber} className="space-y-2">
            <h2 className="text-lg font-semibold">Day {day.dayNumber}</h2>

            <div className="space-y-2">
              {day.exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="bg-[#1C1F26] border border-[#2F3544] rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="text-gray-500 w-4 h-4" />
                    <div>
                      <p className="font-medium text-white">{ex.name}</p>
                      <p className="text-sm text-gray-400">
                        {ex.sets} sets of {ex.reps} reps
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => handleAddExercise(day.dayNumber)}
                className="text-sm text-blue-400 flex items-center gap-1 hover:underline"
              >
                <Plus size={16} />
                Add Exercise
              </button>
            </div>
          </div>
        ))}
      </div>
      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
