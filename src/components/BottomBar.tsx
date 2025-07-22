import React from "react";
import { Home, Dumbbell, Calendar, Settings, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface BottomBarProps {
  onLogout: () => void;
}

export default function BottomBar({ onLogout }: BottomBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: <Home size={22} />, path: "/dashboard", label: "Dashboard" },
    { icon: <Dumbbell size={22} />, path: "/programmes", label: "Programmes" },
    { icon: <Calendar size={22} />, path: "/workouts", label: "Workouts" },
    { icon: <Settings size={22} />, path: "/settings", label: "Settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0E1117] border-t border-[#1F1F1F] flex justify-around items-center py-2 z-50">
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={`flex flex-col items-center text-sm ${
            location.pathname === item.path
              ? "text-[#246BFD]"
              : "text-[#5E6272]"
          }`}
        >
          {item.icon}
        </button>
      ))}

      <button
        onClick={onLogout}
        className="flex flex-col items-center text-[#5E6272] hover:text-red-500 transition-colors"
      >
        <LogOut size={22} />
      </button>
    </div>
  );
}
