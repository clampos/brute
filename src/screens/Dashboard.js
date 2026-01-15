import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { ArrowRight, User, Scale, Trophy, ListTodo, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import InstallPrompt from "../components/InstallPrompt";
import BottomBar from "../components/BottomBar";
export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [userProgram, setUserProgram] = useState(null);
    const [todayWorkout, setTodayWorkout] = useState(null);
    const [weeklyStats, setWeeklyStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const navItems = ["overview", "performance"];
    const isActive = (tab) => activeTab === tab;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [firstName, setFirstName] = useState("John");
    const [surname, setSurname] = useState("Doe");
    const [profilePhoto, setProfilePhoto] = useState(null);
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        const fetchData = async () => {
            try {
                // Fetch user data
                const dashboardRes = await fetch("http://localhost:4242/api/dashboard", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!dashboardRes.ok)
                    throw new Error("Unauthorized");
                const userData = await dashboardRes.json();
                setFirstName(userData.firstName);
                setSurname(userData.surname);
                setMessage(userData.message);
                // Fetch profile data to get profile photo
                const profileRes = await fetch("http://localhost:4242/auth/user/profile", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setProfilePhoto(profileData.profilePhoto);
                }
                // Fetch active user program
                const userProgramRes = await fetch("http://localhost:4242/auth/user-programs", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (userProgramRes.ok) {
                    const userPrograms = await userProgramRes.json();
                    const active = userPrograms.find((up) => up.status === "ACTIVE");
                    setUserProgram(active);
                }
                setLoading(false);
            }
            catch (err) {
                console.error("Auth error:", err);
                localStorage.removeItem("token");
                navigate("/login");
            }
        };
        fetchData();
    }, [navigate]);
    useEffect(() => {
        const fetchWeeklyStats = async () => {
            const token = localStorage.getItem("token");
            if (!token || !userProgram)
                return;
            setLoadingStats(true);
            try {
                const response = await fetch("http://localhost:4242/auth/workouts/weekly-stats", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const stats = await response.json();
                    setWeeklyStats(stats);
                }
            }
            catch (error) {
                console.error("Error fetching weekly stats:", error);
            }
            finally {
                setLoadingStats(false);
            }
        };
        if (activeTab === "performance" && userProgram) {
            fetchWeeklyStats();
        }
    }, [activeTab, userProgram]);
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("installPromptDismissed");
        navigate("/login");
    };
    const calculateProgress = (userProgram) => {
        const totalDays = userProgram.programme.weeks * userProgram.programme.daysPerWeek;
        const completedDays = (userProgram.currentWeek - 1) * userProgram.programme.daysPerWeek +
            (userProgram.currentDay - 1);
        return Math.round((completedDays / totalDays) * 100);
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center text-white font-poppins bg-gradient-to-b from-[#001F3F] to-[#000B1A]", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" }), _jsx("p", { children: "Loading your dashboard..." })] }) }));
    }
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return (_jsxs("div", { className: "min-h-screen text-[#5E6272] flex flex-col p-4 pb-16", style: {
            backgroundColor: "#0A0E1A",
        }, children: [_jsx(TopBar, { title: "Dashboard", pageIcon: null, menuItems: [
                    { label: "Programmes", onClick: () => navigate("/programmes") },
                    { label: "Workouts", onClick: () => navigate("/workouts") },
                    { label: "Track Metrics", onClick: () => navigate("/metrics") },
                    { label: "Settings", onClick: () => navigate("/settings") },
                ] }), _jsx("div", { className: "w-full px-4 flex justify-end mt-2", children: _jsxs("div", { className: "w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-[#246BFD] hover:border-[#1a52cc] transition-colors relative", onClick: () => navigate("/settings"), children: [profilePhoto ? (_jsx("img", { src: `http://localhost:4242${profilePhoto}`, alt: "Profile", className: "w-full h-full object-cover", onError: (e) => {
                                console.error("Failed to load profile image:", profilePhoto);
                                e.currentTarget.style.display = "none";
                            } })) : null, _jsx("div", { className: `absolute inset-0 w-full h-full bg-[#262A34] flex items-center justify-center ${profilePhoto ? "hidden" : "flex"}`, children: _jsx(User, { size: 20, className: "text-[#5E6272]" }) })] }) }), _jsxs("h1", { className: "text-center mt-4", style: {
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                    fontSize: "36px",
                    lineHeight: "40px",
                    letterSpacing: "0px",
                    color: "white",
                }, children: [greeting, ", ", firstName] }), _jsx("div", { className: "flex justify-around mt-6 mb-4", children: navItems.map((item) => (_jsx("button", { onClick: () => setActiveTab(item), className: `px-4 py-2 rounded-full font-medium text-sm ${isActive(item)
                        ? "bg-[#246BFD] text-white"
                        : "text-[#5E6272] bg-transparent"}`, children: item === "overview" ? "Overview" : "This Week's Performance" }, item))) }), activeTab === "overview" && (_jsxs("div", { className: "flex flex-col gap-4", children: [userProgram && todayWorkout ? (_jsx("div", { className: "rounded-2xl p-6 bg-gradient-to-br from-[#00CED1] via-[#87CEEB] to-[#FFB6D9] text-black relative overflow-hidden", children: _jsxs("div", { className: "relative z-10", children: [_jsx("h2", { className: "text-lg font-bold mb-1", children: "Today's Workout" }), _jsxs("p", { className: "text-sm opacity-90 font-medium mb-6", children: [userProgram.programme.name, " Week ", userProgram.currentWeek, ", Day ", userProgram.currentDay] }), _jsx("button", { onClick: () => navigate("/workouts"), className: "bg-[#246BFD] hover:bg-[#1a52cc] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg transition-all", children: "Start Now" })] }) })) : (_jsxs("div", { className: "rounded-2xl p-6 bg-gradient-to-br from-[#00CED1] via-[#87CEEB] to-[#FFB6D9] text-black relative overflow-hidden", children: [_jsx("h2", { className: "text-lg font-bold mb-1", children: "Today's Workout" }), _jsx("p", { className: "text-sm opacity-90 mb-6", children: "Choose a programme to begin your fitness journey" }), _jsx("button", { onClick: () => navigate("/programmes"), className: "bg-[#246BFD] hover:bg-[#1a52cc] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg transition-all", children: "Start Now" })] })), _jsxs("div", { onClick: () => navigate("/settings"), className: "bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4 flex justify-between items-center cursor-pointer hover:bg-[#2A2E38] transition-colors", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF9966] to-[#FF6B6B] flex items-center justify-center", children: _jsx(Scale, { size: 24, className: "text-white" }) }), _jsx("span", { className: "font-medium text-white", children: "Update Bodyweight" })] }), _jsx(ArrowRight, { size: 20, className: "text-white", strokeWidth: 1.5 })] }), _jsxs("div", { onClick: () => navigate("/metrics"), className: "bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4 flex justify-between items-center cursor-pointer hover:bg-[#2A2E38] transition-colors", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded-lg bg-gradient-to-br from-[#66BB6A] to-[#43A047] flex items-center justify-center", children: _jsx(Trophy, { size: 24, className: "text-white" }) }), _jsx("span", { className: "font-medium text-white", children: "New Bench Press PR!" })] }), _jsx(ArrowRight, { size: 20, className: "text-white", strokeWidth: 1.5 })] }), _jsxs("div", { onClick: () => navigate("/programmes"), className: "bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4 flex justify-between items-center cursor-pointer hover:bg-[#2A2E38] transition-colors", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded-lg bg-gradient-to-br from-[#DA70D6] to-[#C2185B] flex items-center justify-center", children: _jsx(ListTodo, { size: 24, className: "text-white" }) }), _jsx("span", { className: "font-medium text-white", children: "Plan your next programme" })] }), _jsx(ArrowRight, { size: 20, className: "text-white", strokeWidth: 1.5 })] })] })), activeTab === "performance" && (_jsxs("div", { className: "flex flex-col gap-6 mt-4", children: [userProgram && (_jsxs("div", { className: "rounded-xl px-6 py-8", style: { background: "#262A34" }, children: [_jsx("h3", { className: "text-[#5E6272] font-semibold text-lg mb-4", style: { fontFamily: "'Poppins', sans-serif" }, children: "Current Programme Progress" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-white", children: userProgram.programme.name }), _jsxs("span", { className: "text-[#246BFD] font-medium", children: ["Week ", userProgram.currentWeek, "/", userProgram.programme.weeks] })] }), _jsx("div", { className: "w-full bg-[#1A1D23] rounded-full h-2", children: _jsx("div", { className: "bg-[#246BFD] h-2 rounded-full transition-all duration-300", style: { width: `${calculateProgress(userProgram)}%` } }) }), _jsxs("div", { className: "flex justify-between text-sm text-[#5E6272]", children: [_jsxs("span", { children: ["Started: ", formatDate(userProgram.startDate)] }), _jsxs("span", { children: [calculateProgress(userProgram), "% complete"] })] })] })] })), _jsxs("div", { className: "rounded-xl px-6 py-8", style: { background: "#262A34" }, children: [_jsx("h3", { className: "text-[#5E6272] font-semibold text-sm mb-6", style: { fontFamily: "'Poppins', sans-serif" }, children: "Weekly Goal" }), loadingStats ? (_jsx("p", { className: "text-white text-sm", children: "Loading stats..." })) : weeklyStats ? (_jsxs("div", { className: "flex flex-col items-center", children: [_jsxs("div", { className: "relative w-40 h-40 mb-4", children: [_jsxs("svg", { className: "w-full h-full transform -rotate-90", children: [_jsx("circle", { cx: "80", cy: "80", r: "70", stroke: "#1A1D23", strokeWidth: "12", fill: "none" }), _jsx("circle", { cx: "80", cy: "80", r: "70", stroke: "url(#gradient)", strokeWidth: "12", fill: "none", strokeDasharray: `${2 *
                                                            Math.PI *
                                                            70 *
                                                            (weeklyStats.workoutsCompleted /
                                                                weeklyStats.workoutsTarget)} ${2 * Math.PI * 70}`, strokeLinecap: "round", className: "transition-all duration-500" }), _jsx("defs", { children: _jsxs("linearGradient", { id: "gradient", x1: "0%", y1: "0%", x2: "100%", y2: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "#00FFAD" }), _jsx("stop", { offset: "100%", stopColor: "#246BFD" })] }) })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [_jsx("span", { className: "text-4xl font-bold text-white", children: weeklyStats.workoutsCompleted }), _jsxs("span", { className: "text-sm text-[#5E6272]", children: ["/ ", weeklyStats.workoutsTarget] })] })] }), _jsxs("p", { className: "text-[#5E6272] text-center text-sm mt-4", children: ["You've completed ", weeklyStats.workoutsCompleted, "/", weeklyStats.workoutsTarget, " workouts for this week's plan. Well done!"] }), _jsx("button", { onClick: () => navigate("/programmes"), className: "mt-6 w-full bg-gradient-to-r from-[#DA70D6] to-[#C2185B] hover:from-[#C55CC4] hover:to-[#A8155C] text-white px-4 py-3 rounded-full text-sm font-medium transition-all", children: "See Full Programme" })] })) : (_jsx("p", { className: "text-white text-sm", children: "Start a programme to track your weekly goals" }))] }), _jsxs("div", { className: "rounded-xl px-6 py-8", style: { background: "#262A34" }, children: [_jsx("h3", { className: "text-[#5E6272] font-semibold text-sm mb-6", style: { fontFamily: "'Poppins', sans-serif" }, children: "Weight moved in the last 7 days" }), loadingStats ? (_jsx("p", { className: "text-white text-sm", children: "Loading stats..." })) : weeklyStats && weeklyStats.dailyStats.length > 0 ? (_jsxs("div", { children: [_jsx("div", { className: "flex items-end justify-between h-32 mb-4 gap-2", children: weeklyStats.dailyStats.map((day, index) => {
                                            const maxSets = Math.max(...weeklyStats.dailyStats.map((d) => d.sets), 1);
                                            const heightPercentage = (day.sets / maxSets) * 100;
                                            return (_jsxs("div", { className: "flex-1 flex flex-col items-center", children: [_jsx("div", { className: "w-full flex flex-col items-center justify-end h-full", children: day.sets > 0 && (_jsx("div", { className: "w-full bg-gradient-to-t from-[#9C6BFF] to-[#6A45FF] rounded-t transition-all duration-300 relative group", style: {
                                                                height: `${heightPercentage}%`,
                                                                minHeight: day.sets > 0 ? "8px" : "0",
                                                            }, children: _jsxs("div", { className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none", children: [day.sets, " sets", _jsx("br", {}), day.exercises, " exercises"] }) })) }), _jsx("p", { className: "text-[#5E6272] text-xs mt-2 font-medium", children: day.dayName.charAt(0) })] }, index));
                                        }) }), _jsxs("div", { className: "flex justify-center gap-6 pt-4 border-t border-[#1A1D23]", children: [_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-2xl font-bold text-white", children: weeklyStats.totalSets }), _jsx("p", { className: "text-xs text-[#5E6272]", children: "Sets" })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-2xl font-bold text-white", children: weeklyStats.totalExercises }), _jsx("p", { className: "text-xs text-[#5E6272]", children: "Exercises" })] })] })] })) : (_jsx("p", { className: "text-white text-sm", children: "No workout data for the last 7 days" }))] })] })), _jsx(BottomBar, { onLogout: handleLogout }), _jsx(InstallPrompt, { forceShow: true })] }));
}
