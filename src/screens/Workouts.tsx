import React, { useEffect } from "react";
import { MoreHorizontal, Dumbbell, Play, Calendar } from "lucide-react";
import BottomBar from "../components/BottomBar";
import { useNavigate } from "react-router-dom";

export default function Workouts() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

  return (
    <div
      className="min-h-screen text-white pb-16"
      style={{
        background:
          "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
      }}
    >
      {/* Top Logo Bar */}
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto pt-4">
        <span className="text-white text-xl font-bold tracking-wide">
          BRUTE
        </span>
      </div>

      {/* Top Navigation Bar */}
      <div className="flex justify-between items-center mt-4 px-2 h-10 relative">
        <Calendar className="text-white w-6 h-6" />
        <h2 className="absolute left-1/2 transform -translate-x-1/2 text-white font-semibold text-xl">
          Workouts
        </h2>
        <MoreHorizontal className="text-white w-6 h-6" />
      </div>

      {/* Sub Header */}
      <div className="text-center mt-2">
        <h3 className="text-lg font-semibold text-white">
          Full Body – 3 Day Split
        </h3>
      </div>

      {/* Week Info & Timer */}
      <div className="flex justify-center items-center gap-2 mt-1 text-sm text-[#A0AEC0]">
        <span className="uppercase text-xs tracking-wide">Week 1, Day 1</span>
        <span className="flex items-center gap-1 text-[#86FF99] font-medium cursor-pointer">
          <Play size={14} /> Start Workout Timer
        </span>
      </div>

      {/* Exercise Cards */}
      <div className="px-4 mt-4 space-y-4">
        {[1, 2].map((_, i) => (
          <div
            key={i}
            className={`rounded-xl p-4 ${
              i === 0 ? "border-2 border-blue-500" : "border border-[#2F3544]"
            } bg-[#1C1F26]`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white font-semibold text-base">
                  {i === 0 ? "Bench Press (Incline Barbell)" : "Barbell Squat"}
                </h4>
                <div className="flex text-sm gap-2 mt-1">
                  <span className="text-green-400">2 Working Sets</span>
                  <span className="text-pink-400">
                    {i === 0 ? "Chest" : "Legs"}
                  </span>
                </div>
              </div>
              <MoreHorizontal className="text-white" />
            </div>

            {/* Input Sets */}
            {[0, 1].map((_, setIdx) => (
              <div key={setIdx} className="flex items-center gap-2 mt-3">
                <div className="w-4 text-[#5E6272]">⋮</div>
                <input
                  type="number"
                  placeholder="Weight"
                  className="bg-[#2A2E38] text-white rounded-md px-2 py-1 w-1/2 placeholder:text-[#5E6272] text-sm"
                />
                <input
                  type="number"
                  placeholder="Reps"
                  className="bg-[#2A2E38] text-white rounded-md px-2 py-1 w-1/2 placeholder:text-[#5E6272] text-sm"
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
                <span className="text-green-400 text-lg leading-none">+</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
