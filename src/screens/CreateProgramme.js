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
            let sourceProgrammeId = null;
            if (mode === "focus") {
                bodyPartFocusValue = focus;
            }
            else {
                const source = programmes.find((p) => p.id === selectedProgramme);
                bodyPartFocusValue = source?.bodyPartFocus || "Full Body";
                sourceProgrammeId = selectedProgramme;
            }
            const payload = {
                name: name.trim(),
                daysPerWeek: days,
                weeks,
                bodyPartFocus: bodyPartFocusValue,
            };
            // Add source programme ID if pulling from previous
            if (sourceProgrammeId) {
                payload.sourceProgrammeId = sourceProgrammeId;
            }
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
                ] }), _jsxs("div", { className: "w-full px-2 mt-6 max-w-2xl mx-auto", children: [_jsx("h3", { className: "text-white font-medium mb-6 text-center", children: "Custom Programme" }), _jsxs("div", { className: "mb-4 overflow-visible", children: [_jsx("label", { className: "block text-sm text-[#9CA3AF] mb-2", children: "Custom Programme Name" }), _jsx("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "Custom Programme Name", className: "w-full bg-transparent border-2 border-[#246BFD] rounded-lg px-3 py-2 text-white placeholder-[#5E6272] outline-none focus:border-[#246BFD]" })] }), _jsxs("div", { className: "mb-4 overflow-visible", children: [_jsx("label", { className: "block text-sm text-[#9CA3AF] mb-2", children: "Number of Days (2-7)" }), _jsx(CustomSelect, { options: [2, 3, 4, 5, 6, 7].map((n) => ({
                                    value: n,
                                    label: `${n} Days a Week`,
                                })), value: days, onChange: (v) => setDays(Number(v)) })] }), _jsxs("div", { className: "mb-4 overflow-visible", children: [_jsx("label", { className: "block text-sm text-[#9CA3AF] mb-2", children: "Number of Weeks 3-12" }), _jsx(CustomSelect, { options: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({
                                    value: n,
                                    label: `${n} weeks`,
                                })), value: weeks, onChange: (v) => setWeeks(Number(v)) })] }), _jsxs("div", { className: "mb-6 overflow-visible", children: [_jsx("label", { className: "block text-sm text-[#9CA3AF] mb-2", children: "Body Part Focus" }), _jsx(CustomSelect, { options: bodyFocusOptions.map((b) => ({ value: b, label: b })), value: focus, onChange: (v) => setFocus(String(v)) })] }), _jsx("div", { className: "text-center mb-6", children: _jsx("p", { className: "text-[#5E6272] text-sm", children: "Or" }) }), _jsxs("div", { className: "mb-6 overflow-visible", children: [_jsx("label", { className: "block text-sm text-[#9CA3AF] mb-2", children: "Pull from Previous Programme" }), _jsx(CustomSelect, { options: [
                                    { value: "", label: "Select a programme to copy from" },
                                    ...programmes.map((p) => ({ value: p.id, label: p.name })),
                                ], value: selectedProgramme || "", onChange: (v) => setSelectedProgramme(String(v) || null) })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: handleGenerate, disabled: loading, className: "flex-1 bg-[#246BFD] hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50", children: loading ? "Generating..." : "Generate Programme" }), _jsx("div", { className: "rounded-full p-2 bg-[#16A34A] flex items-center justify-center", children: _jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M12 5v14M5 12h14", stroke: "#FFFFFF", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) })] })] }), _jsx(BottomBar, { onLogout: () => {
                    localStorage.removeItem("token");
                    navigate("/login");
                } })] }));
}
