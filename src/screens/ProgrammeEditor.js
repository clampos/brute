import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, ChevronDown, ChevronRight, Check, X, Save, } from "lucide-react";
import MuscleIcon from "../components/MuscleIcon";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
export default function ProgrammeEditor() {
    const { programmeId } = useParams();
    const navigate = useNavigate();
    const [displayName, setDisplayName] = useState("Loading...");
    const [bodyFocus, setBodyFocus] = useState("Full Body");
    const [description, setDescription] = useState("");
    const [days, setDays] = useState([]);
    const [openDays, setOpenDays] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [allExercises, setAllExercises] = useState([]);
    const [savingDay, setSavingDay] = useState(null);
    const [submittingProgramme, setSubmittingProgramme] = useState(false);
    const [confirmedExerciseId, setConfirmedExerciseId] = useState(null);
    const [exerciseSearch, setExerciseSearch] = useState({});
    const toggleDay = (dayNumber) => {
        setOpenDays((prev) => ({
            ...prev,
            [dayNumber]: !prev[dayNumber],
        }));
    };
    // Get 3 random exercises for initial display
    const getRandomExercises = (exercises, count = 3) => {
        const shuffled = [...exercises].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    };
    // Load initial exercise options for a day (only 3)
    const loadInitialExerciseOptions = async (dayNumber) => {
        try {
            const muscleGroups = getMuscleGroupsForFocus(bodyFocus);
            const exercisePromises = muscleGroups.map((group) => fetchAvailableExercises(group));
            const exerciseArrays = await Promise.all(exercisePromises);
            const fetchedExercises = exerciseArrays.flat();
            // Remove duplicates based on exercise ID
            const uniqueExercises = fetchedExercises.filter((exercise, index, self) => index === self.findIndex((e) => e.id === exercise.id));
            // Get only 3 random exercises for initial display
            const initialOptions = getRandomExercises(uniqueExercises, 3);
            setDays((prevDays) => prevDays.map((day) => day.dayNumber === dayNumber
                ? {
                    ...day,
                    exerciseOptions: initialOptions.map((ex) => ({
                        ...ex,
                        isSelected: day.exercises.some((existing) => existing.exerciseId === ex.id),
                    })),
                    availableExercises: uniqueExercises.map((ex) => ({
                        ...ex,
                        isSelected: day.exercises.some((existing) => existing.exerciseId === ex.id),
                    })),
                }
                : day));
            setAllExercises(uniqueExercises);
        }
        catch (err) {
            console.error("Error loading initial exercise options:", err);
            setError("Failed to load exercise options");
        }
    };
    const toggleAvailableExercises = async (dayNumber) => {
        const currentDay = days.find((d) => d.dayNumber === dayNumber);
        if (!currentDay)
            return;
        const isCurrentlyShowing = currentDay.showMoreOptions || false;
        if (!isCurrentlyShowing) {
            // show the panel immediately so users see a loading state
            setDays((prevDays) => prevDays.map((day) => day.dayNumber === dayNumber
                ? { ...day, showMoreOptions: true, loadingAvailable: true }
                : day));
            // fetch full list and update the day when ready
            await fetchAndUpdateAvailableExercises(dayNumber);
        }
        else {
            // hide
            setDays((prevDays) => prevDays.map((day) => day.dayNumber === dayNumber ? { ...day, showMoreOptions: false } : day));
        }
    };
    const fetchAndUpdateAvailableExercises = async (dayNumber) => {
        try {
            const muscleGroups = getMuscleGroupsForFocus(bodyFocus);
            console.debug(`[ProgrammeEditor] fetchAndUpdateAvailableExercises called for day=${dayNumber}, bodyFocus='${bodyFocus}', groups=${JSON.stringify(muscleGroups)}`);
            const exercisePromises = muscleGroups.map((group) => fetchAvailableExercises(group));
            const exerciseArrays = await Promise.all(exercisePromises);
            console.debug(`[ProgrammeEditor] fetch arrays lengths: ${exerciseArrays
                .map((a) => (Array.isArray(a) ? a.length : 0))
                .join(",")}`);
            const fetchedExercises = exerciseArrays.flat();
            // Remove duplicates based on exercise ID
            const uniqueExercises = fetchedExercises.filter((exercise, index, self) => index === self.findIndex((e) => e.id === exercise.id));
            setAllExercises(uniqueExercises);
            setDays((prevDays) => prevDays.map((day) => day.dayNumber === dayNumber
                ? {
                    ...day,
                    availableExercises: uniqueExercises.map((ex) => ({
                        ...ex,
                        isSelected: day.exercises.some((existing) => existing.exerciseId === ex.id),
                    })),
                    loadingAvailable: false,
                }
                : day));
        }
        catch (err) {
            console.error("Error fetching available exercises:", err);
            setError("Failed to load available exercises");
        }
    };
    // Group exercises by muscle group
    const groupExercisesByMuscleGroup = (exercises) => {
        return exercises.reduce((acc, exercise) => {
            const group = exercise.muscleGroup || "Other";
            if (!acc[group]) {
                acc[group] = [];
            }
            acc[group].push(exercise);
            return acc;
        }, {});
    };
    // Filter exercises by search term (name or muscle group)
    const filterExercisesBySearch = (exercises, searchTerm) => {
        if (!searchTerm.trim())
            return exercises;
        const lower = searchTerm.toLowerCase();
        return exercises.filter((ex) => ex.name.toLowerCase().includes(lower) ||
            ex.muscleGroup.toLowerCase().includes(lower) ||
            (ex.category && ex.category.toLowerCase().includes(lower)) ||
            (ex.equipment && ex.equipment.toLowerCase().includes(lower)));
    };
    // Fetch all exercises based on body focus
    const fetchAvailableExercises = async (focus) => {
        try {
            const url = `http://localhost:4242/auth/exercises?muscleGroup=${encodeURIComponent(focus)}`;
            console.debug(`[ProgrammeEditor] fetching exercises -> ${url}`);
            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            console.debug(`[ProgrammeEditor] fetch status: ${res.status} ${res.statusText}`);
            if (!res.ok) {
                // try to read body for debug (may be small)
                let bodyText = "";
                try {
                    bodyText = await res.text();
                }
                catch (e) {
                    /* ignore */
                }
                console.error("Failed to fetch exercises:", res.status, bodyText);
                return [];
            }
            const exercises = await res.json();
            console.debug(`[ProgrammeEditor] fetched ${Array.isArray(exercises) ? exercises.length : 0} exercises for focus='${focus}'`);
            return exercises || [];
        }
        catch (err) {
            console.error("Error fetching exercises:", err);
            return [];
        }
    };
    const handleAddExercise = (exerciseId, dayNumber) => {
        const exercise = allExercises.find((ex) => ex.id === exerciseId);
        if (!exercise)
            return;
        // Create temporary programme exercise object
        const tempProgrammeExercise = {
            id: `temp-${Date.now()}-${exerciseId}`, // Temporary ID
            name: exercise.name,
            sets: 3,
            reps: "8-12",
            exerciseId: exercise.id,
            isSelected: true,
        };
        setDays((prevDays) => prevDays.map((day) => day.dayNumber === dayNumber
            ? {
                ...day,
                exercises: [...day.exercises, tempProgrammeExercise],
                exerciseOptions: day.exerciseOptions.map((ex) => ex.id === exerciseId ? { ...ex, isSelected: true } : ex),
                availableExercises: day.availableExercises.map((ex) => ex.id === exerciseId ? { ...ex, isSelected: true } : ex),
                hasChanges: true,
            }
            : day));
    };
    const handleRemoveExercise = (programmeExerciseId, exerciseId, dayNumber) => {
        setDays((prev) => prev.map((day) => day.dayNumber === dayNumber
            ? {
                ...day,
                exercises: day.exercises.filter((ex) => ex.id !== programmeExerciseId),
                exerciseOptions: day.exerciseOptions.map((ex) => ex.id === exerciseId ? { ...ex, isSelected: false } : ex),
                availableExercises: day.availableExercises.map((ex) => ex.id === exerciseId ? { ...ex, isSelected: false } : ex),
                hasChanges: true,
            }
            : day));
    };
    const handleConfirmDay = async (dayNumber) => {
        setSavingDay(dayNumber);
        try {
            const day = days.find((d) => d.dayNumber === dayNumber);
            if (!day)
                return;
            console.log(`🔍 Confirming Day ${dayNumber}`);
            console.log(`📊 Current exercises in state:`, day.exercises);
            console.log(`📊 Exercises to save:`, day.exercises.filter((ex) => ex.isSelected));
            // First, delete ALL existing exercises for this day from the database
            const deleteRes = await fetch(`http://localhost:4242/auth/programmes/${programmeId}/exercises/day/${dayNumber}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            if (!deleteRes.ok) {
                console.error("Failed to delete existing exercises");
            }
            // Then add ONLY the exercises currently in the day.exercises array
            const exercisesToAdd = day.exercises.filter((ex) => ex.isSelected);
            const addedExercises = [];
            console.log(`✅ Adding ${exercisesToAdd.length} exercises to Day ${dayNumber}`);
            for (const exercise of exercisesToAdd) {
                const postRes = await fetch(`http://localhost:4242/auth/programmes/${programmeId}/exercises`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                    body: JSON.stringify({
                        exerciseId: exercise.exerciseId,
                        dayNumber,
                        sets: exercise.sets,
                        reps: exercise.reps,
                    }),
                });
                if (!postRes.ok) {
                    throw new Error("Failed to add exercise");
                }
                const newProgrammeExercise = await postRes.json();
                console.log(`✅ Added exercise:`, newProgrammeExercise);
                addedExercises.push({
                    id: newProgrammeExercise.id,
                    name: exercise.name,
                    sets: newProgrammeExercise.sets,
                    reps: newProgrammeExercise.reps,
                    exerciseId: exercise.exerciseId,
                    isSelected: true,
                });
            }
            console.log(`✅ Final saved exercises for Day ${dayNumber}:`, addedExercises);
            // Update the day with real IDs and mark as saved
            setDays((prevDays) => prevDays.map((day) => day.dayNumber === dayNumber
                ? {
                    ...day,
                    exercises: addedExercises,
                    hasChanges: false,
                    showMoreOptions: false,
                }
                : day));
            alert(`Day ${dayNumber} saved with ${addedExercises.length} exercises!`);
        }
        catch (err) {
            console.error("Error confirming day:", err);
            setError("Failed to save exercises for this day");
        }
        finally {
            setSavingDay(null);
        }
    };
    const handleSubmitProgramme = () => {
        // Check if there are any unsaved changes
        const hasUnsavedChanges = days.some((day) => day.hasChanges);
        if (hasUnsavedChanges) {
            setError("Please confirm all days before going back");
            return;
        }
        // Check if programme has any exercises
        const totalExercises = days.reduce((sum, day) => sum + day.exercises.length, 0);
        if (totalExercises === 0) {
            setError("Please add at least one exercise to at least one day");
            return;
        }
        // Simply navigate back to programmes page
        // The actual "Start" happens in Programmes.tsx
        navigate("/programmes");
    };
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("installPromptDismissed");
        navigate("/login");
    };
    // Get muscle groups to focus on based on body part focus
    const getMuscleGroupsForFocus = (focus) => {
        // Map high-level focuses to the actual muscleGroup values present in the DB seed
        switch (focus.toLowerCase()) {
            case "full body":
                return [
                    "Chest",
                    "Lats",
                    "Middle Back",
                    "Lower Back",
                    "Shoulders",
                    "Quadriceps",
                    "Hamstrings",
                    "Glutes",
                    "Biceps",
                    "Triceps",
                    "Forearms",
                    "Calves",
                    "Abdominals",
                    "Adductors",
                    "Abductors",
                ];
            case "upper body":
                return [
                    "Chest",
                    "Lats",
                    "Middle Back",
                    "Shoulders",
                    "Biceps",
                    "Triceps",
                    "Forearms",
                    "Traps",
                ];
            case "lower body":
                return [
                    "Quadriceps",
                    "Hamstrings",
                    "Glutes",
                    "Calves",
                    "Adductors",
                    "Abductors",
                    "Lower Back",
                ];
            case "push":
                return ["Chest", "Shoulders", "Triceps"];
            case "pull":
                return ["Lats", "Middle Back", "Lower Back", "Biceps"];
            case "legs":
                return ["Quadriceps", "Hamstrings", "Glutes", "Calves"];
            default:
                return [focus];
        }
    };
    // Load programme data
    useEffect(() => {
        const fetchProgramme = async () => {
            if (!programmeId)
                return;
            try {
                setLoading(true);
                setError("");
                const res = await fetch(`http://localhost:4242/auth/programmes/${programmeId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });
                const data = await res.json();
                if (!res.ok)
                    throw new Error(data.error || "Failed to fetch programme");
                setDisplayName(data.name);
                setDescription(data.description || "");
                setBodyFocus(data.bodyPartFocus || "Full Body");
                // Group current programme exercises by day
                const grouped = {};
                data.exercises?.forEach((item) => {
                    const day = item.dayNumber ?? 1;
                    if (!grouped[day])
                        grouped[day] = [];
                    const programmeExercise = {
                        id: item.id,
                        name: item.exercise?.name || "Unnamed",
                        sets: item.sets ?? 3,
                        reps: item.reps ?? "8-12",
                        exerciseId: item.exercise?.id || item.exerciseId,
                        isSelected: true,
                    };
                    grouped[day].push(programmeExercise);
                });
                // Create days array
                const daysPerWeek = data.daysPerWeek || 3;
                const loadedDays = [];
                for (let i = 1; i <= daysPerWeek; i++) {
                    loadedDays.push({
                        dayNumber: i,
                        exercises: grouped[i] || [],
                        availableExercises: [],
                        exerciseOptions: [],
                        showAvailable: false,
                        showMoreOptions: false,
                        loadingAvailable: false,
                        hasChanges: false,
                    });
                }
                setDays(loadedDays);
                setOpenDays(Object.fromEntries(loadedDays.map((d) => [d.dayNumber, true])));
                // Fetch a single pool of available exercises for the programme focus
                try {
                    const focus = data.bodyPartFocus || "Full Body";
                    // Fetch across likely muscle groups for this focus (more robust than a single-focus fetch)
                    const groups = getMuscleGroupsForFocus(focus);
                    const arrays = await Promise.all(groups.map((g) => fetchAvailableExercises(g)));
                    let pool = arrays.flat();
                    // Fallback: if nothing found, try the raw focus string (legacy behaviour)
                    if (pool.length === 0) {
                        console.debug(`[ProgrammeEditor] initial pool empty for focus='${focus}', groups=${JSON.stringify(groups)}; trying raw focus fallback`);
                        pool = await fetchAvailableExercises(focus);
                    }
                    // Remove duplicates
                    const uniquePool = pool.filter((exercise, index, self) => index === self.findIndex((e) => e.id === exercise.id));
                    console.debug(`[ProgrammeEditor] initial uniquePool size=${uniquePool.length} for focus='${focus}'`);
                    setAllExercises(uniquePool);
                    // For each day with no existing exercises, pick 3 random selected exercises
                    const withInitialSelections = loadedDays.map((day) => {
                        if (!day.exercises || day.exercises.length === 0) {
                            const selected = getRandomExercises(uniquePool, 3).map((ex) => ({
                                id: `temp-${Date.now()}-${ex.id}-${Math.floor(Math.random() * 1000)}`,
                                name: ex.name,
                                sets: 3,
                                reps: "8-12",
                                exerciseId: ex.id,
                                isSelected: true,
                            }));
                            const selectedIds = new Set(selected.map((s) => s.exerciseId));
                            return {
                                ...day,
                                exercises: selected,
                                availableExercises: uniquePool.map((ex) => ({
                                    ...ex,
                                    isSelected: selectedIds.has(ex.id),
                                })),
                                exerciseOptions: [], // do not show recommended list beneath
                                showMoreOptions: false,
                            };
                        }
                        // If the day already has exercises, still provide the available pool
                        return {
                            ...day,
                            availableExercises: uniquePool.map((ex) => ({
                                ...ex,
                                isSelected: day.exercises.some((existing) => existing.exerciseId === ex.id),
                            })),
                            exerciseOptions: [],
                        };
                    });
                    setDays(withInitialSelections);
                    setOpenDays(Object.fromEntries(withInitialSelections.map((d) => [d.dayNumber, true])));
                }
                catch (err) {
                    console.error("Error loading initial exercise pool:", err);
                    // fallback: keep loadedDays as-is
                    setDays(loadedDays);
                    setOpenDays(Object.fromEntries(loadedDays.map((d) => [d.dayNumber, true])));
                }
            }
            catch (err) {
                console.error("Error loading programme:", err);
                setError(err.message || "Unknown error occurred");
            }
            finally {
                setLoading(false);
            }
        };
        fetchProgramme();
    }, [programmeId]);
    // Check if programme is ready to submit (no unsaved changes)
    const isReadyToSubmit = days.length > 0 && !days.some((day) => day.hasChanges);
    return (_jsxs("div", { className: "min-h-screen text-[#5E6272] flex flex-col p-4 pb-16", style: {
            backgroundColor: "#0A0E1A",
        }, children: [_jsx(TopBar, { title: "Programmes", pageIcon: null, menuItems: [
                    { label: "Dashboard", onClick: () => navigate("/") },
                    { label: "Programmes", onClick: () => navigate("/programmes") },
                    { label: "Workouts", onClick: () => navigate("/workouts") },
                    { label: "Track Metrics", onClick: () => navigate("/metrics") },
                    { label: "Settings", onClick: () => navigate("/settings") },
                ] }), _jsxs("div", { className: "mt-6 mb-4 text-center", children: [_jsx("h3", { className: "text-white text-xl font-semibold", children: displayName }), _jsx("p", { className: "text-sm text-[#5E6272]", children: description }), _jsx("p", { className: "text-xs text-[#FBA3FF] mt-1", children: bodyFocus })] }), error && (_jsx("div", { className: "bg-red-900/20 border border-red-500/50 rounded-lg px-4 py-2 mb-4", children: _jsx("p", { className: "text-red-400 text-sm", children: error }) })), !loading && (_jsx("div", { className: "mb-6 flex justify-center", children: _jsxs("button", { onClick: handleSubmitProgramme, disabled: submittingProgramme || !isReadyToSubmit, className: `px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${submittingProgramme || !isReadyToSubmit
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-[#00FFAD] hover:bg-[#00E599] text-black"}`, children: [_jsx(Save, { size: 16 }), submittingProgramme
                            ? "Saving..."
                            : isReadyToSubmit
                                ? "Done Editing"
                                : "Confirm All Days First"] }) })), loading ? (_jsx("p", { className: "text-white text-center", children: "Loading..." })) : (_jsx("div", { className: "space-y-8", children: days.map((day) => {
                    const isOpen = openDays[day.dayNumber];
                    const isSaving = savingDay === day.dayNumber;
                    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 cursor-pointer", onClick: () => toggleDay(day.dayNumber), children: [isOpen ? (_jsx(ChevronDown, { className: "text-green-500 w-4 h-4" })) : (_jsx(ChevronRight, { className: "text-green-500 w-4 h-4" })), _jsxs("h2", { className: "text-xs text-[#5E6272] font-semibold tracking-widest uppercase", children: ["Day ", day.dayNumber] }), day.hasChanges && (_jsx("div", { className: "w-2 h-2 bg-orange-500 rounded-full ml-2" }))] }), isOpen && day.hasChanges && (_jsx("button", { onClick: () => handleConfirmDay(day.dayNumber), disabled: isSaving, className: `px-3 py-1 rounded-lg text-xs font-medium transition-all ${isSaving
                                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                            : "bg-green-600 hover:bg-green-700 text-white"}`, children: isSaving ? "Saving..." : "Confirm Day" }))] }), isOpen && (_jsxs("div", { className: "space-y-4", children: [day.exercises.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsxs("h4", { className: "text-xs text-[#5E6272] font-semibold tracking-widest uppercase", children: ["Selected Exercises (", day.exercises.length, ")"] }), day.exercises.map((ex) => (_jsxs("div", { className: `border rounded-xl px-4 py-3 flex items-center justify-between transition-all ${ex.id.startsWith("temp-")
                                                    ? "bg-[#1A1D23] border-orange-500/50"
                                                    : "bg-[#1C1F26] border-[#2F3544]"}`, children: [_jsxs("div", { className: "flex items-center gap-3 flex-1", children: [_jsx(MuscleIcon, { muscleGroup: allExercises.find((a) => a.id === ex.exerciseId)?.muscleGroup || "", size: 28 }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-white", children: ex.name }), _jsxs("div", { className: "flex gap-3 text-sm mt-1", children: [_jsxs("span", { className: "text-[#00FFAD]", children: [ex.sets, " sets"] }), _jsxs("span", { className: "text-[#5E6272]", children: [ex.reps, " reps"] })] })] })] }), _jsxs("div", { className: "flex gap-2 ml-3", children: [_jsx("button", { onClick: () => {
                                                                    setConfirmedExerciseId(ex.id);
                                                                    setTimeout(() => setConfirmedExerciseId(null), 300);
                                                                }, className: `p-2 text-green-500 hover:bg-green-500/20 rounded transition ${confirmedExerciseId === ex.id ? "check-button-confirmed" : ""}`, title: "Keep exercise", children: _jsx(Check, { size: 16 }) }), _jsx("button", { onClick: () => handleRemoveExercise(ex.id, ex.exerciseId, day.dayNumber), className: "p-2 text-red-500 hover:bg-red-500/20 rounded transition", title: "Delete exercise", children: _jsx(X, { size: 16 }) })] })] }, ex.id)))] })), _jsxs("div", { className: "space-y-2", children: [day.exerciseOptions &&
                                                day.exerciseOptions.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("h4", { className: "text-xs text-[#5E6272] font-semibold tracking-widest uppercase", children: ["Recommended for ", bodyFocus] }), day.exerciseOptions
                                                        .filter((ex) => !ex.isSelected)
                                                        .slice(0, 3)
                                                        .map((ex) => (_jsxs("div", { className: "bg-[#1A1D23] border border-[#2A2D36] rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-[#3F4554] transition-colors", onClick: () => handleAddExercise(ex.id, day.dayNumber), children: [_jsx(MuscleIcon, { muscleGroup: ex.muscleGroup, size: 20 }), _jsx("div", { className: "flex-1 text-center", children: _jsx("p", { className: "font-semibold text-[#9CA3AF]", children: ex.name }) }), _jsx(Plus, { className: "text-blue-400 w-5 h-5 ml-3" })] }, ex.id)))] })), _jsxs("button", { onClick: () => toggleAvailableExercises(day.dayNumber), className: "w-full text-sm text-blue-400 flex items-center justify-center gap-2 py-2 hover:text-blue-300 transition-colors", children: [_jsx(Plus, { size: 16 }), day.showMoreOptions
                                                        ? "Hide More Options"
                                                        : "Add More Exercises"] }), day.showMoreOptions && (_jsxs("div", { className: "mt-3 space-y-3 border-t border-[#2F3544] pt-3", children: [_jsxs("h4", { className: "text-xs text-[#5E6272] font-semibold tracking-widest uppercase", children: ["Add Exercises (", bodyFocus, ")"] }), _jsx("input", { type: "text", placeholder: "Search exercises...", value: exerciseSearch[day.dayNumber] || "", onChange: (e) => setExerciseSearch((prev) => ({
                                                            ...prev,
                                                            [day.dayNumber]: e.target.value,
                                                        })), className: "w-full bg-[#262A34] border border-[#404854] rounded-lg px-3 py-2 text-white placeholder:text-[#5E6272] focus:outline-none focus:border-[#246BFD] text-sm" }), day.loadingAvailable ? (_jsx("p", { className: "text-[#5E6272] text-sm text-center py-4", children: "Loading exercises..." })) : day.availableExercises.length > 0 ? ((() => {
                                                        const unselectedExercises = day.availableExercises.filter((ex) => !ex.isSelected);
                                                        const searchTerm = exerciseSearch[day.dayNumber] || "";
                                                        const filtered = filterExercisesBySearch(unselectedExercises, searchTerm);
                                                        const grouped = groupExercisesByMuscleGroup(filtered);
                                                        const sortedGroups = Object.keys(grouped).sort();
                                                        return sortedGroups.length > 0 ? (_jsx("div", { className: "max-h-96 overflow-y-auto space-y-3", children: sortedGroups.map((muscleGroup) => (_jsxs("div", { children: [_jsx("h5", { className: "text-xs text-[#9CA3AF] font-semibold mb-2 px-1 sticky top-0 bg-[#1F222B] py-1", children: muscleGroup }), _jsx("div", { className: "space-y-2", children: grouped[muscleGroup].map((ex) => (_jsxs("div", { className: "bg-[#1A1D23] border border-[#2A2D36] rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:border-[#3F4554] transition-colors", onClick: () => handleAddExercise(ex.id, day.dayNumber), children: [_jsxs("div", { className: "flex items-center gap-2 flex-1", children: [_jsx(MuscleIcon, { muscleGroup: ex.muscleGroup, size: 18 }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-[#9CA3AF] text-sm", children: ex.name }), ex.equipment && (_jsx("p", { className: "text-xs text-[#6B7280]", children: ex.equipment }))] })] }), _jsx(Plus, { className: "text-blue-400 w-4 h-4 flex-shrink-0" })] }, ex.id))) })] }, muscleGroup))) })) : (_jsxs("p", { className: "text-[#5E6272] text-sm text-center py-4", children: ["No exercises found matching \"", searchTerm, "\""] }));
                                                    })()) : (_jsx("p", { className: "text-[#5E6272] text-sm text-center py-4", children: "All available exercises have been added." }))] }))] })] }))] }, day.dayNumber));
                }) })), _jsx(BottomBar, { onLogout: handleLogout })] }));
}
