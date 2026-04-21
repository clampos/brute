import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import TopBar from "../components/TopBar";
import { MoreHorizontal, Calendar, History, Play, Pause, Check, Target, Plus, X, } from "lucide-react";
import BullseyeIcon from "../assets/Icons/Bullseye Icon.svg";
import DownwardsIcon from "../assets/Icons/Downards Icon.svg";
import ProgressIcon from "../assets/Icons/Progress Icon.svg";
import MuscleIcon from "../components/MuscleIcon";
const WORKOUT_LAYOUT_CACHE_KEY = "workoutLayoutCache";
const WORKOUT_HISTORY_LAYOUT_CACHE_KEY = "workoutHistoryLayoutCache";
export default function Workouts() {
    // Timer state
    const [timerRunning, setTimerRunning] = useState(false);
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const intervalRef = useRef(null);
    const menuRef = useRef(null);
    // Programme state
    const [userProgram, setUserProgram] = useState(null);
    const [todayExercises, setTodayExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [savingWorkout, setSavingWorkout] = useState(false);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);
    const recommendationsRequestRef = useRef(0);
    const [workoutStartTime, setWorkoutStartTime] = useState(null);
    const [weeklySummary, setWeeklySummary] = useState(null);
    const [selectedExerciseId, setSelectedExerciseId] = useState(null);
    const [workoutCompleted, setWorkoutCompleted] = useState(false);
    const [showLeavingModal, setShowLeavingModal] = useState(false);
    const [nextLocation, setNextLocation] = useState(null);
    const [showExerciseHistoryModal, setShowExerciseHistoryModal] = useState(false);
    const [historyExerciseName, setHistoryExerciseName] = useState("");
    const [exerciseHistory, setExerciseHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const normalizeSetDefinitions = (setDefinitions, setCount) => {
        const count = setDefinitions ? Math.max(setCount, setDefinitions.length) : setCount;
        const firstIndexByGroup = new Map();
        return Array.from({ length: count }, (_, index) => {
            const definition = setDefinitions?.[index];
            const groupId = definition?.groupId;
            let type = definition?.type === "drop" ? "drop" : "main";
            if (groupId) {
                if (firstIndexByGroup.has(groupId)) {
                    type = "drop";
                }
                else {
                    firstIndexByGroup.set(groupId, index);
                }
            }
            return {
                type,
                groupId,
            };
        });
    };
    const parseSetDefinitions = (notes, setCount) => {
        if (!notes) {
            return normalizeSetDefinitions(undefined, setCount);
        }
        try {
            const parsed = JSON.parse(notes);
            const setDefinitions = Array.isArray(parsed?.setDefinitions)
                ? parsed.setDefinitions
                : undefined;
            return normalizeSetDefinitions(setDefinitions, setCount);
        }
        catch {
            return normalizeSetDefinitions(undefined, setCount);
        }
    };
    const readLayoutCache = () => {
        try {
            const raw = localStorage.getItem(WORKOUT_LAYOUT_CACHE_KEY);
            return raw ? JSON.parse(raw) : {};
        }
        catch {
            return {};
        }
    };
    const writeLayoutCache = (cache) => {
        localStorage.setItem(WORKOUT_LAYOUT_CACHE_KEY, JSON.stringify(cache));
    };
    const readHistoryLayoutCache = () => {
        try {
            const raw = localStorage.getItem(WORKOUT_HISTORY_LAYOUT_CACHE_KEY);
            return raw ? JSON.parse(raw) : {};
        }
        catch {
            return {};
        }
    };
    const writeHistoryLayoutCache = (cache) => {
        localStorage.setItem(WORKOUT_HISTORY_LAYOUT_CACHE_KEY, JSON.stringify(cache));
    };
    const buildSetDefinitions = (workoutSets) => workoutSets.map((set) => ({
        type: set.isDropSet ? "drop" : "main",
        groupId: set.dropSetGroupId,
    }));
    const getLayoutCacheKey = (programmeId, dayNumber, exerciseId) => `${programmeId}:${dayNumber}:${exerciseId}`;
    const getHistoryCacheKey = (exerciseId, weekNumber, dayNumber, date) => `${exerciseId}:${weekNumber}:${dayNumber}:${date.slice(0, 10)}`;
    const getCachedSetDefinitions = (programmeId, dayNumber, exerciseId) => {
        if (!programmeId || !dayNumber)
            return undefined;
        return readLayoutCache()[getLayoutCacheKey(programmeId, dayNumber, exerciseId)];
    };
    const persistLayoutCacheForExercises = (exercises, programmeId, dayNumber) => {
        if (!programmeId || !dayNumber)
            return;
        const cache = readLayoutCache();
        exercises.forEach((exercise) => {
            cache[getLayoutCacheKey(programmeId, dayNumber, exercise.exerciseId)] =
                buildSetDefinitions(exercise.workoutSets);
        });
        writeLayoutCache(cache);
    };
    const persistHistoryCacheForExercises = (exercises, weekNumber, dayNumber) => {
        if (!weekNumber || !dayNumber)
            return;
        const date = new Date().toISOString();
        const cache = readHistoryLayoutCache();
        exercises.forEach((exercise) => {
            cache[getHistoryCacheKey(exercise.exerciseId, weekNumber, dayNumber, date)] = buildSetDefinitions(exercise.workoutSets);
        });
        writeHistoryLayoutCache(cache);
    };
    const applyHistoryLayoutFallback = (exerciseId, history) => {
        const cache = readHistoryLayoutCache();
        return history.map((entry) => {
            const cachedDefinitions = cache[getHistoryCacheKey(exerciseId, entry.weekNumber, entry.dayNumber, entry.date)];
            if (!cachedDefinitions || cachedDefinitions.length === 0) {
                return entry;
            }
            return {
                ...entry,
                sets: [...entry.sets]
                    .sort((a, b) => a.setNumber - b.setNumber)
                    .map((set, index) => ({
                    ...set,
                    setType: set.setType ?? (cachedDefinitions[index]?.type === "drop" ? "drop" : "main"),
                    dropSetGroupId: set.dropSetGroupId ?? cachedDefinitions[index]?.groupId,
                })),
            };
        });
    };
    const createWorkoutSetsFromDefinitions = (setCount, notes, fallbackDefinitions) => normalizeSetDefinitions(fallbackDefinitions && fallbackDefinitions.length > 0
        ? fallbackDefinitions
        : parseSetDefinitions(notes, setCount), setCount).map((definition) => ({
        weight: "",
        reps: "",
        completed: false,
        isDropSet: definition.type === "drop",
        dropSetGroupId: definition.groupId,
        isNewlyAdded: false,
    }));
    const serializeSetDefinitions = (workoutSets) => JSON.stringify({
        setDefinitions: workoutSets.map((set) => ({
            type: set.isDropSet ? "drop" : "main",
            groupId: set.dropSetGroupId,
        })),
    });
    const buildSetLayoutsPayload = (exercises) => exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        setDefinitions: exercise.workoutSets.map((set) => ({
            type: set.isDropSet ? "drop" : "main",
            groupId: set.dropSetGroupId,
        })),
    }));
    const cleanupDropSetGroups = (workoutSets) => {
        const groupsWithDropSets = new Set(workoutSets
            .filter((set) => set.isDropSet && set.dropSetGroupId)
            .map((set) => set.dropSetGroupId));
        return workoutSets.map((set) => set.dropSetGroupId && !groupsWithDropSets.has(set.dropSetGroupId)
            ? { ...set, dropSetGroupId: undefined }
            : set);
    };
    const createDropSetGroupId = () => `drop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const parseTargetReps = (value) => {
        if (value == null)
            return null;
        if (typeof value === "number")
            return Number.isNaN(value) ? null : value;
        const normalized = value.toLowerCase().replace(/reps?/g, "").trim();
        if (!normalized)
            return null;
        const parsed = parseInt(normalized, 10);
        return Number.isNaN(parsed) ? null : parsed;
    };
    const getOrderedSetRecommendations = (exercise) => [...(exercise.recommendation?.setRecommendations ?? [])].sort((a, b) => a.setNumber - b.setNumber);
    const getRecommendationIndexForSet = (workoutSets, setIdx) => {
        if (!workoutSets[setIdx] || workoutSets[setIdx].isNewlyAdded)
            return null;
        let recommendationIndex = -1;
        for (let idx = 0; idx <= setIdx; idx += 1) {
            if (!workoutSets[idx]?.isNewlyAdded) {
                recommendationIndex += 1;
            }
        }
        return recommendationIndex;
    };
    const getSetIndexForRecommendationIndex = (workoutSets, recommendationIndex) => {
        let currentRecommendationIndex = -1;
        for (let idx = 0; idx < workoutSets.length; idx += 1) {
            if (workoutSets[idx]?.isNewlyAdded)
                continue;
            currentRecommendationIndex += 1;
            if (currentRecommendationIndex === recommendationIndex) {
                return idx;
            }
        }
        return null;
    };
    const getRecommendationForSet = (exercise, setIdx) => {
        const recommendationIndex = getRecommendationIndexForSet(exercise.workoutSets, setIdx);
        if (recommendationIndex == null)
            return null;
        const orderedRecommendations = getOrderedSetRecommendations(exercise);
        return orderedRecommendations[recommendationIndex] ?? null;
    };
    const getTargetRepsForSet = (exercise, setIdx) => {
        return getRecommendationForSet(exercise, setIdx)?.recommendedReps ?? null;
    };
    const getSetRepIcon = (set, targetReps) => {
        if (!set.completed)
            return null;
        const actualReps = parseInt(set.reps, 10);
        if (Number.isNaN(actualReps))
            return null;
        const effectiveTargetReps = set.completedTargetReps ?? targetReps;
        if (effectiveTargetReps == null)
            return null;
        if (actualReps === effectiveTargetReps) {
            return { src: BullseyeIcon, alt: "Target reps achieved" };
        }
        if (actualReps < effectiveTargetReps) {
            return { src: DownwardsIcon, alt: "Below target reps" };
        }
        if (actualReps > effectiveTargetReps) {
            return { src: ProgressIcon, alt: "Above target reps" };
        }
        return null;
    };
    const isVisualDropSetRow = (workoutSets, setIdx) => {
        const set = workoutSets[setIdx];
        if (!set)
            return false;
        if (set.isDropSet)
            return true;
        if (!set.dropSetGroupId)
            return false;
        const firstIndexInGroup = workoutSets.findIndex((candidate) => candidate.dropSetGroupId === set.dropSetGroupId);
        return firstIndexInGroup !== -1 && setIdx > firstIndexInGroup;
    };
    // Add exercise modal state
    const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
    const [availableExercises, setAvailableExercises] = useState([]);
    const [loadingExercises, setLoadingExercises] = useState(false);
    const [selectedMuscleGroupFilter, setSelectedMuscleGroupFilter] = useState("All");
    const [replaceTargetExerciseId, setReplaceTargetExerciseId] = useState(null);
    const navigate = useNavigate();
    // Safely navigate with workout in progress check
    const safeNavigate = (path) => {
        // Show modal if workout has been started (timer has run or is running)
        console.log("🔍 safeNavigate called", {
            path,
            workoutCompleted,
            timerRunning,
            secondsElapsed,
        });
        if (!workoutCompleted && (timerRunning || secondsElapsed > 0)) {
            console.log("✅ Showing modal");
            setNextLocation(path);
            setShowLeavingModal(true);
        }
        else {
            console.log("➡️ Navigating directly to", path);
            navigate(path);
        }
    };
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("installPromptDismissed");
        localStorage.removeItem("workoutSession");
        navigate("/login");
    };
    const openExerciseHistory = async (exercise) => {
        setOpenExerciseMenu(null);
        setShowExerciseHistoryModal(true);
        setHistoryExerciseName(exercise.name);
        setExerciseHistory([]);
        setHistoryError("");
        setHistoryLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setHistoryError("Please log in again to load exercise history.");
                return;
            }
            const response = await fetch(`http://localhost:4242/auth/workouts/history/${exercise.exerciseId}?limit=8`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error("Failed to load exercise history");
            }
            const result = await response.json();
            const history = Array.isArray(result.history)
                ? result.history
                : [];
            setExerciseHistory(applyHistoryLayoutFallback(exercise.exerciseId, history));
        }
        catch (err) {
            console.error("Error loading exercise history:", err);
            setHistoryError("Could not load exercise history right now.");
        }
        finally {
            setHistoryLoading(false);
        }
    };
    // Exercise menu state
    const [openExerciseMenu, setOpenExerciseMenu] = useState(null);
    // Set menu state (keyed by `${exerciseId}:${setIdx}`)
    const [openSetMenu, setOpenSetMenu] = useState(null);
    // Create refs for menu containers to track click-outside
    const exerciseMenuRefs = useRef(new Map());
    const setMenuRefs = useRef(new Map());
    // Tracks the weight value at the moment a weight input is focused, so onBlur can
    // use the original weight (not mid-typing state) for the inverse Epley calculation.
    const weightAtFocusRef = useRef(null);
    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check exercise menus
            if (openExerciseMenu) {
                const menuRef = exerciseMenuRefs.current.get(openExerciseMenu);
                if (menuRef && !menuRef.contains(event.target)) {
                    setOpenExerciseMenu(null);
                }
            }
            // Check set menus
            if (openSetMenu) {
                const menuRef = setMenuRefs.current.get(openSetMenu);
                if (menuRef && !menuRef.contains(event.target)) {
                    setOpenSetMenu(null);
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [openExerciseMenu, openSetMenu]);
    // Cleanup old refs when exercises change
    useEffect(() => {
        return () => {
            exerciseMenuRefs.current.clear();
            setMenuRefs.current.clear();
        };
    }, []);
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
        setReplaceTargetExerciseId(exerciseId);
        setSelectedMuscleGroupFilter(exercise.muscleGroup || "All");
        setShowAddExerciseModal(true);
        setOpenExerciseMenu(null);
        await fetchAvailableExercises();
    };
    const addSetToExercise = (exerciseId) => {
        const updatedExercises = todayExercises.map((ex) => ex.exerciseId === exerciseId
            ? {
                ...ex,
                recommendation: ex.recommendation
                    ? { ...ex.recommendation, setRecommendations: [] }
                    : ex.recommendation,
                workoutSets: [
                    ...ex.workoutSets,
                    {
                        weight: "",
                        reps: "",
                        completed: false,
                        isDropSet: false,
                        isNewlyAdded: true,
                    },
                ],
            }
            : ex);
        setTodayExercises(updatedExercises);
        setOpenExerciseMenu(null);
        loadProgressionRecommendationsForExercises(updatedExercises);
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
    // Fetch all available exercises for adding to workout
    const fetchAvailableExercises = async () => {
        setLoadingExercises(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:4242/auth/exercises/all", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok)
                throw new Error("Failed to fetch exercises");
            const exercises = await res.json();
            setAvailableExercises(exercises);
        }
        catch (err) {
            console.error("Error fetching exercises:", err);
            alert("Failed to load exercises");
        }
        finally {
            setLoadingExercises(false);
        }
    };
    // Add exercise to workout
    const addExerciseToWorkout = (exercise) => {
        if (replaceTargetExerciseId) {
            setTodayExercises((prev) => prev.map((ex) => ex.exerciseId === replaceTargetExerciseId
                ? {
                    ...ex,
                    name: exercise.name,
                    exerciseId: exercise.id,
                    muscleGroup: exercise.muscleGroup || ex.muscleGroup,
                    recommendation: undefined,
                }
                : ex));
            setShowAddExerciseModal(false);
            setReplaceTargetExerciseId(null);
            setSelectedMuscleGroupFilter("All");
            return;
        }
        // Check if exercise is already in the workout
        const alreadyExists = todayExercises.some((ex) => ex.exerciseId === exercise.id);
        if (alreadyExists) {
            alert("This exercise is already in your workout");
            return;
        }
        // Add exercise with default 3 sets
        const newWorkoutExercise = {
            id: `temp-${Date.now()}-${exercise.id}`,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sets: 3,
            reps: "8-12",
            exerciseId: exercise.id,
            workoutSets: [
                { weight: "", reps: "", completed: false, isDropSet: false },
                { weight: "", reps: "", completed: false, isDropSet: false },
                { weight: "", reps: "", completed: false, isDropSet: false },
            ],
        };
        setTodayExercises((prev) => [...prev, newWorkoutExercise]);
        setShowAddExerciseModal(false);
        setReplaceTargetExerciseId(null);
    };
    const closeAddExerciseModal = () => {
        setShowAddExerciseModal(false);
        setReplaceTargetExerciseId(null);
        setSelectedMuscleGroupFilter("All");
    };
    // Open add exercise modal
    const openAddExerciseModal = () => {
        setReplaceTargetExerciseId(null);
        setSelectedMuscleGroupFilter("All");
        setShowAddExerciseModal(true);
        fetchAvailableExercises();
    };
    // Get unique muscle groups from available exercises
    const getUniqueMuscleGroups = () => {
        const groups = availableExercises.map(ex => ex.muscleGroup);
        return ["All", ...Array.from(new Set(groups)).sort()];
    };
    // Filter exercises based on selected muscle group
    const getFilteredExercises = () => {
        if (selectedMuscleGroupFilter === "All") {
            return availableExercises;
        }
        return availableExercises.filter(ex => ex.muscleGroup === selectedMuscleGroupFilter);
    };
    // Check if all sets in all exercises are completed
    const areAllSetsCompleted = () => {
        return todayExercises.every((exercise) => exercise.workoutSets.every((set) => set.completed));
    };
    // Set-level actions
    const addSetBelow = (exerciseId, setIdx) => {
        const updatedExercises = todayExercises.map((ex) => ex.exerciseId === exerciseId
            ? {
                ...ex,
                recommendation: ex.recommendation
                    ? { ...ex.recommendation, setRecommendations: [] }
                    : ex.recommendation,
                workoutSets: cleanupDropSetGroups([
                    ...ex.workoutSets.slice(0, setIdx + 1),
                    {
                        weight: "",
                        reps: "",
                        completed: false,
                        isDropSet: false,
                        isNewlyAdded: true,
                    },
                    ...ex.workoutSets.slice(setIdx + 1),
                ]),
            }
            : ex);
        setTodayExercises(updatedExercises);
        setOpenSetMenu(null);
        loadProgressionRecommendationsForExercises(updatedExercises);
    };
    const createDropSet = (exerciseId, setIdx) => {
        const updatedExercises = todayExercises.map((ex) => {
            if (ex.exerciseId !== exerciseId)
                return ex;
            const targetSet = ex.workoutSets[setIdx];
            if (!targetSet || targetSet.isDropSet || targetSet.dropSetGroupId) {
                return ex;
            }
            const dropSetGroupId = createDropSetGroupId();
            const updatedSets = [...ex.workoutSets];
            updatedSets[setIdx] = {
                ...targetSet,
                dropSetGroupId,
            };
            updatedSets.splice(setIdx + 1, 0, {
                weight: "",
                reps: "",
                completed: false,
                isDropSet: true,
                dropSetGroupId,
                isNewlyAdded: true,
            }, {
                weight: "",
                reps: "",
                completed: false,
                isDropSet: true,
                dropSetGroupId,
                isNewlyAdded: true,
            });
            return {
                ...ex,
                // Clear stale setRecommendations immediately — positions have shifted
                // and old entries would falsely match the new drop set positions.
                // The re-fetch below will repopulate with the correct layout.
                recommendation: ex.recommendation
                    ? { ...ex.recommendation, setRecommendations: [] }
                    : ex.recommendation,
                workoutSets: updatedSets,
            };
        });
        setTodayExercises(updatedExercises);
        setOpenSetMenu(null);
        loadProgressionRecommendationsForExercises(updatedExercises);
    };
    const addAnotherDropSet = (exerciseId, setIdx) => {
        const updatedExercises = todayExercises.map((ex) => {
            if (ex.exerciseId !== exerciseId)
                return ex;
            const targetSet = ex.workoutSets[setIdx];
            const dropSetGroupId = targetSet?.dropSetGroupId;
            if (!dropSetGroupId)
                return ex;
            const lastIndexInGroup = ex.workoutSets.reduce((lastIndex, set, index) => set.dropSetGroupId === dropSetGroupId ? index : lastIndex, setIdx);
            const updatedSets = [...ex.workoutSets];
            updatedSets.splice(lastIndexInGroup + 1, 0, {
                weight: "",
                reps: "",
                completed: false,
                isDropSet: true,
                dropSetGroupId,
                isNewlyAdded: true,
            });
            return {
                ...ex,
                recommendation: ex.recommendation
                    ? { ...ex.recommendation, setRecommendations: [] }
                    : ex.recommendation,
                workoutSets: updatedSets,
            };
        });
        setTodayExercises(updatedExercises);
        setOpenSetMenu(null);
        loadProgressionRecommendationsForExercises(updatedExercises);
    };
    const removeDropSetGroup = (exerciseId, setIdx) => {
        const updatedExercises = todayExercises.map((ex) => {
            if (ex.exerciseId !== exerciseId)
                return ex;
            const targetSet = ex.workoutSets[setIdx];
            const dropSetGroupId = targetSet?.dropSetGroupId;
            if (!dropSetGroupId)
                return ex;
            const updatedSets = ex.workoutSets
                .filter((set) => !(set.isDropSet && set.dropSetGroupId === dropSetGroupId))
                .map((set) => set.dropSetGroupId === dropSetGroupId
                ? { ...set, dropSetGroupId: undefined }
                : set);
            return {
                ...ex,
                workoutSets: cleanupDropSetGroups(updatedSets),
            };
        });
        setTodayExercises(updatedExercises);
        setOpenSetMenu(null);
        loadProgressionRecommendationsForExercises(updatedExercises);
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
        setTodayExercises((prev) => prev.map((ex) => {
            if (ex.exerciseId !== exerciseId)
                return ex;
            const targetSet = ex.workoutSets[setIdx];
            if (!targetSet)
                return ex;
            const updatedSets = !targetSet.isDropSet && targetSet.dropSetGroupId
                ? ex.workoutSets.filter((set, index) => index !== setIdx && set.dropSetGroupId !== targetSet.dropSetGroupId)
                : ex.workoutSets.filter((_, index) => index !== setIdx);
            return {
                ...ex,
                workoutSets: cleanupDropSetGroups(updatedSets),
            };
        }));
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
    const toPositiveNumber = (raw) => {
        if (raw === null || raw === undefined)
            return null;
        const value = typeof raw === "number" ? raw : parseFloat(String(raw));
        return Number.isFinite(value) && value > 0 ? value : null;
    };
    const calculateRepsFromOneRepMax = (oneRepMax, weight) => {
        if (!Number.isFinite(oneRepMax) || !Number.isFinite(weight) || weight <= 0) {
            return "";
        }
        // Inverse Epley: reps = 30 * (1RM / weight - 1)
        const reps = 30 * (oneRepMax / weight - 1);
        const rounded = Math.max(1, Math.round(reps));
        return String(rounded);
    };
    const formatWeightForInput = (weight) => {
        const rounded = Math.max(0.5, Math.round(weight * 10) / 10);
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };
    // Simple update: just stores the raw value. For weight fields the Epley
    // cascade runs in finalizeWeightChange (onBlur), not here (onChange), so
    // that mid-typing intermediate values never trigger wrong recalculations.
    const updateSetData = (exerciseId, setIndex, field, value) => {
        setTodayExercises((prev) => prev.map((exercise) => exercise.exerciseId === exerciseId
            ? {
                ...exercise,
                workoutSets: exercise.workoutSets.map((set, idx) => idx === setIndex ? { ...set, [field]: value } : set),
            }
            : exercise));
    };
    // Called onBlur of the weight input. Uses the weight that was present when the
    // field was focused (saved in weightAtFocusRef) so the 1RM is always derived
    // from a clean committed value, never from a partial typed string.
    const finalizeWeightChange = (exerciseId, setIndex) => {
        const captured = weightAtFocusRef.current;
        weightAtFocusRef.current = null;
        setTodayExercises((prev) => prev.map((exercise) => {
            if (exercise.exerciseId !== exerciseId)
                return exercise;
            const setToUpdate = exercise.workoutSets[setIndex];
            if (!setToUpdate)
                return exercise;
            const previousEditedWeight = captured?.exerciseId === exerciseId && captured?.setIndex === setIndex
                ? toPositiveNumber(captured.weight)
                : toPositiveNumber(setToUpdate.weight);
            const newEditedWeight = toPositiveNumber(setToUpdate.weight);
            // Nothing to do if the new weight is invalid or unchanged
            if (!newEditedWeight)
                return exercise;
            if (previousEditedWeight && previousEditedWeight === newEditedWeight)
                return exercise;
            const weightDelta = previousEditedWeight && newEditedWeight
                ? newEditedWeight - previousEditedWeight
                : null;
            const recommendationForSet = getRecommendationForSet(exercise, setIndex);
            // Use the ORIGINAL (pre-edit) weight + current reps to derive 1RM so
            // that the 1RM is not polluted by any intermediate typed values.
            const anchorWeight = previousEditedWeight;
            const anchorReps = toPositiveNumber(setToUpdate.reps);
            const fallbackWeight = toPositiveNumber(recommendationForSet?.recommendedWeight);
            const fallbackReps = toPositiveNumber(recommendationForSet?.recommendedReps);
            const oneRepMax = anchorWeight && anchorReps
                ? anchorWeight * (1 + anchorReps / 30)
                : fallbackWeight && fallbackReps
                    ? fallbackWeight * (1 + fallbackReps / 30)
                    : null;
            if (!oneRepMax)
                return exercise;
            const updatedSets = exercise.workoutSets.map((set, idx) => {
                if (idx < setIndex)
                    return set;
                let nextWeightRaw = idx === setIndex ? setToUpdate.weight : set.weight;
                if (idx > setIndex && weightDelta !== null) {
                    const currentWeight = toPositiveNumber(set.weight);
                    if (currentWeight) {
                        nextWeightRaw = formatWeightForInput(currentWeight + weightDelta);
                    }
                }
                const nextWeight = toPositiveNumber(nextWeightRaw);
                if (!nextWeight) {
                    return idx === setIndex
                        ? { ...set, weight: setToUpdate.weight }
                        : { ...set, weight: nextWeightRaw };
                }
                return {
                    ...set,
                    weight: idx === setIndex ? setToUpdate.weight : nextWeightRaw,
                    reps: calculateRepsFromOneRepMax(oneRepMax, nextWeight),
                };
            });
            const orderedRecommendations = getOrderedSetRecommendations(exercise);
            const updatedRecommendation = exercise.recommendation
                ? {
                    ...exercise.recommendation,
                    setRecommendations: orderedRecommendations.map((rec, recIdx) => {
                        const mappedSetIdx = getSetIndexForRecommendationIndex(exercise.workoutSets, recIdx);
                        if (mappedSetIdx == null || mappedSetIdx < setIndex) {
                            return rec;
                        }
                        const updatedSet = updatedSets[mappedSetIdx];
                        if (!updatedSet)
                            return rec;
                        const recWeight = toPositiveNumber(updatedSet.weight);
                        const recReps = parseInt(updatedSet.reps, 10);
                        return {
                            ...rec,
                            recommendedWeight: recWeight ?? rec.recommendedWeight,
                            recommendedReps: Number.isNaN(recReps)
                                ? rec.recommendedReps
                                : recReps,
                        };
                    }),
                }
                : exercise.recommendation;
            return {
                ...exercise,
                workoutSets: updatedSets,
                recommendation: updatedRecommendation,
            };
        }));
    };
    const toggleSetCompletion = (exerciseId, setIndex) => {
        setTodayExercises((prev) => prev.map((exercise) => exercise.exerciseId === exerciseId
            ? {
                ...exercise,
                workoutSets: exercise.workoutSets.map((set, idx) => {
                    if (idx === setIndex) {
                        // Only allow completion if weight and reps are filled
                        const canComplete = set.weight.trim() && set.reps.trim();
                        if (!canComplete) {
                            return {
                                ...set,
                                completed: false,
                                completedTargetReps: null,
                            };
                        }
                        if (set.completed) {
                            return {
                                ...set,
                                completed: false,
                                completedTargetReps: null,
                            };
                        }
                        return {
                            ...set,
                            completed: true,
                            completedTargetReps: getTargetRepsForSet(exercise, setIndex),
                        };
                    }
                    return set;
                }),
            }
            : exercise));
    };
    const addSet = (exerciseId) => {
        const updatedExercises = todayExercises.map((exercise) => exercise.exerciseId === exerciseId
            ? {
                ...exercise,
                recommendation: exercise.recommendation
                    ? { ...exercise.recommendation, setRecommendations: [] }
                    : exercise.recommendation,
                workoutSets: [
                    ...exercise.workoutSets,
                    {
                        weight: "",
                        reps: "",
                        completed: false,
                        isDropSet: false,
                        isNewlyAdded: true,
                    },
                ],
            }
            : exercise);
        setTodayExercises(updatedExercises);
        loadProgressionRecommendationsForExercises(updatedExercises);
    };
    const saveWorkout = async () => {
        if (!userProgram) {
            setError("Cannot save workout - missing program");
            return;
        }
        const startTime = workoutStartTime ?? new Date();
        if (!workoutStartTime) {
            setWorkoutStartTime(startTime);
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
                    isDropSet: set.isDropSet,
                    dropSetGroupId: set.dropSetGroupId,
                })),
            }));
            const programmeUpdates = todayExercises.map((exercise, index) => ({
                exerciseId: exercise.exerciseId,
                sets: exercise.workoutSets.length,
                reps: exercise.reps,
                orderIndex: index,
                notes: serializeSetDefinitions(exercise.workoutSets),
            }));
            const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000 / 60);
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
                    programmeUpdates,
                }),
            });
            if (!response.ok) {
                throw new Error("Failed to save workout");
            }
            const result = await response.json();
            // Show weekly summary if available, or mark as completed
            if (result.weeklySummary) {
                persistHistoryCacheForExercises(todayExercises, userProgram?.currentWeek, userProgram?.currentDay);
                localStorage.removeItem("workoutSession");
                setWeeklySummary(result.weeklySummary);
                setWorkoutCompleted(true);
            }
            else {
                // Show completion screen with recommendations
                persistHistoryCacheForExercises(todayExercises, userProgram?.currentWeek, userProgram?.currentDay);
                localStorage.removeItem("workoutSession");
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
            localStorage.removeItem("workoutSession");
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
                    programme: prev.programme,
                }
                : prev);
            // Reset timer and workout state
            setTimerRunning(false);
            setSecondsElapsed(0);
            setWorkoutStartTime(null);
            setWeeklySummary(null);
            setWorkoutCompleted(false);
            // Fetch the next day's exercises
            const programmeResponse = await fetch(`http://localhost:4242/auth/programmes/${userProgram?.programme?.id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            if (!programmeResponse.ok) {
                throw new Error("Failed to fetch programme details");
            }
            const programmeData = await programmeResponse.json();
            const nextDayExercises = programmeData.exercises.filter((exercise) => exercise.dayNumber === result.currentDay);
            const workoutExercises = nextDayExercises.map((exercise) => {
                const cachedDefinitions = getCachedSetDefinitions(userProgram?.programme?.id, result.currentDay, exercise.exercise.id);
                const initialSets = createWorkoutSetsFromDefinitions(exercise.sets, exercise.notes, cachedDefinitions);
                return {
                    id: exercise.id,
                    name: exercise.exercise.name,
                    muscleGroup: exercise.exercise.muscleGroup,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    notes: exercise.notes,
                    exerciseId: exercise.exercise.id,
                    workoutSets: initialSets,
                };
            });
            setTodayExercises(workoutExercises);
            await loadProgressionRecommendationsForExercises(workoutExercises);
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
    const applyRecommendationToExercise = (exercise, recommendation) => {
        if (!recommendation) {
            return exercise;
        }
        const setRecommendations = [...(recommendation.setRecommendations ?? [])].sort((a, b) => a.setNumber - b.setNumber);
        let recommendationIndex = 0;
        return {
            ...exercise,
            recommendation,
            workoutSets: exercise.workoutSets.map((set, idx) => {
                if (set.isNewlyAdded) {
                    return set;
                }
                const setRecommendation = setRecommendations[recommendationIndex];
                recommendationIndex += 1;
                const recommendedWeight = setRecommendation
                    ? String(setRecommendation.recommendedWeight)
                    : "";
                const recommendedReps = setRecommendation
                    ? String(setRecommendation.recommendedReps)
                    : "";
                return {
                    ...set,
                    weight: set.weight.trim() ? set.weight : recommendedWeight,
                    reps: set.reps.trim() ? set.reps : recommendedReps,
                };
            }),
        };
    };
    const loadProgressionRecommendations = async () => {
        if (!userProgram || todayExercises.length === 0)
            return;
        setLoadingRecommendations(true);
        const requestId = ++recommendationsRequestRef.current;
        try {
            const exerciseIds = todayExercises.map((ex) => ex.exerciseId);
            const setCounts = todayExercises.map((ex) => ex.workoutSets.length);
            const setLayouts = encodeURIComponent(JSON.stringify(buildSetLayoutsPayload(todayExercises)));
            const token = localStorage.getItem("token");
            if (!token) {
                console.warn("No auth token found, skipping recommendations");
                setLoadingRecommendations(false);
                return;
            }
            const response = await fetch(`http://localhost:4242/auth/workouts/recommendations?exerciseIds=${exerciseIds.join(",")}&setCounts=${setCounts.join(",")}&setLayouts=${setLayouts}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.warn("Auth token expired or invalid, skipping recommendations");
                    setLoadingRecommendations(false);
                    return;
                }
                throw new Error(`Failed to load recommendations: ${response.status}`);
            }
            const result = await response.json();
            if (requestId !== recommendationsRequestRef.current) {
                return;
            }
            setTodayExercises((prev) => prev.map((exercise) => {
                const recommendation = result.recommendations.find((rec) => rec.exerciseId === exercise.exerciseId);
                return applyRecommendationToExercise(exercise, recommendation);
            }));
        }
        catch (err) {
            console.error("Error loading recommendations:", err);
            // Don't show error to user, just log it
        }
        finally {
            setLoadingRecommendations(false);
        }
    };
    const loadProgressionRecommendationsForExercises = async (exercises) => {
        if (!userProgram || exercises.length === 0)
            return;
        const requestId = ++recommendationsRequestRef.current;
        try {
            const exerciseIds = exercises.map((ex) => ex.exerciseId);
            const setCounts = exercises.map((ex) => ex.workoutSets.length);
            const setLayouts = encodeURIComponent(JSON.stringify(buildSetLayoutsPayload(exercises)));
            const token = localStorage.getItem("token");
            if (!token) {
                console.warn("No auth token found, skipping recommendations");
                return;
            }
            const response = await fetch(`http://localhost:4242/auth/workouts/recommendations?exerciseIds=${exerciseIds.join(",")}&setCounts=${setCounts.join(",")}&setLayouts=${setLayouts}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.warn("Auth token expired or invalid, skipping recommendations");
                    return;
                }
                throw new Error(`Failed to load recommendations: ${response.status}`);
            }
            const result = await response.json();
            if (requestId !== recommendationsRequestRef.current) {
                return;
            }
            setTodayExercises((prev) => prev.map((exercise) => {
                const recommendation = result.recommendations.find((rec) => rec.exerciseId === exercise.exerciseId);
                return applyRecommendationToExercise(exercise, recommendation);
            }));
        }
        catch (err) {
            console.error("Error loading recommendations:", err);
        }
    };
    useEffect(() => {
        const fetchUserProgram = async () => {
            try {
                setLoading(true);
                setError("");
                // Check if there's a saved session first
                const savedSession = localStorage.getItem("workoutSession");
                if (savedSession) {
                    try {
                        const session = JSON.parse(savedSession);
                        setUserProgram(session.userProgram);
                        setTodayExercises(session.todayExercises);
                        if (session.workoutStartTime) {
                            setWorkoutStartTime(new Date(session.workoutStartTime));
                        }
                        setTimerRunning(session.timerRunning);
                        setSecondsElapsed(session.secondsElapsed);
                        setLoading(false);
                        return; // Exit early - don't fetch fresh data
                    }
                    catch (err) {
                        console.error("Failed to restore workout session:", err);
                        // Fall through to fetch fresh data
                    }
                }
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
                    const cachedDefinitions = getCachedSetDefinitions(activeProgram.programmeId, activeProgram.currentDay, exercise.exercise.id);
                    const initialSets = createWorkoutSetsFromDefinitions(exercise.sets, exercise.notes, cachedDefinitions);
                    return {
                        id: exercise.id,
                        name: exercise.exercise.name,
                        muscleGroup: exercise.exercise.muscleGroup,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        notes: exercise.notes,
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
        if (workoutCompleted) {
            localStorage.removeItem("workoutSession");
        }
    }, [workoutCompleted]);
    // Save workout session to localStorage whenever state changes
    useEffect(() => {
        if (!workoutCompleted && userProgram && todayExercises.length > 0) {
            const sessionData = {
                userProgram,
                todayExercises,
                workoutStartTime: workoutStartTime?.toISOString() || null,
                timerRunning,
                secondsElapsed,
            };
            localStorage.setItem("workoutSession", JSON.stringify(sessionData));
            persistLayoutCacheForExercises(todayExercises, userProgram.programme?.id, userProgram.currentDay);
        }
    }, [
        userProgram,
        todayExercises,
        workoutStartTime,
        timerRunning,
        secondsElapsed,
        workoutCompleted,
    ]);
    // Warn before leaving if workout is in progress
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            // Warn if workout has been started (timer has run or is running)
            if (!workoutCompleted && (timerRunning || secondsElapsed > 0)) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [workoutCompleted, timerRunning, secondsElapsed]);
    // Handle scroll lock when modal opens/closes
    useEffect(() => {
        console.log("💬 Modal visibility changed:", showLeavingModal, "nextLocation:", nextLocation);
        if (showLeavingModal) {
            document.body.style.overflow = "hidden";
        }
        else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showLeavingModal, nextLocation]);
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
    return (_jsxs("div", { className: `min-h-screen text-[#5E6272] flex flex-col p-4 pb-16 ${areAllSetsCompleted() && !workoutCompleted ? "pb-24" : "pb-16"}`, style: {
            backgroundColor: "#0A0E1A",
        }, children: [_jsx(TopBar, { title: "Workouts", pageIcon: _jsx(Calendar, { size: 18 }), menuItems: [
                    { label: "Dashboard", onClick: () => safeNavigate("/dashboard") },
                    { label: "Programmes", onClick: () => safeNavigate("/programmes") },
                    { label: "Track Metrics", onClick: () => safeNavigate("/metrics") },
                    { label: "Settings", onClick: () => safeNavigate("/settings") },
                ] }), _jsxs("div", { className: "text-center mt-2", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: userProgram?.programme.name || "Loading..." }), userProgram?.programme.description && (_jsx("p", { className: "text-sm text-[#5E6272] mt-1", children: userProgram.programme.description })), _jsx("p", { className: "text-xs text-[#FBA3FF] mt-1", children: userProgram?.programme.bodyPartFocus })] }), _jsxs("div", { className: "flex justify-center items-center gap-2 mt-1 text-sm text-[#A0AEC0]", children: [_jsxs("span", { className: "uppercase text-xs tracking-wide", children: ["Week ", userProgram?.currentWeek || 1, ", Day", " ", userProgram?.currentDay || 1] }), !timerRunning && secondsElapsed === 0 ? (_jsxs("button", { onClick: startTimer, className: "flex items-center gap-1 text-[#86FF99] font-medium cursor-pointer", "aria-label": "Start Workout Timer", children: [_jsx(Play, { size: 14 }), " Start Workout Timer"] })) : (_jsxs("div", { className: "flex items-center gap-2 rounded-full select-none", children: [timerRunning ? (_jsx("button", { onClick: pauseTimer, className: "bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-full p-1 flex items-center justify-center", "aria-label": "Pause Workout Timer", children: _jsx(Pause, { size: 16 }) })) : (_jsx("button", { onClick: startTimer, className: "bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-full p-1 flex items-center justify-center", "aria-label": "Resume Workout Timer", children: _jsx(Play, { size: 16 }) })), _jsx("span", { className: "tracking-wide font-inter text-sm", style: { color: "#5E6272" }, children: formatTime(secondsElapsed) })] }))] }), _jsxs("div", { className: "px-4 mt-6 space-y-4", ref: menuRef, children: [_jsxs("h3", { className: "text-sm text-white font-semibold tracking-widest uppercase text-center", children: ["Today's Workout - Day ", userProgram?.currentDay] }), todayExercises.length > 0 ? (todayExercises.map((exercise, index) => (_jsxs("div", { className: `rounded-xl p-4 ${selectedExerciseId === exercise.exerciseId
                            ? "border-2 border-blue-500"
                            : "border border-[#2F3544]"} bg-[#1C1F26]`, children: [_jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(MuscleIcon, { muscleGroup: exercise.muscleGroup, size: 28 }), _jsxs("div", { children: [_jsx("h4", { className: "text-white font-semibold text-base", children: exercise.name }), _jsxs("div", { className: "flex text-sm gap-2 mt-1", children: [_jsxs("span", { className: "text-green-400", children: [exercise.workoutSets.length, " Working Set", exercise.workoutSets.length !== 1 ? "s" : ""] }), _jsx("span", { className: "text-pink-400", children: exercise.muscleGroup })] })] })] }), exercise.recommendation && (_jsxs("div", { className: "mt-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg", children: [_jsxs("div", { className: "flex items-center gap-1 mb-1", children: [_jsx(Target, { size: 12, className: "text-blue-400" }), _jsx("span", { className: "text-xs text-blue-400 font-semibold", children: "Recommended Target" })] }), exercise.recommendation.setRecommendations &&
                                                        exercise.recommendation.setRecommendations.length > 1 ? (_jsxs("div", { className: "text-xs text-blue-300", children: [exercise.recommendation.setRecommendations
                                                                .map((setRec) => `${setRec.recommendedWeight}kg × ${setRec.recommendedReps} reps`)
                                                                .join(" • "), exercise.recommendation.recommendedRPE && (_jsxs("span", { className: "ml-2 text-purple-300", children: ["\u2022 RPE ", exercise.recommendation.recommendedRPE] }))] })) : (_jsxs("p", { className: "text-xs text-blue-300", children: [exercise.recommendation.recommendedWeight, "kg \u00D7", " ", exercise.recommendation.recommendedReps, " reps", exercise.recommendation.recommendedRPE && (_jsxs("span", { className: "ml-2 text-purple-300", children: ["\u2022 RPE ", exercise.recommendation.recommendedRPE] }))] })), _jsx("p", { className: "text-xs text-blue-200 mt-1", children: exercise.recommendation.reasoning })] }))] }), _jsxs("div", { className: "relative flex items-center gap-2", ref: (el) => {
                                            if (el)
                                                exerciseMenuRefs.current.set(exercise.exerciseId, el);
                                        }, children: [_jsx("button", { onClick: () => openExerciseHistory(exercise), className: "text-[#9CA3AF] hover:text-white p-1 transition-colors", "aria-label": `Open ${exercise.name} history`, title: "Exercise history", children: _jsx(History, { size: 18 }) }), _jsx("button", { onClick: () => {
                                                    setOpenExerciseMenu((s) => s === exercise.exerciseId ? null : exercise.exerciseId);
                                                }, className: "text-white p-1", "aria-haspopup": "true", "aria-expanded": openExerciseMenu === exercise.exerciseId, children: _jsx(MoreHorizontal, {}) }), openExerciseMenu === exercise.exerciseId && (_jsxs("div", { className: "absolute right-0 mt-2 w-56 bg-[#1A1D23] border border-[#2F3544] rounded-lg shadow-lg z-50", children: [_jsx("div", { className: "px-3 py-2 text-xs text-[#9CA3AF] font-semibold", children: "EXERCISE" }), _jsx("button", { disabled: index === 0, className: `w-full text-left px-3 py-2 text-sm ${index === 0
                                                            ? "text-[#4B5563] cursor-not-allowed"
                                                            : "hover:bg-[#2A2E38] text-white"}`, onClick: () => moveExercise(exercise.exerciseId, "up"), children: "Move Exercise Up" }), _jsx("button", { disabled: index === todayExercises.length - 1, className: `w-full text-left px-3 py-2 text-sm ${index === todayExercises.length - 1
                                                            ? "text-[#4B5563] cursor-not-allowed"
                                                            : "hover:bg-[#2A2E38] text-white"}`, onClick: () => moveExercise(exercise.exerciseId, "down"), children: "Move Exercise Down" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => replaceExercise(exercise.exerciseId), children: "Replace Exercise" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => addSetToExercise(exercise.exerciseId), children: "Add Set" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => skipNextSet(exercise.exerciseId), children: "Skip Set" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-red-500 text-sm", onClick: () => deleteExerciseById(exercise.exerciseId), children: "Delete Exercise" })] }))] })] }), exercise.workoutSets.map((set, setIdx) => {
                                const isDropRow = isVisualDropSetRow(exercise.workoutSets, setIdx);
                                return (_jsxs("div", { className: `flex items-center gap-2 mt-3 ${isDropRow ? "ml-5" : ""}`, children: [_jsx("div", { className: "relative", ref: (el) => {
                                                const key = `${exercise.exerciseId}:${setIdx}`;
                                                if (el)
                                                    setMenuRefs.current.set(key, el);
                                            }, children: (() => {
                                                const key = `${exercise.exerciseId}:${setIdx}`;
                                                return (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => {
                                                                setOpenSetMenu((s) => (s === key ? null : key));
                                                            }, className: "w-4 text-[#9CA3AF] p-0", "aria-haspopup": "true", "aria-expanded": openSetMenu === key, children: "\u22EE" }), openSetMenu === key && (_jsxs("div", { className: "absolute left-8 w-44 mt-2 bg-[#1A1D23] border border-[#2F3544] rounded-lg shadow-lg z-50", children: [_jsx("div", { className: "px-3 py-2 text-xs text-[#9CA3AF] font-semibold", children: "SET" }), !set.isDropSet && !set.dropSetGroupId && (_jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => createDropSet(exercise.exerciseId, setIdx), children: "Create Drop Set" })), set.dropSetGroupId && (_jsxs(_Fragment, { children: [_jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => addAnotherDropSet(exercise.exerciseId, setIdx), children: "Add Another Drop Set" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => removeDropSetGroup(exercise.exerciseId, setIdx), children: "Remove Drop Set" })] })), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => addSetBelow(exercise.exerciseId, setIdx), children: "Add Set Below" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => skipSet(exercise.exerciseId, setIdx), children: "Skip Set" }), _jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-red-500 text-sm", onClick: () => deleteSet(exercise.exerciseId, setIdx), children: "Delete Set" })] }))] }));
                                            })() }), isDropRow && (_jsx("span", { className: "text-[10px] uppercase tracking-[0.2em] text-[#FBA3FF] min-w-[52px]", children: "Drop Set" })), _jsx("input", { type: "number", placeholder: "Weight (kg)", value: set.weight, disabled: setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed, onFocus: () => {
                                                setSelectedExerciseId(exercise.exerciseId);
                                                weightAtFocusRef.current = {
                                                    exerciseId: exercise.exerciseId,
                                                    setIndex: setIdx,
                                                    weight: set.weight,
                                                };
                                            }, onChange: (e) => {
                                                updateSetData(exercise.exerciseId, setIdx, "weight", e.target.value);
                                            }, onBlur: () => {
                                                finalizeWeightChange(exercise.exerciseId, setIdx);
                                            }, className: `bg-[#2A2E38] text-white rounded-md px-2 py-1 w-2/5 placeholder:text-[#5E6272] text-sm ${setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed
                                                ? "opacity-50 cursor-not-allowed"
                                                : ""}`, style: { MozAppearance: "textfield" }, inputMode: "decimal" }), _jsx("input", { type: "number", placeholder: "Reps", value: set.reps, disabled: setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed, onChange: (e) => {
                                                setSelectedExerciseId(exercise.exerciseId);
                                                updateSetData(exercise.exerciseId, setIdx, "reps", e.target.value);
                                            }, onFocus: () => setSelectedExerciseId(exercise.exerciseId), className: `bg-[#2A2E38] text-white rounded-md px-2 py-1 w-2/5 placeholder:text-[#5E6272] text-sm ${setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed
                                                ? "opacity-50 cursor-not-allowed"
                                                : ""}`, style: { MozAppearance: "textfield" }, inputMode: "numeric" }), (() => {
                                            const repsIcon = getSetRepIcon(set, getTargetRepsForSet(exercise, setIdx));
                                            return (_jsx("div", { className: "w-7 flex justify-center items-center flex-shrink-0", children: repsIcon ? (_jsx("img", { src: repsIcon.src, alt: repsIcon.alt, className: "w-5 h-5" })) : null }));
                                        })(), _jsx("button", { onClick: () => {
                                                // Only allow toggle if both weight and reps are filled
                                                if (set.weight.trim() && set.reps.trim()) {
                                                    toggleSetCompletion(exercise.exerciseId, setIdx);
                                                }
                                            }, disabled: (setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed) ||
                                                !set.weight.trim() ||
                                                !set.reps.trim(), className: `rounded-full p-1 transition-colors ${set.completed
                                                ? "bg-green-600 hover:bg-green-700"
                                                : ((setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed) ||
                                                    !set.weight.trim() ||
                                                    !set.reps.trim())
                                                    ? "bg-[#1a1a1a] cursor-not-allowed opacity-50"
                                                    : "bg-[#262A34] hover:bg-[#3a3f4a]"}`, children: _jsx("div", { className: `w-4 h-4 rounded-full flex items-center justify-center ${set.completed
                                                    ? "bg-white text-green-600"
                                                    : ((setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed) ||
                                                        !set.weight.trim() ||
                                                        !set.reps.trim())
                                                        ? "bg-[#404040]"
                                                        : "bg-[#5E6272]"}`, children: set.completed && _jsx(Check, { size: 10 }) }) })] }, setIdx));
                            }), _jsx("div", { className: "mt-4 flex justify-center", children: _jsxs("button", { onClick: () => addSet(exercise.exerciseId), className: "flex items-center gap-2 text-sm font-medium text-white bg-[#2A2E38] hover:bg-[#3a3f4a] px-4 py-1.5 rounded-full", children: ["Add Set", " ", _jsx("span", { className: "text-green-400 text-lg leading-none", children: "+" })] }) })] }, exercise.id)))) : (_jsxs("div", { className: "text-center py-8 text-[#5E6272]", children: [_jsx("p", { children: "No exercises scheduled for today" }), _jsx("button", { onClick: () => (window.location.href = "/programmes"), className: "mt-4 px-6 py-3 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium", children: "Select a Programme" })] }))] }), todayExercises.length > 0 && (_jsx("div", { className: "flex justify-center mt-6", children: _jsxs("button", { onClick: openAddExerciseModal, className: "flex items-center gap-2 text-sm font-medium text-[#0A0E1A] bg-[#00FFAD] hover:bg-[#00E599] px-6 py-3 rounded-lg transition-colors", children: [_jsx(Plus, { size: 16 }), "Add Exercise"] }) })), areAllSetsCompleted() && !workoutCompleted && (_jsx("div", { className: "fixed bottom-12 left-0 right-0 py-6 px-4 bg-[#0A0E1A]/95 backdrop-blur-sm border-t border-[#2F3544] animate-in slide-in-from-bottom-4 duration-500 z-[60]", children: _jsx("div", { className: "flex justify-center", children: _jsxs("button", { onClick: saveWorkout, disabled: savingWorkout, className: `px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 transition-all transform hover:scale-105 shadow-lg ${savingWorkout
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-[#00FFAD] hover:bg-[#00E599] text-[#0A0E1A] shadow-[#00FFAD]/25"}`, children: [_jsx(Check, { size: 20 }), savingWorkout ? "Saving Workout..." : "Complete Workout"] }) }) })), workoutCompleted && weeklySummary && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-[#1C1F26] rounded-2xl p-8 w-full max-w-md border border-[#2F3544] max-h-[90vh] overflow-y-auto", children: [_jsx("h2", { className: "text-white text-2xl font-bold text-center mb-6", children: "Congratulations on completing this workout!" }), _jsxs("div", { className: "space-y-4 mb-6", children: [weeklySummary.previousWorkoutComparison && (_jsxs("div", { className: "p-4 rounded-lg bg-[#2A2E38] border border-[#86FF99]/40", children: [_jsx("p", { className: "text-[#86FF99] font-semibold mb-1", children: "Compared to your previous workout" }), _jsxs("p", { className: "text-white font-semibold text-sm", children: ["Total volume: ", " ", _jsx("span", { className: weeklySummary.previousWorkoutComparison
                                                        .totalVolumeChangePct !== null &&
                                                        weeklySummary.previousWorkoutComparison
                                                            .totalVolumeChangePct >= 0
                                                        ? "text-[#86FF99]"
                                                        : "text-red-400", children: weeklySummary.previousWorkoutComparison
                                                        .totalVolumeChangePct === null
                                                        ? "No baseline"
                                                        : `${weeklySummary.previousWorkoutComparison.totalVolumeChangePct > 0 ? "+" : ""}${weeklySummary.previousWorkoutComparison.totalVolumeChangePct.toFixed(1)}%` })] }), weeklySummary.previousWorkoutComparison.exerciseDeltas &&
                                            weeklySummary.previousWorkoutComparison.exerciseDeltas
                                                .length > 0 && (_jsx("div", { className: "mt-3 space-y-1", children: weeklySummary.previousWorkoutComparison.exerciseDeltas
                                                .slice(0, 5)
                                                .map((delta, idx) => (_jsxs("p", { className: "text-[#A0AEC0] text-xs", children: [delta.exerciseName, ":", " ", delta.changePct === null
                                                        ? "no previous data"
                                                        : `${delta.changePct > 0 ? "+" : ""}${delta.changePct.toFixed(1)}% volume`] }, idx))) }))] })), weeklySummary.strengthGainVsLastWeek !== null &&
                                    !isNaN(weeklySummary.strengthGainVsLastWeek) && (_jsxs("div", { className: "p-4 rounded-lg bg-[#2A2E38] border border-[#00FFAD]/30", children: [_jsx("p", { className: "text-[#5E6272] text-sm mb-1", children: "Week-over-week" }), _jsxs("p", { className: "text-white font-semibold", children: ["You are", " ", _jsxs("span", { className: weeklySummary.strengthGainVsLastWeek > 0
                                                        ? "text-[#86FF99]"
                                                        : "text-red-400", children: [Math.abs(weeklySummary.strengthGainVsLastWeek).toFixed(1), "%", " ", weeklySummary.strengthGainVsLastWeek > 0
                                                            ? "stronger"
                                                            : "weaker"] }), " ", "this week compared to your previous week"] })] })), weeklySummary.strengthGainVsProgramStart !== null &&
                                    !isNaN(weeklySummary.strengthGainVsProgramStart) && (_jsxs("div", { className: "p-4 rounded-lg bg-[#2A2E38] border border-[#246BFD]/30", children: [_jsx("p", { className: "text-[#5E6272] text-sm mb-1", children: "Since programme start" }), _jsxs("p", { className: "text-white font-semibold", children: ["You are", " ", _jsxs("span", { className: "text-[#246BFD]", children: [weeklySummary.strengthGainVsProgramStart.toFixed(1), "%"] }), " ", "stronger than week 1 of this programme"] })] })), weeklySummary.personalRecords &&
                                    weeklySummary.personalRecords.length > 0 && (_jsxs("div", { className: "p-4 rounded-lg bg-[#2A2E38] border border-[#FBA3FF]/30", children: [_jsx("p", { className: "text-[#FBA3FF] font-semibold mb-2", children: "Personal Records Hit This Session" }), weeklySummary.personalRecords
                                            .slice(0, 8)
                                            .map((pr, idx) => (_jsxs("p", { className: "text-white text-sm", children: ["\u2022 ", pr.exerciseName, ": ", pr.metric, " ", pr.value, " ", "(prev ", pr.previousBest, ")"] }, idx)))] })), weeklySummary.newRepMaxes &&
                                    weeklySummary.newRepMaxes.length > 0 && (_jsxs("div", { className: "p-4 rounded-lg bg-[#2A2E38] border border-[#FBA3FF]/30", children: [_jsx("p", { className: "text-[#FBA3FF] font-semibold mb-2", children: "\uD83C\uDF89 New Rep Maxes!" }), weeklySummary.newRepMaxes.map((pr, idx) => (_jsxs("p", { className: "text-white text-sm", children: ["\u2022 ", pr.exerciseName, ": ", pr.reps, " reps"] }, idx)))] })), weeklySummary.recommendations &&
                                    weeklySummary.recommendations.length > 0 && (_jsxs("div", { className: "p-4 rounded-lg bg-[#2A2E38] border border-[#246BFD]/30", children: [_jsx("p", { className: "text-[#246BFD] font-semibold mb-2", children: "Next Session Recommendations" }), weeklySummary.recommendations.map((rec, idx) => (_jsxs("div", { className: "text-white text-sm mb-2 last:mb-0", children: [_jsx("p", { className: "font-medium", children: getExerciseName(rec.exerciseId) }), _jsxs("p", { className: "text-[#5E6272] text-xs", children: [rec.recommendedWeight, "kg \u00D7 ", rec.recommendedReps, " ", "reps (RPE ", rec.recommendedRPE, ")"] }), _jsx("p", { className: "text-[#5E6272] text-xs", children: rec.reasoning })] }, idx)))] }))] }), _jsx("button", { onClick: advanceToNextDay, className: "w-full bg-[#86FF99] hover:bg-[#6bd664] text-black font-semibold py-3 rounded-lg transition-colors", children: "Continue to Next Workout" })] }) })), showExerciseHistoryModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-[#1C1F26] rounded-2xl p-6 w-full max-w-lg border border-[#2F3544] max-h-[85vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-white text-xl font-bold", children: "Exercise History" }), _jsx("p", { className: "text-[#A0AEC0] text-sm mt-1", children: historyExerciseName })] }), _jsx("button", { onClick: () => setShowExerciseHistoryModal(false), className: "text-[#5E6272] hover:text-white", children: _jsx(X, { size: 24 }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto pr-1", children: historyLoading ? (_jsx("div", { className: "text-center py-8 text-[#5E6272]", children: "Loading history..." })) : historyError ? (_jsx("div", { className: "text-center py-8 text-red-400", children: historyError })) : exerciseHistory.length === 0 ? (_jsx("div", { className: "text-center py-8 text-[#5E6272]", children: "No previous history found for this exercise yet." })) : (_jsxs(_Fragment, { children: [(() => {
                                        const allSets = exerciseHistory.flatMap((entry) => entry.sets || []);
                                        const bestWeight = allSets.reduce((max, set) => Math.max(max, set.weight || 0), 0);
                                        const bestReps = allSets.reduce((max, set) => Math.max(max, set.reps || 0), 0);
                                        const latestSession = exerciseHistory[0];
                                        const latestVolume = (latestSession?.sets || []).reduce((sum, set) => sum + (set.weight || 0) * (set.reps || 0), 0);
                                        return (_jsxs("div", { className: "grid grid-cols-3 gap-2 mb-3", children: [_jsxs("div", { className: "bg-[#262A34] border border-[#2F3544] rounded-lg p-3 text-center", children: [_jsx("p", { className: "text-[#5E6272] text-xs", children: "Best Weight" }), _jsxs("p", { className: "text-white font-semibold", children: [bestWeight, "kg"] })] }), _jsxs("div", { className: "bg-[#262A34] border border-[#2F3544] rounded-lg p-3 text-center", children: [_jsx("p", { className: "text-[#5E6272] text-xs", children: "Best Reps" }), _jsxs("p", { className: "text-white font-semibold", children: [bestReps, " reps"] })] }), _jsxs("div", { className: "bg-[#262A34] border border-[#2F3544] rounded-lg p-3 text-center", children: [_jsx("p", { className: "text-[#5E6272] text-xs", children: "Latest Volume" }), _jsx("p", { className: "text-white font-semibold", children: latestVolume })] })] }));
                                    })(), _jsx("div", { className: "space-y-3", children: exerciseHistory.map((entry, idx) => (_jsxs("div", { className: "bg-[#262A34] border border-[#2F3544] rounded-xl p-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("p", { className: "text-white text-sm font-semibold", children: new Date(entry.date).toLocaleDateString() }), _jsxs("p", { className: "text-[#5E6272] text-xs", children: ["Week ", entry.weekNumber, ", Day ", entry.dayNumber] })] }), _jsx("div", { className: "space-y-1", children: [...entry.sets]
                                                        .sort((a, b) => a.setNumber - b.setNumber)
                                                        .map((set) => (_jsxs("p", { className: "text-[#D1D5DB] text-sm", children: ["Set ", set.setNumber, ": ", set.weight, "kg \u00D7 ", set.reps, " reps", set.setType === "drop" && (_jsx("span", { className: "ml-2 text-[10px] uppercase tracking-[0.2em] text-[#FBA3FF]", children: "Drop Set" }))] }, set.setNumber))) })] }, `${entry.date}-${idx}`))) })] })) })] }) })), showLeavingModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-[#1C1F26] rounded-2xl p-8 w-full max-w-md border border-[#2F3544] shadow-2xl", children: [_jsx("h2", { className: "text-white text-2xl font-bold text-center mb-4", children: "Leave Workout?" }), _jsx("p", { className: "text-[#A0AEC0] text-center mb-6", children: "Your workout progress will be saved. You can continue where you left off when you come back." }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => {
                                        console.log("Continue button clicked");
                                        setShowLeavingModal(false);
                                        setNextLocation(null);
                                    }, className: "flex-1 px-4 py-3 rounded-lg bg-[#2A2E38] hover:bg-[#3A3E48] text-white font-semibold transition-colors", children: "Continue Workout" }), _jsx("button", { onClick: () => {
                                        console.log("Leave button clicked, navigating to", nextLocation);
                                        setShowLeavingModal(false);
                                        // Keep the workout session saved - don't remove it!
                                        if (nextLocation) {
                                            navigate(nextLocation);
                                        }
                                    }, className: "flex-1 px-4 py-3 rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 font-semibold transition-colors border border-red-500/50", children: "Leave" })] })] }) })), showAddExerciseModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-[#1C1F26] rounded-2xl p-6 w-full max-w-lg border border-[#2F3544] max-h-[80vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h2", { className: "text-white text-xl font-bold", children: replaceTargetExerciseId ? "Replace Exercise" : "Add Exercise" }), _jsx("button", { onClick: closeAddExerciseModal, className: "text-[#5E6272] hover:text-white", children: _jsx(X, { size: 24 }) })] }), _jsx("div", { className: "mb-4", children: _jsx("div", { className: "flex flex-wrap gap-2", children: getUniqueMuscleGroups().map((group) => (_jsx("button", { onClick: () => setSelectedMuscleGroupFilter(group), className: `px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedMuscleGroupFilter === group
                                        ? "bg-[#00FFAD] text-black"
                                        : "bg-[#2A2E38] text-[#5E6272] hover:bg-[#3A3E48] hover:text-white"}`, children: group }, group))) }) }), _jsx("div", { className: "flex-1 overflow-y-auto", children: loadingExercises ? (_jsx("div", { className: "text-center py-8 text-[#5E6272]", children: "Loading exercises..." })) : (_jsx("div", { className: "space-y-2", children: getFilteredExercises().map((exercise) => {
                                    const isAlreadyInWorkout = todayExercises.some((ex) => ex.exerciseId === exercise.id &&
                                        ex.exerciseId !== replaceTargetExerciseId);
                                    return (_jsxs("button", { onClick: () => addExerciseToWorkout(exercise), disabled: isAlreadyInWorkout, className: `w-full text-left p-3 rounded-lg border transition-colors ${isAlreadyInWorkout
                                            ? "bg-[#2A2E38] border-[#404040] opacity-50 cursor-not-allowed"
                                            : "bg-[#2A2E38] border-[#2F3544] hover:bg-[#3A3E48] hover:border-[#00FFAD]"}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(MuscleIcon, { muscleGroup: exercise.muscleGroup, size: 24 }), _jsxs("div", { children: [_jsx("p", { className: "text-white font-medium", children: exercise.name }), _jsx("p", { className: "text-[#5E6272] text-sm", children: exercise.muscleGroup })] })] }), isAlreadyInWorkout && (_jsx("p", { className: "text-[#FBA3FF] text-xs mt-1", children: "Already in workout" }))] }, exercise.id));
                                }) })) })] }) })), _jsx("style", { children: `
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
