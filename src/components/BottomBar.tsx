import React from "react";
import { useNavigate } from "react-router-dom";

interface BottomBarProps {
  onLogout: () => void;
}

export default function BottomBar({ onLogout }: BottomBarProps) {
  const navigate = useNavigate();

  return (
    <div
      className="fixed bottom-0 left-0 w-full flex justify-around py-3 text-sm"
      style={{ backgroundColor: "#000B1A" }}
    >
      {["Home", "Workouts", "Calendar"].map((label) => (
        <button
          key={label}
          className="flex-1 text-center text-white font-medium tracking-wide"
          style={{ fontFamily: "'Poppins', sans-serif" }}
          onClick={() => {
            switch (label) {
              case "Home":
                navigate("/dashboard");
                break;
              case "Workouts":
                navigate("/workouts");
                break;
              case "Calendar":
                navigate("/calendar");
                break;
            }
          }}
        >
          {label}
        </button>
      ))}

      {/* Settings button */}
      <button
        onClick={() => navigate("/settings")}
        className="flex-1 text-center text-white font-medium tracking-wide"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        Settings
      </button>
      <button
        onClick={onLogout}
        className="flex-1 text-center text-white/70 hover:text-white font-medium tracking-wide transition-colors"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        Logout
      </button>
    </div>
  );
}
