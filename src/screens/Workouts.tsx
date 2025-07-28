import React, { useEffect, useState, useRef } from "react";
import {
  MoreHorizontal,
  Dumbbell,
  Play,
  Calendar,
  PauseCircleIcon,
} from "lucide-react";
import BottomBar from "../components/BottomBar";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Workouts() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

      {/* Sub Header */}
      <div className="text-center mt-2">
        <h3 className="text-lg font-semibold text-white">
          Full Body – 3 Day Split
        </h3>
      </div>

      {/* Week Info & Timer */}
      <div className="flex justify-center items-center gap-2 mt-1 text-sm text-[#A0AEC0]">
        <span className="uppercase text-xs tracking-wide">Week 1, Day 1</span>
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
                  style={{ MozAppearance: "textfield" }} // Firefox
                  inputMode="numeric"
                />
                <input
                  type="number"
                  placeholder="Reps"
                  className="bg-[#2A2E38] text-white rounded-md px-2 py-1 w-1/2 placeholder:text-[#5E6272] text-sm"
                  style={{ MozAppearance: "textfield" }} // Firefox
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
                <span className="text-green-400 text-lg leading-none">+</span>
              </button>
            </div>
          </div>
        ))}
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
