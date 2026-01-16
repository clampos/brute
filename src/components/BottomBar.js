import { jsx as _jsx } from "react/jsx-runtime";
import { Home, Dumbbell, Calendar, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
export default function BottomBar({ onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();
    const navItems = [
        { icon: _jsx(Home, { size: 22 }), path: "/dashboard", label: "Dashboard" },
        { icon: _jsx(Dumbbell, { size: 22 }), path: "/programmes", label: "Programmes" },
        { icon: _jsx(Calendar, { size: 22 }), path: "/workouts", label: "Workouts" },
        { icon: _jsx(Settings, { size: 22 }), path: "/settings", label: "Settings" },
    ];
    return (_jsx("div", { className: "fixed bottom-0 left-0 right-0 bg-[#0E1117] border-t border-[#1F1F1F] flex justify-around items-center py-2 z-50", children: navItems.map((item) => (_jsx("button", { onClick: () => navigate(item.path), className: `flex flex-col items-center text-sm ${location.pathname === item.path
                ? "text-[#246BFD]"
                : "text-[#5E6272]"}`, children: item.icon }, item.path))) }));
}
