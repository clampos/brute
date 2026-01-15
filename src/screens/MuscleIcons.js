import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import MuscleIcon from "../components/MuscleIcon";
export default function MuscleIcons() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await fetch("http://localhost:4242/auth/exercises/all", {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                if (!res.ok)
                    throw new Error("Failed to fetch exercises");
                const exercises = await res.json();
                const unique = Array.from(new Set((exercises || []).map((e) => e.muscleGroup || ""))).filter(Boolean);
                unique.sort();
                setGroups(unique);
            }
            catch (err) {
                console.error("Error fetching muscle groups:", err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchGroups();
    }, []);
    if (loading)
        return _jsx("div", { className: "p-6 text-white", children: "Loading..." });
    return (_jsxs("div", { className: "min-h-screen p-6 bg-[#0B1020] text-white", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Muscle Group Icons" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4", children: groups.map((g) => (_jsxs("div", { className: "flex items-center gap-3 bg-[#161922] p-3 rounded", children: [_jsx(MuscleIcon, { muscleGroup: g, size: 40 }), _jsx("div", { children: _jsx("div", { className: "font-semibold", children: g }) })] }, g))) })] }));
}
