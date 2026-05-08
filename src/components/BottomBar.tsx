import React from "react";
import { Home, Dumbbell, Calendar, TrendingUp, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

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
    { icon: <TrendingUp size={22} />, path: "/metrics", label: "Metrics" },
    { icon: <Settings size={22} />, path: "/settings", label: "Settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="pointer-events-auto mx-auto mb-3 w-[calc(100%-1.5rem)] max-w-[430px]">
        <div className="glass-modal rounded-2xl px-3 py-3 border border-white/15">
          <div className="flex items-center justify-between gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  aria-label={item.label}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-xl ${
                    isActive
                      ? "text-[#8EC5FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_18px_rgba(6,16,40,0.45)]"
                      : "text-[#98A2B8] hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 rounded-xl bg-white/14"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.icon}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
