import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { pageTransition } from "../utils/animations";
import { Heart, Search, X, Dumbbell, Plus, Check, ChevronDown } from "lucide-react";
import MuscleIcon from "../components/MuscleIcon";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  category: string;
  equipment?: string | null;
  instructions?: string | null;
  movementPattern?: string | null;
  defaultRepMin?: number | null;
  defaultRepMax?: number | null;
  isCustom: boolean;
  isFavourited: boolean;
};

const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Quadriceps", "Hamstrings", "Glutes", "Calves", "Abs", "Forearms",
];
const CATEGORIES   = ["Compound", "Isolation", "Cardio", "Flexibility", "Other"];
const EQUIPMENT_OPTIONS = ["Barbell", "Dumbbell", "Cable", "Machine", "Hammer Strength", "Bodyweight", "Kettlebell", "Resistance Band", "Smith Machine", "Other"];
const MUSCLE_ORDER = [...MUSCLE_GROUPS, "Full Body"];

function normaliseMuscle(m: string) {
  const lc = m?.toLowerCase() ?? "";
  if (lc.includes("quad") || lc.includes("leg")) return "Quadriceps";
  if (lc.includes("ham"))  return "Hamstrings";
  if (lc.includes("glute")) return "Glutes";
  if (lc.includes("calf") || lc.includes("calve")) return "Calves";
  if (lc.includes("shoulder") || lc.includes("delt")) return "Shoulders";
  if (lc.includes("bicep"))  return "Biceps";
  if (lc.includes("tricep")) return "Triceps";
  if (lc.includes("chest") || lc.includes("pec")) return "Chest";
  if (lc.includes("back") || lc.includes("lat") || lc.includes("trap")) return "Back";
  if (lc.includes("forearm")) return "Forearms";
  if (lc.includes("ab") || lc.includes("core")) return "Abs";
  return m;
}

