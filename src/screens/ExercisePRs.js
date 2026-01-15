import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MuscleIcon from "../components/MuscleIcon";
import TopBar from "../components/TopBar";
import { Award } from "lucide-react";
import BottomBar from "../components/BottomBar";
export default function ExercisePRs() {
    const { exerciseId } = useParams();
    const navigate = useNavigate();
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        const fetchPRs = async () => {
            try {
                const res = await fetch("http://localhost:4242/auth/metrics/personal-records", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok)
                    throw new Error("Failed to fetch PRs");
                const data = await res.json();
                const found = data.find((d) => d.exerciseId === exerciseId);
                setRecord(found || null);
            }
            catch (err) {
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchPRs();
    }, [exerciseId, navigate]);
    if (loading)
        return _jsx("div", { className: "p-6 text-white", children: "Loading..." });
    if (!record)
        return (_jsxs("div", { className: "p-6 text-white", children: [_jsx("p", { children: "No PRs found for this exercise." }), _jsx(Link, { to: "/metrics", className: "text-[#00FFAD] underline", children: "Back to Metrics" })] }));
    // Build ordered PR list for display
    const repsOrder = [1, 2, 3, 5, 10];
    const prs = repsOrder
        .map((r) => ({
        reps: r,
        entry: record.prs?.[r] || record.prs?.[String(r)] || null,
    }))
        .filter((p) => p.entry !== null && p.entry !== undefined);
    return (_jsxs("div", { className: "min-h-screen text-[#5E6272] flex flex-col p-4 pb-16", style: {
            backgroundColor: "#0A0E1A",
        }, children: [_jsx(TopBar, { title: "Track Metrics", pageIcon: _jsx(Award, { size: 18 }), menuItems: [
                    { label: "Track Metrics", onClick: () => navigate("/metrics") },
                    { label: "Dashboard", onClick: () => navigate("/") },
                    { label: "Programmes", onClick: () => navigate("/programmes") },
                    { label: "Workouts", onClick: () => navigate("/workouts") },
                    { label: "Settings", onClick: () => navigate("/settings") },
                ] }), _jsxs("div", { className: "mt-6 px-2", children: [_jsx("div", { className: "bg-[#262A34] rounded-xl p-4 mb-4 border-l-4 border-[#00FFAD]", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx(MuscleIcon, { muscleGroup: record.muscleGroup, size: 48 }), _jsxs("div", { children: [_jsx("h3", { className: "text-white font-semibold text-lg", children: record.exerciseName }), _jsx("div", { className: "text-[#5E6272] text-sm", children: record.muscleGroup })] })] }) }), prs.length === 0 ? (_jsx("div", { className: "bg-[#262A34] p-6 rounded", children: "No recorded PRs yet." })) : (_jsx("div", { className: "space-y-3", children: prs.map((p) => (_jsxs("div", { className: "bg-[#262A34] p-4 rounded flex justify-between items-center", children: [_jsxs("div", { children: [_jsxs("div", { className: "text-sm text-[#9CA3AF]", children: [p.reps, "RM"] }), _jsxs("div", { className: "text-white font-semibold", children: [p.entry.weight, " kg"] })] }), _jsx("div", { className: "text-[#6B7280]", children: new Date(p.entry.date).toLocaleDateString() })] }, p.reps))) }))] }), _jsx(BottomBar, { onLogout: () => {
                    localStorage.removeItem("token");
                    navigate("/login");
                } })] }));
}
