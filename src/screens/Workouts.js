import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import TopBar from "../components/TopBar";
import { MoreHorizontal, Calendar, Play, Pause, Check, Target, } from "lucide-react";
import MuscleIcon from "../components/MuscleIcon";
export default function Workouts() {
    // Timer state
    const [timerRunning, setTimerRunning] = useState(false);
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const intervalRef = useRef(null);
    // Programme state
    const [userProgram, setUserProgram] = useState(null);
    const [todayExercises, setTodayExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [savingWorkout, setSavingWorkout] = useState(false);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);
    const [workoutStartTime, setWorkoutStartTime] = useState(null);
    const [weeklySummary, setWeeklySummary] = useState(null);
    const [selectedExerciseId, setSelectedExerciseId] = useState(null);
    const [workoutCompleted, setWorkoutCompleted] = useState(false);
    const navigate = useNavigate();
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("installPromptDismissed");
        navigate("/login");
    };
    // Exercise menu state
    const [openExerciseMenu, setOpenExerciseMenu] = useState(null);
    // Set menu state (keyed by `${exerciseId}:${setIdx}`)
    const [openSetMenu, setOpenSetMenu] = useState(null);
    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target;
            // Check if the click is on a menu button or inside a dropdown menu
            const isMenuButton = target.closest('button[aria-haspopup="true"]');
            const isDropdownMenu = target.closest('.dropdown-menu');
            // Close menus if clicking outside both the buttons and the dropdown menus
            if (!isMenuButton && !isDropdownMenu) {
                setOpenExerciseMenu(null);
                setOpenSetMenu(null);
            }
        };
        if (openExerciseMenu || openSetMenu) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [openExerciseMenu, openSetMenu]);
    const moveExercise = (exerciseId, direction) => {
        setTodayExercises((prev) => {
            const idx = prev.findIndex((e) => e.exerciseId === exerciseId);
            if (idx === -1)
                return prev;
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= prev.length)
                return prev;
            const next = [...prev];
            const tmp = next[swapIdx];
            next[swapIdx] = next[idx];
            next[idx] = tmp;
            return next;
        });
        setOpenExerciseMenu(null);
    };
    const replaceExercise = async (exerciseId) => {
        const exercise = todayExercises.find((e) => e.exerciseId === exerciseId);
        if (!exercise)
            return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:4242/auth/exercises/random?focus=${encodeURIComponent(exercise.muscleGroup)}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok)
                throw new Error("Failed to fetch replacement exercise");
            const newEx = await res.json();
            setTodayExercises((prev) => prev.map((ex) => ex.exerciseId === exerciseId
                ? {
                    ...ex,
                    name: newEx.name,
                    exerciseId: newEx.id,
                    muscleGroup: newEx.muscleGroup || ex.muscleGroup,
                }
                : ex));
        }
        catch (err) {
            console.error("Replace exercise error:", err);
            alert("Failed to replace exercise");
        }
        finally {
            setOpenExerciseMenu(null);
        }
    };
    const addSetToExercise = (exerciseId) => {
        setTodayExercises((prev) => prev.map((ex) => ex.exerciseId === exerciseId
            ? {
                ...ex,
                workoutSets: [
                    ...ex.workoutSets,
                    { weight: "", reps: "", completed: false },
                ],
            }
            : ex));
        setOpenExerciseMenu(null);
    };
    const skipNextSet = (exerciseId) => {
        setTodayExercises((prev) => prev.map((ex) => {
            if (ex.exerciseId !== exerciseId)
                return ex;
            const idx = ex.workoutSets.findIndex((s) => !s.completed);
            if (idx === -1)
                return ex;
            const nextSets = ex.workoutSets.map((s, i) => i === idx ? { ...s, completed: true } : s);
            return { ...ex, workoutSets: nextSets };
        }));
        setOpenExerciseMenu(null);
    };
    const deleteExerciseById = (exerciseId) => {
        if (!confirm("Delete this exercise from the workout?"))
            return;
        setTodayExercises((prev) => prev.filter((ex) => ex.exerciseId !== exerciseId));
        setOpenExerciseMenu(null);
    };
    // Set-level actions
    const addSetBelow = (exerciseId, setIdx) => {
        setTodayExercises((prev) => prev.map((ex) => ex.exerciseId === exerciseId
            ? {
                ...ex,
                workoutSets: [
                    ...ex.workoutSets.slice(0, setIdx + 1),
                    { weight: "", reps: "", completed: false },
                    ...ex.workoutSets.slice(setIdx + 1),
                ],
            }
            : ex));
        setOpenSetMenu(null);
    };
    const skipSet = (exerciseId, setIdx) => {
        setTodayExercises((prev) => prev.map((ex) => ex.exerciseId === exerciseId
            ? {
                ...ex,
                workoutSets: ex.workoutSets.map((s, i) => i === setIdx ? { ...s, completed: true } : s),
            }
            : ex));
        setOpenSetMenu(null);
    };
    const deleteSet = (exerciseId, setIdx) => {
        if (!confirm("Delete this set?"))
            return;
        setTodayExercises((prev) => prev.map((ex) => ex.exerciseId === exerciseId
            ? {
                ...ex,
                workoutSets: ex.workoutSets.filter((_, i) => i !== setIdx),
            }
            : ex));
        setOpenSetMenu(null);
    };
    const calculateProgress = (userProgram) => {
        const totalDays = userProgram.programme.weeks * userProgram.programme.daysPerWeek;
        const completedDays = (userProgram.currentWeek - 1) * userProgram.programme.daysPerWeek +
            (userProgram.currentDay - 1);
        return Math.round((completedDays / totalDays) * 100);
    };
    const startTimer = () => {
        if (!timerRunning && !workoutStartTime) {
            setWorkoutStartTime(new Date());
        }
        setTimerRunning(true);
    };
    const pauseTimer = () => {
        setTimerRunning(false);
    };
    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const seconds = secs % 60;
        return `${mins.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;
    };
    const updateSetData = (exerciseId, setIndex, field, value) => {
        setTodayExercises((prev) => prev.map((exercise) => exercise.exerciseId === exerciseId
            ? {
                ...exercise,
                workoutSets: exercise.workoutSets.map((set, idx) => idx === setIndex ? { ...set, [field]: value } : set),
            }
            : exercise));
    };
    const toggleSetCompletion = (exerciseId, setIndex) => {
        setTodayExercises((prev) => prev.map((exercise) => exercise.exerciseId === exerciseId
            ? {
                ...exercise,
                workoutSets: exercise.workoutSets.map((set, idx) => idx === setIndex ? { ...set, completed: !set.completed } : set),
            }
            : exercise));
    };
    const addSet = (exerciseId) => {
        setTodayExercises((prev) => prev.map((exercise) => exercise.exerciseId === exerciseId
            ? {
                ...exercise,
                workoutSets: [
                    ...exercise.workoutSets,
                    {
                        weight: "",
                        reps: "",
                        completed: false,
                    },
                ],
            }
            : exercise));
    };
    const saveWorkout = async () => {
        if (!userProgram || !workoutStartTime) {
            setError("Cannot save workout - missing program or start time");
            return;
        }
        setSavingWorkout(true);
        try {
            const exercisesWithData = todayExercises.filter((exercise) => exercise.workoutSets.some((set) => set.completed && set.weight && set.reps));
            if (exercisesWithData.length === 0) {
                setError("Please complete at least one set before saving");
                setSavingWorkout(false);
                return;
            }
            const workoutData = exercisesWithData.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                sets: exercise.workoutSets
                    .filter((set) => set.completed && set.weight && set.reps)
                    .map((set) => ({
                    weight: parseFloat(set.weight),
                    reps: parseInt(set.reps),
                    completed: set.completed,
                })),
            }));
            const duration = Math.floor((new Date().getTime() - workoutStartTime.getTime()) / 1000 / 60);
            const response = await fetch("http://localhost:4242/auth/workouts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                    exercises: workoutData,
                    duration: duration,
                    notes: "",
                }),
            });
            if (!response.ok) {
                throw new Error("Failed to save workout");
            }
            const result = await response.json();
            // Show weekly summary if available, or mark as completed
            if (result.weeklySummary) {
                setWeeklySummary(result.weeklySummary);
                setWorkoutCompleted(true);
            }
            else {
                // Show completion screen with recommendations
                setWeeklySummary({
                    recommendations: result.recommendations,
                });
                setWorkoutCompleted(true);
            }
        }
        catch (err) {
            console.error("Error saving workout:", err);
            setError(err.message || "Failed to save workout");
        }
        finally {
            setSavingWorkout(false);
        }
    };
    const advanceToNextDay = async () => {
        try {
            const response = await fetch("http://localhost:4242/auth/workouts/complete-day", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            if (!response.ok) {
                throw new Error("Failed to advance to next day");
            }
            const result = await response.json();
            setUserProgram((prev) => prev
                ? {
                    ...prev,
                    currentWeek: result.currentWeek,
                    currentDay: result.currentDay,
                }
                : prev);
            setTimerRunning(false);
            setSecondsElapsed(0);
            setWorkoutStartTime(null);
            window.location.reload();
        }
        catch (err) {
            console.error("Error advancing to next day:", err);
            setError(err.message || "Failed to advance to next day");
        }
    };
    const getExerciseName = (exerciseId) => {
        const exercise = todayExercises.find((ex) => ex.exerciseId === exerciseId);
        return exercise ? exercise.name : "Unknown Exercise";
    };
    const loadProgressionRecommendations = async () => {
        if (!userProgram || todayExercises.length === 0)
            return;
        setLoadingRecommendations(true);
        try {
            const exerciseIds = todayExercises.map((ex) => ex.exerciseId);
            const response = await fetch(`http://localhost:4242/auth/workouts/recommendations?exerciseIds=${exerciseIds.join(",")}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            if (!response.ok) {
                throw new Error("Failed to load recommendations");
            }
            const result = await response.json();
            setTodayExercises((prev) => prev.map((exercise) => {
                const recommendation = result.recommendations.find((rec) => rec.exerciseId === exercise.exerciseId);
                return {
                    ...exercise,
                    recommendation,
                };
            }));
        }
        catch (err) {
            console.error("Error loading recommendations:", err);
        }
        finally {
            setLoadingRecommendations(false);
        }
    };
    useEffect(() => {
        const fetchUserProgram = async () => {
            try {
                setLoading(true);
                setError("");
                const response = await fetch("http://localhost:4242/auth/user-programs", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });
                if (!response.ok) {
                    throw new Error("Failed to fetch user program");
                }
                const userPrograms = await response.json();
                const activeProgram = userPrograms.find((up) => up.status === "ACTIVE") ||
                    userPrograms[0];
                if (!activeProgram) {
                    setError("No active programme found. Please select a programme first.");
                    setLoading(false);
                    return;
                }
                const programmeResponse = await fetch(`http://localhost:4242/auth/programmes/${activeProgram.programmeId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });
                if (!programmeResponse.ok) {
                    throw new Error("Failed to fetch programme details");
                }
                const programmeData = await programmeResponse.json();
                const fullUserProgram = {
                    ...activeProgram,
                    programme: programmeData,
                };
                setUserProgram(fullUserProgram);
                if (!programmeData.exercises || programmeData.exercises.length === 0) {
                    setError("This programme has no exercises configured. Please add exercises in the Programme Editor.");
                    setLoading(false);
                    return;
                }
                const currentDayExercises = programmeData.exercises.filter((exercise) => exercise.dayNumber === activeProgram.currentDay);
                if (currentDayExercises.length === 0) {
                    setError(`No exercises scheduled for Day ${activeProgram.currentDay}. Please add exercises in the Programme Editor.`);
                    setLoading(false);
                    return;
                }
                const workoutExercises = currentDayExercises.map((exercise) => {
                    const initialSets = Array.from({ length: exercise.sets }, () => ({
                        weight: "",
                        reps: "",
                        completed: false,
                    }));
                    return {
                        id: exercise.id,
                        name: exercise.exercise.name,
                        muscleGroup: exercise.exercise.muscleGroup,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        exerciseId: exercise.exercise.id,
                        workoutSets: initialSets,
                    };
                });
                setTodayExercises(workoutExercises);
            }
            catch (err) {
                console.error("Error fetching user program:", err);
                setError(err.message || "Failed to load workout programme");
            }
            finally {
                setLoading(false);
            }
        };
        fetchUserProgram();
    }, []);
    useEffect(() => {
        if (userProgram && todayExercises.length > 0) {
            loadProgressionRecommendations();
        }
    }, [userProgram?.currentDay]);
    useEffect(() => {
        if (timerRunning) {
            intervalRef.current = setInterval(() => {
                setSecondsElapsed((prev) => prev + 1);
            }, 1000);
        }
        else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        return () => {
            if (intervalRef.current)
                clearInterval(intervalRef.current);
        };
    }, [timerRunning]);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen text-[#5E6272] flex flex-col p-4 pb-16 justify-center items-center", style: {
                backgroundColor: "#0A0E1A",
            }, children: _jsx("p", { className: "text-white text-center", children: "Loading your workout programme..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "min-h-screen text-[#5E6272] flex flex-col p-4 pb-16", style: {
                backgroundColor: "#0A0E1A",
            }, children: _jsxs("div", { className: "flex-1 flex flex-col justify-center items-center", children: [_jsx("div", { className: "bg-red-900/20 border border-red-500/50 rounded-lg px-6 py-4 mb-4 max-w-md", children: _jsx("p", { className: "text-red-400 text-sm text-center", children: error }) }), _jsx("button", { onClick: () => (window.location.href = "/programmes"), className: "px-6 py-3 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium", children: "Go to Programmes" })] }) }));
    }
    return (_jsxs("div", { className: "min-h-screen text-[#5E6272] flex flex-col p-4 pb-16", style: {
            backgroundColor: "#0A0E1A",
        }, children: [_jsx(TopBar, { title: "Workouts", pageIcon: _jsx(Calendar, { size: 18 }), menuItems: [
                    { label: "Dashboard", onClick: () => navigate("/") },
                    { label: "Programmes", onClick: () => navigate("/programmes") },
                    { label: "Track Metrics", onClick: () => navigate("/metrics") },
                    { label: "Settings", onClick: () => navigate("/settings") },
                ] }), _jsxs("div", { className: "text-center mt-2", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: userProgram?.programme.name || "Loading..." }), userProgram?.programme.description && (_jsx("p", { className: "text-sm text-[#5E6272] mt-1", children: userProgram.programme.description })), _jsx("p", { className: "text-xs text-[#FBA3FF] mt-1", children: userProgram?.programme.bodyPartFocus })] }), _jsxs("div", { className: "flex justify-center items-center gap-2 mt-1 text-sm text-[#A0AEC0]", children: [_jsxs("span", { className: "uppercase text-xs tracking-wide", children: ["Week ", userProgram?.currentWeek || 1, ", Day", " ", userProgram?.currentDay || 1] }), !timerRunning && secondsElapsed === 0 ? (_jsxs("button", { onClick: startTimer, className: "flex items-center gap-1 text-[#86FF99] font-medium cursor-pointer", "aria-label": "Start Workout Timer", children: [_jsx(Play, { size: 14 }), " Start Workout Timer"] })) : (_jsxs("div", { className: "flex items-center gap-2 rounded-full select-none", children: [timerRunning ? (_jsx("button", { onClick: pauseTimer, className: "bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-full p-1 flex items-center justify-center", "aria-label": "Pause Workout Timer", children: _jsx(Pause, { size: 16 }) })) : (_jsx("button", { onClick: startTimer, className: "bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-full p-1 flex items-center justify-center", "aria-label": "Resume Workout Timer", children: _jsx(Play, { size: 16 }) })), _jsx("span", { className: "tracking-wide font-inter text-sm", style: { color: "#5E6272" }, children: formatTime(secondsElapsed) })] }))] }), workoutStartTime && (_jsx("div", { className: "flex justify-center mt-4", children: _jsxs("button", { onClick: saveWorkout, disabled: savingWorkout, className: `px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${savingWorkout
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-[#00FFAD] hover:bg-[#00E599] text-black"}`, children: [_jsx(Check, { size: 16 }), savingWorkout ? "Saving..." : "Complete Workout"] }) })), _jsxs("div", { className: "px-4 mt-6 space-y-4", children: [_jsxs("h3", { className: "text-sm text-white font-semibold tracking-widest uppercase text-center", children: ["Today's Workout - Day ", userProgram?.currentDay] }), todayExercises.length > 0 ? (todayExercises.map((exercise, index) => (_jsxs("div", { className: `rounded-xl p-4 ${selectedExerciseId === exercise.exerciseId
                            ? "border-2 border-blue-500"
                            : "border border-[#2F3544]"} bg-[#1C1F26]`, children: [_jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(MuscleIcon, { muscleGroup: exercise.muscleGroup, size: 28 }), _jsxs("div", { children: [_jsx("h4", { className: "text-white font-semibold text-base", children: exercise.name }), _jsxs("div", { className: "flex text-sm gap-2 mt-1", children: [_jsxs("span", { className: "text-green-400", children: [exercise.sets, " Working Set", exercise.sets !== 1 ? "s" : ""] }), _jsx("span", { className: "text-pink-400", children: exercise.muscleGroup })] })] })] }), exercise.recommendation && (_jsxs("div", { className: "mt-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg", children: [_jsxs("div", { className: "flex items-center gap-1 mb-1", children: [_jsx(Target, { size: 12, className: "text-blue-400" }), _jsx("span", { className: "text-xs text-blue-400 font-semibold", children: "Recommended Target" })] }), _jsxs("p", { className: "text-xs text-blue-300", children: [exercise.recommendation.recommendedWeight, "kg \u00D7", " ", exercise.recommendation.recommendedReps, " reps", exercise.recommendation.recommendedRPE && (_jsxs("span", { className: "ml-2 text-purple-300", children: ["\u2022 RPE ", exercise.recommendation.recommendedRPE] }))] }), _jsx("p", { className: "text-xs text-blue-200 mt-1", children: exercise.recommendation.reasoning })] }))] }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => setOpenExerciseMenu((s) => s === exercise.exerciseId ? null : exercise.exerciseId), className: "text-white p-1", "aria-haspopup": true, "aria-expanded": openExerciseMenu === exercise.exerciseId, children: _jsx(MoreHorizontal, {}) }), openExerciseMenu === exercise.exerciseId && (_jsxs("div", { className: "dropdown-menu absolute right-0 mt-2 w-56 bg-[#1A1D23] border border-[#2F3544] rounded-lg shadow-lg z-50", children: [_jsx("div", { className: "px-3 py-2 text-xs text-[#9CA3AF] font-semibold", children: "EXERCISE" }), _jsx("button", { disabled: index === 0, className: `w-full text-left px-3 py-2 text-sm ${index === 0
                                                            ? "text-[#4B5563] cursor-not-allowed"
                                                            : "hover:bg-[#2A2E38] text-white"}`, onClick: () => moveExercise(exercise.exerciseId, "up"), children: "Move Exercise Up" }), _jsx("button", { disabled: index === todayExercises.length - 1, className: `w-full text-left px-3 py-2 text-sm ${index === todayExercises.length - 1
                                                            ? "text-[#4B5563] cursor-not-allowed"
                                                            : "hover:bg-[#2A2E38] text-white"}`, onClick: () => moveExercise(exercise.exerciseId, "down"), children: "Move Exercise Down" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => replaceExercise(exercise.exerciseId), children: "Replace Exercise" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => addSetToExercise(exercise.exerciseId), children: "Add Set" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => skipNextSet(exercise.exerciseId), children: "Skip Set" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-red-500 text-sm", onClick: () => deleteExerciseById(exercise.exerciseId), children: "Delete Exercise" })] }))] })] }), exercise.workoutSets.map((set, setIdx) => (_jsxs("div", { className: "flex items-center gap-2 mt-3", children: [_jsx("div", { className: "relative", children: (() => {
                                            const key = `${exercise.exerciseId}:${setIdx}`;
                                            return (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setOpenSetMenu((s) => (s === key ? null : key)), className: "w-4 text-[#9CA3AF] p-0", "aria-haspopup": true, "aria-expanded": openSetMenu === key, children: "\u22EE" }), openSetMenu === key && (_jsxs("div", { className: "dropdown-menu absolute left-8 w-44 mt-2 bg-[#1A1D23] border border-[#2F3544] rounded-lg shadow-lg z-50", children: [_jsx("div", { className: "px-3 py-2 text-xs text-[#9CA3AF] font-semibold", children: "SET" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => addSetBelow(exercise.exerciseId, setIdx), children: "Add Set Below" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => skipSet(exercise.exerciseId, setIdx), children: "Skip Set" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-red-500 text-sm", onClick: () => deleteSet(exercise.exerciseId, setIdx), children: "Delete Set" })] }))] }));
                                        })() }), _jsx("input", { type: "number", placeholder: "Weight (kg)", value: set.weight, onChange: (e) => {
                                            setSelectedExerciseId(exercise.exerciseId);
                                            updateSetData(exercise.exerciseId, setIdx, "weight", e.target.value);
                                        }, onFocus: () => setSelectedExerciseId(exercise.exerciseId), className: "bg-[#2A2E38] text-white rounded-md px-2 py-1 w-2/5 placeholder:text-[#5E6272] text-sm", style: { MozAppearance: "textfield" }, inputMode: "decimal" }), _jsx("input", { type: "number", placeholder: "Reps", value: set.reps, onChange: (e) => {
                                            setSelectedExerciseId(exercise.exerciseId);
                                            updateSetData(exercise.exerciseId, setIdx, "reps", e.target.value);
                                        }, onFocus: () => setSelectedExerciseId(exercise.exerciseId), className: "bg-[#2A2E38] text-white rounded-md px-2 py-1 w-2/5 placeholder:text-[#5E6272] text-sm", style: { MozAppearance: "textfield" }, inputMode: "numeric" }), _jsx("button", { onClick: () => toggleSetCompletion(exercise.exerciseId, setIdx), className: `rounded-full p-1 transition-colors ${set.completed
                                            ? "bg-green-600 hover:bg-green-700"
                                            : "bg-[#262A34] hover:bg-[#3a3f4a]"}`, children: _jsx("div", { className: `w-4 h-4 rounded-full flex items-center justify-center ${set.completed
                                                ? "bg-white text-green-600"
                                                : "bg-[#5E6272]"}`, children: set.completed && _jsx(Check, { size: 10 }) }) })] }, setIdx))), _jsx("div", { className: "mt-4 flex justify-center", children: _jsxs("button", { onClick: () => addSet(exercise.exerciseId), className: "flex items-center gap-2 text-sm font-medium text-white bg-[#2A2E38] hover:bg-[#3a3f4a] px-4 py-1.5 rounded-full", children: ["Add Set", " ", _jsx("span", { className: "text-green-400 text-lg leading-none", children: "+" })] }) })] }, exercise.id)))) : (_jsxs("div", { className: "text-center py-8 text-[#5E6272]", children: [_jsx("p", { children: "No exercises scheduled for today" }), _jsx("button", { onClick: () => (window.location.href = "/programmes"), className: "mt-4 px-6 py-3 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium", children: "Select a Programme" })] }))] }), workoutCompleted && weeklySummary && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-[#1C1F26] rounded-2xl p-8 w-full max-w-md border border-[#2F3544] max-h-[90vh] overflow-y-auto", children: [_jsx("h2", { className: "text-white text-2xl font-bold text-center mb-6", children: "Congratulations on completing this workout!" }), _jsxs("div", { className: "space-y-4 mb-6", children: [weeklySummary.strengthGainVsLastWeek !== null && (_jsxs("div", { className: "p-4 rounded-lg bg-[#2A2E38] border border-[#00FFAD]/30", children: [_jsx("p", { className: "text-[#5E6272] text-sm mb-1", children: "Week-over-week" }), _jsxs("p", { className: "text-white font-semibold", children: ["You are", " ", _jsxs("span", { className: weeklySummary.strengthGainVsLastWeek > 0
                                                        ? "text-[#86FF99]"
                                                        : "text-red-400", children: [Math.abs(weeklySummary.strengthGainVsLastWeek), "%", " ", weeklySummary.strengthGainVsLastWeek > 0
                                                            ? "stronger"
                                                            : "weaker"] }), " ", "this week compared to last week"] })] })), weeklySummary.strengthGainVsProgramStart !== null && (_jsxs("div", { className: "p-4 rounded-lg bg-[#2A2E38] border border-[#246BFD]/30", children: [_jsx("p", { className: "text-[#5E6272] text-sm mb-1", children: "Since programme start" }), _jsxs("p", { className: "text-white font-semibold", children: ["You are", " ", _jsxs("span", { className: "text-[#246BFD]", children: [weeklySummary.strengthGainVsProgramStart, "%"] }), " ", "stronger than when you started this programme"] })] })), weeklySummary.newRepMaxes &&
                                    weeklySummary.newRepMaxes.length > 0 && (_jsxs("div", { className: "p-4 rounded-lg bg-[#2A2E38] border border-[#FBA3FF]/30", children: [_jsx("p", { className: "text-[#FBA3FF] font-semibold mb-2", children: "\uD83C\uDF89 New Rep Maxes!" }), weeklySummary.newRepMaxes.map((pr, idx) => (_jsxs("p", { className: "text-white text-sm", children: ["\u2022 ", pr.exerciseName, ": ", pr.reps, " reps"] }, idx)))] })), weeklySummary.recommendations &&
                                    weeklySummary.recommendations.length > 0 && (_jsxs("div", { className: "p-4 rounded-lg bg-[#2A2E38] border border-[#246BFD]/30", children: [_jsx("p", { className: "text-[#246BFD] font-semibold mb-2", children: "Next Session Recommendations" }), weeklySummary.recommendations.map((rec, idx) => (_jsxs("div", { className: "text-white text-sm mb-2 last:mb-0", children: [_jsx("p", { className: "font-medium", children: getExerciseName(rec.exerciseId) }), _jsxs("p", { className: "text-[#5E6272] text-xs", children: [rec.recommendedWeight, "kg \u00D7 ", rec.recommendedReps, " ", "reps (RPE ", rec.recommendedRPE, ")"] }), _jsx("p", { className: "text-[#5E6272] text-xs", children: rec.reasoning })] }, idx)))] }))] }), _jsx("button", { onClick: () => {
                                setWeeklySummary(null);
                                setWorkoutCompleted(false);
                                advanceToNextDay();
                            }, className: "w-full bg-[#86FF99] hover:bg-[#6bd664] text-black font-semibold py-3 rounded-lg transition-colors", children: "Continue to Next Workout" })] }) })), _jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');

        .font-inter {
          font-family: 'Inter', sans-serif;
        }

        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        
        input[type=number] {
          -moz-appearance: textfield;
        }
      ` }), _jsx(BottomBar, { onLogout: handleLogout })] }));
}