function formatMovementPattern(pattern: string | null | undefined): string | null {
  if (!pattern) return null;
  return pattern.split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export default function ExerciseLibrary() {
  const navigate = useNavigate();
  const [exercises, setExercises]   = useState<Exercise[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [muscleFilter, setMuscleFilter]   = useState<"all" | "favourites" | string>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<"all" | string>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate]     = useState(false);
  const [createName, setCreateName]     = useState("");
  const [createMuscle, setCreateMuscle] = useState(MUSCLE_GROUPS[0]);
  const [createCategory, setCreateCategory] = useState(CATEGORIES[0]);
  const [createEquipment, setCreateEquipment] = useState("");
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch("/auth/exercises", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { setExercises(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [navigate, token]);

  const toggleFavourite = async (e: React.MouseEvent, exerciseId: string) => {
    e.stopPropagation();
    if (!token || togglingId) return;
    setTogglingId(exerciseId);
    setExercises((prev) => prev.map((ex) => ex.id === exerciseId ? { ...ex, isFavourited: !ex.isFavourited } : ex));
    try {
      const res = await fetch(`/auth/exercises/${exerciseId}/favourite`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
    } catch {
      setExercises((prev) => prev.map((ex) => ex.id === exerciseId ? { ...ex, isFavourited: !ex.isFavourited } : ex));
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) { setCreateError("Exercise name is required"); return; }
    setCreating(true); setCreateError(null);
    try {
      const res = await fetch("/auth/exercises/custom", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), muscleGroup: createMuscle, category: createCategory, equipment: createEquipment || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const newEx: Exercise = { ...(await res.json()), isFavourited: false };
      setExercises((prev) => [...prev, newEx].sort((a, b) => a.name.localeCompare(b.name)));
      setCreateSuccess(true);
      setTimeout(() => {
        setShowCreate(false);
        setCreateName(""); setCreateMuscle(MUSCLE_GROUPS[0]);
        setCreateCategory(CATEGORIES[0]); setCreateEquipment(""); setCreateSuccess(false);
      }, 900);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create exercise");
    } finally {
      setCreating(false);
    }
  };

  // Distinct equipment types present in data
  const equipmentTypes = useMemo(() => {
    const s = new Set(exercises.map((ex) => ex.equipment?.trim()).filter(Boolean) as string[]);
    return EQUIPMENT_OPTIONS.filter((eq) => s.has(eq));
  }, [exercises]);

  const muscleGroups = useMemo(() => {
    const present = new Set(exercises.map((ex) => normaliseMuscle(ex.muscleGroup)));
    return MUSCLE_ORDER.filter((m) => present.has(m));
  }, [exercises]);

  const filtered = useMemo(() => {
    let list = exercises;
    if (muscleFilter === "favourites") list = list.filter((ex) => ex.isFavourited);
    else if (muscleFilter !== "all")   list = list.filter((ex) => normaliseMuscle(ex.muscleGroup) === muscleFilter);
    if (equipmentFilter !== "all")     list = list.filter((ex) => ex.equipment === equipmentFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((ex) => ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q));
    }
    return list;
  }, [exercises, muscleFilter, equipmentFilter, search]);

  const grouped = useMemo(() => {
    if (muscleFilter !== "all" && muscleFilter !== "favourites") return null;
    const map: Record<string, Exercise[]> = {};
    for (const ex of filtered) {
      const key = normaliseMuscle(ex.muscleGroup);
      if (!map[key]) map[key] = [];
      map[key].push(ex);
    }
    return map;
  }, [filtered, muscleFilter]);

  const handleLogout = () => { localStorage.removeItem("token"); navigate("/login"); };
  const favouriteCount = exercises.filter((ex) => ex.isFavourited).length;

  return (
    <motion.div
      className="min-h-screen bg-[#0A0E1A] flex flex-col pb-24"
      initial="hidden" animate="visible" variants={pageTransition}
    >
      <TopBar
        title="Exercise Library"
        pageIcon={<Dumbbell size={18} />}
        menuItems={[
          { label: "Dashboard",     onClick: () => navigate("/dashboard") },
          { label: "Programmes",    onClick: () => navigate("/programmes") },
          { label: "Workouts",      onClick: () => navigate("/workouts") },
          { label: "Track Metrics", onClick: () => navigate("/metrics") },
          { label: "Settings",      onClick: () => navigate("/settings") },
        ]}
      />

      <div className="px-4 mt-4 space-y-3">
        {/* Search + Create button row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5E6272]" />
            <input
              type="text"
              placeholder="Search exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#141824] border border-[#2F3544] rounded-xl pl-9 pr-8 py-2.5 text-white text-sm placeholder-[#5E6272] focus:outline-none focus:border-[#246BFD]/60 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6272]">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-[#246BFD] rounded-xl text-white text-sm font-semibold active:scale-95 transition-transform"
          >
            <Plus size={16} />
            New
          </button>
        </div>

        {/* Muscle / Favourites filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <button
            onClick={() => setMuscleFilter("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              muscleFilter === "all" ? "bg-[#246BFD]/20 border-[#246BFD]/60 text-white" : "bg-transparent border-[#2F3544] text-[#6B7280]"
            }`}
          >
            All ({exercises.length})
          </button>
          <button
            onClick={() => setMuscleFilter("favourites")}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              muscleFilter === "favourites" ? "bg-pink-500/20 border-pink-500/60 text-white" : "bg-transparent border-[#2F3544] text-[#6B7280]"
            }`}
          >
            <Heart size={11} className={muscleFilter === "favourites" ? "fill-pink-400 text-pink-400" : ""} />
            Favourites{favouriteCount > 0 ? ` (${favouriteCount})` : ""}
          </button>
          {muscleGroups.map((mg) => (
            <button key={mg} onClick={() => setMuscleFilter(mg)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                muscleFilter === mg ? "bg-[#246BFD]/20 border-[#246BFD]/60 text-white" : "bg-transparent border-[#2F3544] text-[#6B7280]"
              }`}
            >
              {mg}
            </button>
          ))}
        </div>

        {/* Equipment filter chips */}
        {equipmentTypes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <button
              onClick={() => setEquipmentFilter("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                equipmentFilter === "all" ? "bg-[#00FFAD]/15 border-[#00FFAD]/50 text-white" : "bg-transparent border-[#2F3544] text-[#6B7280]"
              }`}
            >
              All Equipment
            </button>
            {equipmentTypes.map((eq) => (
              <button key={eq} onClick={() => setEquipmentFilter(eq)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  equipmentFilter === eq ? "bg-[#00FFAD]/15 border-[#00FFAD]/50 text-white" : "bg-transparent border-[#2F3544] text-[#6B7280]"
                }`}
              >
                {eq}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex-1 px-4 mt-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center pt-20">
            <div className="w-8 h-8 rounded-full border-2 border-[#246BFD]/30 border-t-[#246BFD] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 gap-3 text-center">
            <Dumbbell size={36} className="text-[#2F3544]" />
            <p className="text-[#6B7280] text-sm">
              {muscleFilter === "favourites" ? "No favourites yet — tap the heart on any exercise" : "No exercises match your filters"}
            </p>
          </div>
        ) : grouped ? (
          MUSCLE_ORDER.filter((mg) => grouped[mg]?.length).map((mg) => (
            <div key={mg}>
              <div className="flex items-center gap-2 mb-2">
                <MuscleIcon muscleGroup={mg} size={26} />
                <h3 className="text-[#A0AEC0] text-xs font-semibold uppercase tracking-widest">{mg}</h3>
                <span className="text-[#4B5563] text-xs">({grouped[mg].length})</span>
              </div>
              <div className="space-y-2">
                {grouped[mg].map((ex) => (
                  <ExerciseRow key={ex.id} exercise={ex} onToggleFavourite={toggleFavourite} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {filtered.map((ex) => (
              <ExerciseRow key={ex.id} exercise={ex} onToggleFavourite={toggleFavourite} />
            ))}
          </div>
        )}
      </div>

      {/* Create exercise modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              className="w-full max-w-[430px] bg-[#141824] rounded-t-2xl border-t border-x border-[#2F3544] p-6 pb-10"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-semibold text-base">Create Custom Exercise</h3>
                <button onClick={() => setShowCreate(false)} className="text-[#5E6272] p-1"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider block mb-1.5">Exercise Name *</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Single-Arm Cable Row"
                    autoFocus
                    className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#5E6272] focus:outline-none focus:border-[#246BFD]/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider block mb-1.5">Muscle Group *</label>
                  <AppSelect
                    value={createMuscle}
                    onChange={setCreateMuscle}
                    options={MUSCLE_GROUPS}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider block mb-1.5">Category *</label>
                    <AppSelect
                      value={createCategory}
                      onChange={setCreateCategory}
                      options={CATEGORIES}
                    />
                  </div>
                  <div>
                    <label className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider block mb-1.5">Equipment</label>
                    <AppSelect
                      value={createEquipment}
                      onChange={setCreateEquipment}
                      options={EQUIPMENT_OPTIONS}
                      placeholder="None"
                    />
                  </div>
                </div>

                {createError && <p className="text-red-400 text-xs">{createError}</p>}

                <button
                  onClick={handleCreate}
                  disabled={creating || createSuccess}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    createSuccess
                      ? "bg-[#00FFAD]/20 border border-[#00FFAD]/40 text-[#00FFAD]"
                      : "bg-[#246BFD] text-white active:scale-[0.98] disabled:opacity-60"
                  }`}
                >
                  {createSuccess ? (
                    <><Check size={16} /> Added to library</>
                  ) : creating ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <><Plus size={16} /> Create Exercise</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomBar onLogout={handleLogout} />
    </motion.div>
  );
}

function AppSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setOpenUp(window.innerHeight - rect.bottom < 240);
    }
    setOpen((o) => !o);
  };

  const posClass = openUp ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]";
  const animY = openUp ? 4 : -4;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-2.5 text-white text-sm font-medium text-left flex items-center justify-between gap-2 focus:outline-none focus:border-[#246BFD]/60 transition-colors"
      >
        <span className={value ? "text-white" : "text-[#5E6272]"}>
          {value || placeholder || "Select…"}
        </span>
        <ChevronDown
          size={14}
          className={`text-[#5E6272] flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: animY }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: animY }}
            transition={{ duration: 0.12 }}
            className={`absolute left-0 right-0 ${posClass} bg-[#1C1F26] border border-[#2F3544] rounded-xl overflow-hidden z-[120] shadow-2xl max-h-52 overflow-y-auto`}
          >
            {placeholder && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${!value ? "text-white bg-[#246BFD]/15" : "text-[#9CA3AF] active:bg-white/5"}`}
              >
                {placeholder}
              </button>
            )}
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${value === opt ? "text-white bg-[#246BFD]/15" : "text-[#9CA3AF] active:bg-white/5"}`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExerciseRow({
  exercise,
  onToggleFavourite,
}: {
  exercise: Exercise;
  onToggleFavourite: (e: React.MouseEvent, id: string) => void;
}) {
  const pattern = formatMovementPattern(exercise.movementPattern);

  return (
    <div className="bg-[#141824] border border-[#2F3544] rounded-xl px-4 py-3 flex items-center gap-3">
      <MuscleIcon muscleGroup={exercise.muscleGroup} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{exercise.name}</p>
        {(exercise.equipment || pattern || exercise.isCustom) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {exercise.equipment && (
              <span className="text-[10px] text-[#6B7280] bg-white/5 rounded-md px-1.5 py-0.5">{exercise.equipment}</span>
            )}
            {pattern && (
              <span className="text-[10px] text-[#246BFD]/80 bg-[#246BFD]/10 rounded-md px-1.5 py-0.5">{pattern}</span>
            )}
            {exercise.isCustom && (
              <span className="text-[10px] text-[#00FFAD]/80 bg-[#00FFAD]/10 rounded-md px-1.5 py-0.5">Custom</span>
            )}
          </div>
        )}
      </div>
      <button
        onClick={(e) => onToggleFavourite(e, exercise.id)}
        className="p-1.5 flex-shrink-0 transition-transform active:scale-90"
        aria-label={exercise.isFavourited ? "Unfavourite" : "Favourite"}
      >
        <Heart size={18} className={exercise.isFavourited ? "fill-pink-500 text-pink-500" : "text-[#4B5563]"} />
      </button>
    </div>
  );
}
