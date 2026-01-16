import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell } from "lucide-react";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import CustomSelect from "../components/CustomSelect";
const bodyFocusOptions = [
    "Full Body",
    "Upper Body",
    "Lower Body",
    "Push",
    "Pull",
    "Legs",
    "Chest",
    "Back",
    "Shoulders",
    "Arms",
    "Core",
];
export default function CreateProgramme() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [days, setDays] = useState(4);
    const [weeks, setWeeks] = useState(4);
    const [mode, setMode] = useState("focus");
    const [focus, setFocus] = useState(bodyFocusOptions[0]);
    const [programmes, setProgrammes] = useState([]);
    const [selectedProgramme, setSelectedProgramme] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token)
            return;
        const fetchProgrammes = async () => {
            try {
                const res = await fetch("http://localhost:4242/auth/programmes", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok)
                    return;
                const data = await res.json();
                setProgrammes(data || []);
            }
            catch (err) {
                console.error(err);
            }
        };
        fetchProgrammes();
    }, []);
    const handleGenerate = async () => {
        if (!name.trim()) {
            alert("Please enter a programme name");
            return;
        }
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        setLoading(true);
        try {
            let bodyPartFocusValue;
            if (mode === "focus") {
                bodyPartFocusValue = focus;
            }
            else {
                const source = programmes.find((p) => p.id === selectedProgramme);
                bodyPartFocusValue = source?.bodyPartFocus || "Full Body";
            }
            const payload = {
                name: name.trim(),
                daysPerWeek: days,
                weeks,
                bodyPartFocus: bodyPartFocusValue,
            };
            const res = await fetch("http://localhost:4242/auth/programmes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Failed to create programme");
                setLoading(false);
                return;
            }
            const created = await res.json();
            // Redirect to editor for further customization
            navigate(`/editor/${created.id}`);
        }
        catch (err) {
            console.error(err);
            alert("Failed to generate programme");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen text-[#5E6272] flex flex-col p-4 pb-16", style: {
            backgroundColor: "#0A0E1A",
        }, children: [_jsx(TopBar, { title: "Programmes", pageIcon: _jsx(Dumbbell, { size: 18 }), menuItems: [
                    { label: "Dashboard", onClick: () => navigate("/") },
                    { label: "Programmes", onClick: () => navigate("/programmes") },
                    { label: "Workouts", onClick: () => navigate("/workouts") },
                    { label: "Track Metrics", onClick: () => navigate("/metrics") },
                    { label: "Settings", onClick: () => navigate("/settings") },
                ] }), _jsxs("div", { className: "w-full px-2 mt-6 max-w-2xl mx-auto", children: [_jsx("h3", { className: "text-white font-medium mb-3 text-center", children: "Create New Custom Programme" }), _jsxs("div", { className: "bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 mb-3 overflow-visible", children: [_jsx("label", { className: "block text-sm text-[#9CA3AF] mb-1", children: "Custom Programme Name" }), _jsx("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g. 12-week Strength Build", className: "w-full bg-transparent outline-none text-white" })] }), _jsxs("div", { className: "bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 mb-3 overflow-visible", children: [_jsx("label", { className: "block text-sm text-[#9CA3AF] mb-1", children: "Number of Days" }), _jsx("div", { className: "pt-1", children: _jsx(CustomSelect, { options: [2, 3, 4, 5, 6, 7].map((n) => ({
                                        value: n,
                                        label: `${n} days`,
                                    })), value: days, onChange: (v) => setDays(Number(v)) }) })] }), _jsxs("div", { className: "bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 mb-3 overflow-visible", children: [_jsx("label", { className: "block text-sm text-[#9CA3AF] mb-1", children: "Number of Weeks" }), _jsx("div", { className: "pt-1", children: _jsx(CustomSelect, { options: [3, 4, 5, 6].map((n) => ({
                                        value: n,
                                        label: `${n} weeks`,
                                    })), value: weeks, onChange: (v) => setWeeks(Number(v)) }) })] }), _jsxs("div", { className: "bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 mb-3 overflow-visible", children: [_jsx("label", { className: "block text-sm text-[#9CA3AF] mb-1", children: "Body Part Focus" }), _jsxs("div", { className: "flex gap-3 mt-2", children: [_jsx("button", { onClick: () => setMode("focus"), className: `px-3 py-2 rounded ${mode === "focus"
                                            ? "bg-[#00FFAD] text-black"
                                            : "bg-[#1C1F26] text-white border border-[#2F3544]"}`, children: "Choose Focus" }), _jsx("button", { onClick: () => setMode("pull"), className: `px-3 py-2 rounded ${mode === "pull"
                                            ? "bg-[#00FFAD] text-black"
                                            : "bg-[#1C1F26] text-white border border-[#2F3544]"}`, children: "Pull from Previous Programme" })] })] }), _jsx("div", { className: "bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 mb-4 overflow-visible", children: mode === "focus" ? (_jsx(CustomSelect, { options: bodyFocusOptions.map((b) => ({ value: b, label: b })), value: focus, onChange: (v) => setFocus(String(v)) })) : (_jsx(CustomSelect, { options: [
                                { value: "", label: "Select a programme to copy from" },
                                ...programmes.map((p) => ({ value: p.id, label: p.name })),
                            ], value: selectedProgramme || "", onChange: (v) => setSelectedProgramme(String(v) || null) })) }), _jsxs("div", { className: "flex items-center gap-3 mb-6", children: [_jsx("button", { onClick: handleGenerate, disabled: loading, className: "flex-1 bg-[#246BFD] text-white px-5 py-3 rounded-lg font-semibold text-left", children: loading ? "Generating..." : "Generate Programme" }), _jsx("div", { className: "rounded-full p-1 bg-black", children: _jsx("div", { className: "bg-[#16A34A] w-10 h-10 rounded-full flex items-center justify-center", children: _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M12 5v14M5 12h14", stroke: "#FFFFFF", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }) })] })] }), _jsx(BottomBar, { onLogout: () => {
                    localStorage.removeItem("token");
                    navigate("/login");
                } })] }));
}
