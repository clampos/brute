import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import TopBar from "../components/TopBar";
import { Dumbbell, CheckCircle, ChevronDown, ChevronRight, Edit3, Play, } from "lucide-react";
export default function Programmes() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState("John");
    const [surname, setSurname] = useState("Doe");
    const [loading, setLoading] = useState(true);
    const [programmesData, setProgrammesData] = useState({});
    const [openSections, setOpenSections] = useState({});
    const [activeUserProgram, setActiveUserProgram] = useState(null);
    const [filterTab, setFilterTab] = useState("all");
    const [previousPrograms, setPreviousPrograms] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [programmeToStart, setProgrammeToStart] = useState(null);
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        const fetchData = async () => {
            try {
                // Fetch user
                const userRes = await fetch("http://localhost:4242/api/dashboard", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!userRes.ok)
                    throw new Error("Unauthorized");
                const userData = await userRes.json();
                setFirstName(userData.firstName);
                setSurname(userData.surname);
                // Fetch active user program and previous programmes
                const userProgramRes = await fetch("http://localhost:4242/auth/user-programs", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (userProgramRes.ok) {
                    const userPrograms = await userProgramRes.json();
                    const active = userPrograms.find((up) => up.status === "ACTIVE");
                    setActiveUserProgram(active);
                    // Get completed programs
                    const completed = userPrograms.filter((up) => up.status === "COMPLETED");
                    setPreviousPrograms(completed);
                }
                // Fetch programmes
                const progRes = await fetch("http://localhost:4242/auth/programmes", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!progRes.ok)
                    throw new Error("Failed to fetch programmes");
                const data = await progRes.json();
                // Group by bodyPartFocus
                const grouped = {};
                data.forEach((p) => {
                    if (!grouped[p.bodyPartFocus])
                        grouped[p.bodyPartFocus] = [];
                    grouped[p.bodyPartFocus].push(p);
                });
                setProgrammesData(grouped);
                // Initialize open state for all sections
                const initialOpen = {};
                Object.keys(grouped).forEach((key) => {
                    initialOpen[key] = true;
                });
                setOpenSections(initialOpen);
            }
            catch (err) {
                console.error("Error:", err);
                localStorage.removeItem("token");
                navigate("/login");
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("installPromptDismissed");
        navigate("/login");
    };
    const toggleSection = (section) => {
        setOpenSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };
    const formatProgrammeDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const monthDiff = (today.getFullYear() - date.getFullYear()) * 12 +
            (today.getMonth() - date.getMonth());
        if (monthDiff === 0) {
            return "This month";
        }
        else if (monthDiff === 1) {
            return "Last month";
        }
        else {
            return date.toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
            });
        }
    };
    const handleEditProgramme = (programmeId) => {
        navigate(`/editor/${programmeId}`);
    };
    const handleStartProgramme = async (programmeId) => {
        // If there's an active programme, show confirmation modal instead of auto-canceling
        if (activeUserProgram) {
            setProgrammeToStart(programmeId);
            setShowConfirmModal(true);
            return;
        }
        // No active programme, proceed directly
        await proceedWithStartingProgramme(programmeId);
    };
    const proceedWithStartingProgramme = async (programmeId) => {
        const token = localStorage.getItem("token");
        if (!token)
            return;
        try {
            // First, cancel any active programmes
            if (activeUserProgram) {
                await fetch(`http://localhost:4242/auth/user-programs/${activeUserProgram.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ status: "CANCELLED" }),
                });
            }
            // Create new user program with today as start date
            const response = await fetch("http://localhost:4242/auth/user-programs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    programmeId: programmeId,
                    startDate: new Date().toISOString(),
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to start programme");
            }
            alert("Programme started! Head to Workouts to begin.");
            navigate("/workouts");
        }
        catch (error) {
            console.error("Error starting programme:", error);
            alert(error instanceof Error ? error.message : "Failed to start programme. Please try again.");
        }
        finally {
            setShowConfirmModal(false);
            setProgrammeToStart(null);
        }
    };
    return (_jsxs("div", { className: "min-h-screen text-[#5E6272] flex flex-col p-4 pb-16", style: {
            backgroundColor: "#0A0E1A",
        }, children: [_jsx(TopBar, { title: "Programmes", pageIcon: _jsx(Dumbbell, { size: 18 }), menuItems: [
                    { label: "Dashboard", onClick: () => navigate("/") },
                    { label: "Workouts", onClick: () => navigate("/workouts") },
                    { label: "Track Metrics", onClick: () => navigate("/metrics") },
                    { label: "Settings", onClick: () => navigate("/settings") },
                ] }), _jsxs("div", { className: "flex gap-2 mt-4 mb-6", children: [_jsx("button", { onClick: () => setFilterTab("all"), className: `px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterTab === "all"
                            ? "bg-[#246BFD] text-white"
                            : "text-[#5E6272] bg-transparent"}`, children: "All" }), _jsx("button", { onClick: () => setFilterTab("previous"), className: `px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterTab === "previous"
                            ? "bg-[#246BFD] text-white"
                            : "text-[#5E6272] bg-transparent"}`, children: "Previous" })] }), activeUserProgram && (_jsx("div", { className: "w-full px-2 mb-5", children: _jsxs("div", { className: "bg-gradient-to-br from-[#FFB8E0] via-[#BE9EFF] via-[#88C0FC] to-[#86FF99] rounded-xl px-4 py-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-black font-semibold text-sm", children: "ACTIVE PROGRAMME" }), _jsx(CheckCircle, { className: "text-green-700", size: 20 })] }), _jsx("h3", { className: "text-black font-bold text-lg mb-1", children: activeUserProgram.programme.name }), _jsxs("p", { className: "text-black/80 text-sm mb-3", children: ["Week ", activeUserProgram.currentWeek, " \u2022 Day", " ", activeUserProgram.currentDay] }), _jsxs("button", { onClick: () => navigate("/workouts"), className: "w-full bg-black text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2", children: [_jsx(Play, { size: 16 }), "Continue Workout"] })] }) })), _jsx("div", { className: "w-full px-2 mb-6 mt-6", children: _jsxs("div", { className: "bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4 flex justify-between items-center cursor-pointer hover:bg-[#2A2E38] transition-colors", onClick: () => navigate("/programmes/create"), children: [_jsx("span", { className: "font-semibold text-base text-white", children: "Create New Custom Programme" }), _jsx("div", { className: "w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold", children: "+" })] }) }), _jsx("div", { className: "flex flex-col gap-6 px-2", children: loading ? (_jsx("div", { className: "text-white", children: "Loading..." })) : filterTab === "previous" ? (
                // Previous Programmes View
                previousPrograms && previousPrograms.length > 0 ? (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("h3", { className: "text-xs text-[#5E6272] font-semibold tracking-widest uppercase mb-2", children: "Completed Programmes" }), previousPrograms.map((userProgram) => {
                            const colours = [
                                { bg: "from-[#FFB8E0]", accent: "border-[#FF6BB8]" },
                                { bg: "from-[#88C0FC]", accent: "border-[#246BFD]" },
                                { bg: "from-[#86FF99]", accent: "border-[#00FFAD]" },
                                { bg: "from-[#FFD700]", accent: "border-[#FFA500]" },
                                { bg: "from-[#BE9EFF]", accent: "border-[#9C6BFF]" },
                            ];
                            const colourIdx = previousPrograms.indexOf(userProgram) % colours.length;
                            const colour = colours[colourIdx];
                            return (_jsxs("div", { className: `w-full bg-[#1C1F26] rounded-xl px-4 py-4 border-l-4 ${colour.accent}`, children: [_jsx("p", { className: "font-semibold text-white mb-1", children: userProgram.programme.name }), _jsxs("p", { className: "text-sm text-[#5E6272]", children: ["Completed ", formatProgrammeDate(userProgram.endDate)] })] }, userProgram.id));
                        })] })) : (_jsx("div", { className: "w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-10 flex justify-center items-center", children: _jsx("p", { className: "text-[#5E6272] font-semibold text-lg", children: "No completed programmes yet" }) }))) : // All Programmes View
                    Object.keys(programmesData).length > 0 ? (Object.entries(programmesData).map(([section, programmes], idx) => {
                        const isOpen = openSections[section];
                        return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 cursor-pointer mb-2", onClick: () => toggleSection(section), children: [isOpen ? (_jsx(ChevronDown, { className: "text-green-500 w-4 h-4" })) : (_jsx(ChevronRight, { className: "text-green-500 w-4 h-4" })), _jsx("h3", { className: "text-xs text-[#5E6272] font-semibold tracking-widest uppercase", children: section })] }), isOpen && (_jsx("div", { className: "flex flex-col gap-3", children: programmes.map((prog) => {
                                        const isActive = activeUserProgram?.programmeId === prog.id;
                                        return (_jsxs("div", { className: `w-full bg-[#1C1F26] rounded-xl px-4 py-3 ${isActive
                                                ? "border-2 border-green-500"
                                                : "border border-[#2F3544]"}`, children: [_jsx("div", { className: "flex items-start justify-between mb-2", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("p", { className: "font-semibold text-white", children: prog.name }), isActive && (_jsx(CheckCircle, { className: "text-green-500", size: 16 }))] }), _jsxs("p", { className: "text-sm text-[#00FFAD]", children: [prog.daysPerWeek, " days \u00B7 ", prog.weeks, " weeks"] }), prog.description && (_jsx("p", { className: "text-xs text-[#5E6272] mt-1", children: prog.description }))] }) }), _jsxs("div", { className: "flex gap-2 mt-3", children: [_jsxs("button", { onClick: () => handleEditProgramme(prog.id), className: "flex-1 bg-[#2A2E38] hover:bg-[#3a3f4a] text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors", children: [_jsx(Edit3, { size: 14 }), "Customize"] }), !isActive && (_jsxs("button", { onClick: () => handleStartProgramme(prog.id), className: "flex-1 bg-[#246BFD] hover:bg-blue-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors", children: [_jsx(Play, { size: 14 }), "Start"] }))] })] }, prog.id));
                                    }) }))] }, idx));
                    })) : (_jsx("div", { className: "w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-10 flex justify-center items-center", children: _jsx("p", { className: "text-[#5E6272] font-semibold text-lg", children: "No programmes yet" }) })) }), showConfirmModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-[#1C1F26] rounded-xl p-6 max-w-sm w-full border border-[#2F3544]", children: [_jsx("h3", { className: "text-white font-bold text-lg mb-2", children: "Switch Programme?" }), _jsxs("p", { className: "text-[#9CA3AF] mb-4", children: ["You already have an active programme:", " ", _jsx("span", { className: "font-semibold text-white", children: activeUserProgram?.programme?.name })] }), _jsx("p", { className: "text-[#9CA3AF] mb-6", children: "Starting a new programme will cancel your current one. Any progress will be saved but you'll need to restart to continue." }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => {
                                        setShowConfirmModal(false);
                                        setProgrammeToStart(null);
                                    }, className: "flex-1 bg-[#2A2E38] hover:bg-[#3a3f4a] text-white py-2 rounded-lg font-medium transition-colors", children: "Cancel" }), _jsx("button", { onClick: () => {
                                        if (programmeToStart) {
                                            proceedWithStartingProgramme(programmeToStart);
                                        }
                                    }, className: "flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors", children: "Switch Programme" })] })] }) })), _jsx(BottomBar, { onLogout: handleLogout })] }));
}
