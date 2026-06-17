import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { pageTransition } from "../utils/animations";
import BottomBar from "../components/BottomBar";
import { ChevronLeft, Edit2, Check, X, Play, CheckCircle2, Lock, Dumbbell } from "lucide-react";

const MILESTONE_LABELS = ["25%", "50%", "75%", "100%"];

// Accessories for each main lift day — mirrors the programme generation in auth.ts
const GOAL_ACCESSORIES: Record<string, { name: string; sets: number; reps: string }[]> = {
  "quads_barbell_squat": [
    { name: "Romanian Deadlift",    sets: 4, reps: "8-10"   },
    { name: "Leg Press",            sets: 3, reps: "10-12"  },
    { name: "Lying Leg Curl",       sets: 3, reps: "12-15"  },
    { name: "Plank",                sets: 3, reps: "30-60s" },
  ],
  "chest_barbell_bench": [
    { name: "Incline DB Press",     sets: 4, reps: "8-10"  },
    { name: "Close-Grip Bench",     sets: 3, reps: "10-12" },
    { name: "Tricep Pushdown",      sets: 3, reps: "12-15" },
    { name: "Face Pulls",           sets: 3, reps: "15"    },
  ],
  "back_deadlift": [
    { name: "Barbell Row",          sets: 4, reps: "8-10"  },
    { name: "Seated Leg Curl",      sets: 3, reps: "10-12" },
    { name: "Leg Extensions",       sets: 3, reps: "12-15" },
    { name: "Hanging Leg Raise",    sets: 3, reps: "10-15" },
  ],
  "shoulders_ohp": [
    { name: "Dumbbell Row",         sets: 4, reps: "8-10"  },
    { name: "Skull Crushers",       sets: 3, reps: "10-12" },
    { name: "Lateral Raises",       sets: 3, reps: "12-15" },
    { name: "Reverse Flyes",        sets: 3, reps: "15"    },
  ],
};

export default function StrengthGoalDetail() {
  const navigate  = useNavigate();
  const { id }    = useParams<{ id: string }>();

  const [goal, setGoal]           = useState<any>(null);
  const [plan, setPlan]           = useState<any>(null);
  const [sessions, setSessions]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Edit target
  const [editingTarget, setEditingTarget] = useState(false);
  const [newTarget, setNewTarget]         = useState("");
  const [savingTarget, setSavingTarget]   = useState(false);

  // Week workout sheet
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [startingWorkout, setStartingWorkout] = useState(false);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`/auth/strength/goals/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setGoal(data.goal);
        setPlan(data.plan);
        setSessions(data.sessionHistory ?? []);
      })
      .catch(() => setError("Failed to load goal"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateTarget = async () => {
    const val = parseFloat(newTarget);
    if (!val || !goal) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setSavingTarget(true);
    try {
      const res = await fetch(`/auth/strength/goals/${id}/target`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ targetWeight: val }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setGoal(data.goal);
      setPlan(data.preview);
      setEditingTarget(false);
    } catch {
      alert("Failed to update target");
    } finally {
      setSavingTarget(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <p className="text-[#5E6272]">Loading…</p>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center px-4">
        <p className="text-red-400 text-center">{error ?? "Goal not found"}</p>
      </div>
    );
  }

  const progress = Math.min(
    ((goal.currentTm - goal.startTm) / Math.max(goal.targetWeight - goal.startTm, 1)) * 100,
    100,
  );

  const milestonePositions = [25, 50, 75, 100];

  const latestRevision = goal.timelineRevisions?.slice(-1)[0];

  const daysLeft = goal.projectedEndDate
    ? Math.ceil((new Date(goal.projectedEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const currentWeekNumber = Math.ceil((goal.sessionsCompleted ?? 0) / Math.max(goal.daysPerWeek, 1)) + 1;

  const handleStartWorkout = async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/workouts"); return; }
    setStartingWorkout(true);

    try {
      let programmeId: string | null = goal.programmeId ?? null;

      // No linked programme (old goal or link failed) — generate one from the goal's params
      if (!programmeId) {
        const genRes = await fetch("/auth/programmes/generate", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: "STRENGTH",
            experienceLevel: goal.experienceLevel,
            daysPerWeek: goal.daysPerWeek,
            equipment: "fullGym",
            weeks: goal.projectedWeeks,
            programmeName: `${goal.targetWeight}kg ${goal.liftName} Programme`,
          }),
        });
        const genData = await genRes.json();
        if (genData.id) {
          programmeId = genData.id;
          // Backfill the link so future taps don't regenerate
          await fetch(`/auth/strength/goals/${goal.id}/link-programme`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ programmeId }),
          });
          setGoal((g: any) => ({ ...g, programmeId }));
        }
      }

      if (programmeId) {
        // Check what is currently active
        const upRes = await fetch("/auth/user-programs", { headers: { Authorization: `Bearer ${token}` } });
        const userProgs = await upRes.json();
        const active = Array.isArray(userProgs) ? userProgs.find((p: any) => p.status === "ACTIVE") : null;

        if (active?.programmeId !== programmeId) {
          if (active) {
            await fetch(`/auth/user-programs/${active.id}`, {
              method: "PATCH",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ status: "CANCELLED" }),
            });
          }
          await fetch("/auth/user-programs", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ programmeId, startDate: new Date().toISOString() }),
          });
        }

        // Ensure the programme name reflects the goal
        await fetch(`/auth/programmes/${programmeId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: `${goal.targetWeight}kg ${goal.liftName} Programme` }),
        });

        // Seed the lift state with the goal's training max so week 1 has correct weights
        await fetch(`/auth/strength/goals/${goal.id}/init-lift-state`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      }

      navigate("/workouts");
    } catch {
      navigate("/workouts");
    }
  };

  // Find current week in plan
  const currentWeek = plan?.weeks?.find((w: any) => w.weekNumber === currentWeekNumber);

  const CYCLE_LABELS: Record<number, string> = { 1: "5/5/5+", 2: "3/3/3+", 3: "5/3/1+", 4: "Deload" };

  function mainSetSummary(w: any): string {
    const mainSets = (w.sets ?? []).filter((s: any) => !s.isFSL);
    if (!mainSets.length) return "";
    return mainSets
      .map((s: any) => `${s.targetWeight}kg×${s.isAmrap ? "AMRAP" : s.targetReps}`)
      .join(" / ");
  }

  return (
    <motion.div
      className="min-h-screen text-white flex flex-col p-4 pb-32"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate("/strength")} className="p-1 -ml-1">
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-lg font-bold text-white">{goal.liftName}</h1>
      </div>

      <div className="flex flex-col gap-5 mt-2">

        {/* Status badge + latest timeline change */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
              goal.status === "ACTIVE"
                ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/40"
                : "bg-[#2F3544] text-[#5E6272] border-[#2F3544]"
            }`}
          >
            {goal.status}
          </span>
          <span className="text-xs text-[#5E6272]">{goal.sessionsCompleted} sessions</span>
        </div>

        {latestRevision && (
          <div className="bg-amber-900/20 border border-[#EAB308]/30 rounded-xl px-3 py-2.5">
            <p className="text-[#EAB308] text-xs font-semibold mb-0.5">Timeline updated</p>
            <p className="text-[11px] text-[#9CA3AF]">{latestRevision.reason}</p>
          </div>
        )}

        {/* Progress bar with TM annotation */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-sm font-bold text-white">{goal.currentTm}kg</span>
            <span className="text-sm font-semibold text-[#EAB308]">{goal.targetWeight}kg</span>
          </div>
          <div className="relative h-3 bg-[#2F3544] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#EAB308] to-[#F59E0B] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
            {/* Milestone dots */}
            {milestonePositions.map(pct => (
              <div
                key={pct}
                className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 ${
                  progress >= pct
                    ? "bg-[#EAB308] border-[#F59E0B]"
                    : "bg-[#2F3544] border-[#3A3E4A]"
                }`}
                style={{ left: `calc(${pct}% - 4px)` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[#5E6272]">{progress.toFixed(0)}% complete</span>
            <span className="text-[10px] text-[#5E6272]">{(goal.targetWeight - goal.currentTm).toFixed(1)}kg to go</span>
          </div>
        </div>

        {/* Projection card */}
        <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{daysLeft != null && daysLeft > 0 ? `${daysLeft}d` : "—"}</p>
            <p className="text-[10px] text-[#5E6272] uppercase tracking-widest">Days Left</p>
          </div>
          <div className="text-center border-x border-[#2F3544]">
            <p className="text-lg font-bold text-[#EAB308]">{plan?.projectedWeeks ?? "—"}</p>
            <p className="text-[10px] text-[#5E6272] uppercase tracking-widest">Weeks</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">
              {goal.projectedEndDate
                ? new Date(goal.projectedEndDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                : "—"}
            </p>
            <p className="text-[10px] text-[#5E6272] uppercase tracking-widest">Target Date</p>
          </div>
        </div>

        {/* Update target */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#5E6272] uppercase tracking-widest">Target Weight</span>
            {!editingTarget ? (
              <button
                onClick={() => { setNewTarget(String(goal.targetWeight)); setEditingTarget(true); }}
                className="flex items-center gap-1 text-xs text-[#246BFD]"
              >
                <Edit2 size={11} /> Edit
              </button>
            ) : null}
          </div>
          {editingTarget ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                className="flex-1 bg-[#1C1F26] border border-[#EAB308]/60 rounded-xl px-3 py-2 text-white text-sm outline-none"
                inputMode="decimal"
              />
              <button
                onClick={handleUpdateTarget}
                disabled={savingTarget}
                className="px-3 py-2 rounded-xl bg-[#EAB308] text-black"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setEditingTarget(false)}
                className="px-3 py-2 rounded-xl bg-[#1C1F26] border border-[#2F3544] text-[#5E6272]"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <p className="text-lg font-bold text-white">{goal.targetWeight}kg</p>
          )}
        </div>

        {/* Week-by-week plan */}
        {plan?.weeks?.length > 0 && (
          <div>
            <p className="text-xs text-[#5E6272] uppercase tracking-widest mb-2">Week-by-Week Plan</p>
            <div className="flex flex-col gap-1.5">
              {plan.weeks.slice(0, 20).map((w: any) => {
                const isCurrent = w.weekNumber === currentWeekNumber;
                const isPast    = w.weekNumber < currentWeekNumber;
                const summary   = mainSetSummary(w);
                const cycleLabel = CYCLE_LABELS[w.cycleWeek] ?? "";

                const rowContent = (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      {/* state icon */}
                      {isPast ? (
                        <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                      ) : isCurrent ? (
                        <Play size={13} className="text-[#246BFD] flex-shrink-0" fill="currentColor" />
                      ) : (
                        <Lock size={12} className="text-[#3A3E4A] flex-shrink-0" />
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-semibold ${isCurrent ? "text-[#246BFD]" : isPast ? "text-[#5E6272]" : "text-white"}`}>
                            Wk {w.weekNumber}
                          </span>
                          {!w.isDeload && (
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              isCurrent ? "bg-[#246BFD]/20 text-[#8EC5FF]" : "bg-[#2F3544] text-[#5E6272]"
                            }`}>
                              {cycleLabel}
                            </span>
                          )}
                          {w.isDeload && (
                            <span className="text-[9px] font-bold text-[#5E6272] uppercase tracking-widest bg-[#2F3544] px-1.5 py-0.5 rounded">
                              Deload
                            </span>
                          )}
                          {w.milestone && (
                            <span className="text-[9px] font-bold text-[#EAB308] uppercase bg-[#EAB308]/15 px-1.5 py-0.5 rounded">
                              {w.milestone}
                            </span>
                          )}
                        </div>
                        {summary && (
                          <p className="text-[10px] text-[#5E6272] mt-0.5 truncate">{summary}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isCurrent ? "text-[#EAB308]" : isPast ? "text-[#5E6272]" : "text-white"}`}>
                          {w.estimatedTm}kg
                        </p>
                        <p className="text-[10px] text-[#5E6272]">TM</p>
                      </div>
                      {isCurrent && (
                        <ChevronLeft size={14} className="text-[#246BFD] rotate-180" />
                      )}
                    </div>
                  </>
                );

                return (
                  <button
                    key={w.weekNumber}
                    onClick={() => setSelectedWeek(w)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 active:scale-[0.98] transition-transform text-left ${
                      isCurrent
                        ? "bg-[#246BFD]/15 border border-[#246BFD]/40 py-3"
                        : isPast
                        ? "bg-[#1C1F26]/60 border border-[#2F3544]/60 opacity-60"
                        : "bg-[#1C1F26] border border-[#2F3544]"
                    }`}
                  >
                    {rowContent}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Session history */}
        {sessions.length > 0 && (
          <div>
            <p className="text-xs text-[#5E6272] uppercase tracking-widest mb-2">Recent Sessions</p>
            <div className="flex flex-col gap-1.5">
              {sessions.slice(0, 5).map((s: any) => {
                const reps = (() => {
                  try { return JSON.parse(s.reps_per_set ?? "[]"); } catch { return []; }
                })();
                return (
                  <div
                    key={s.id}
                    className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-3 py-2.5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm text-white font-medium">
                        {s.weights_used ? (() => { try { return JSON.parse(s.weights_used)[0]; } catch { return "—"; } })() : "—"}kg
                      </p>
                      <p className="text-[11px] text-[#5E6272]">
                        {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{reps.join(" / ")} reps</p>
                      <p className={`text-[11px] ${s.hit_target ? "text-emerald-400" : "text-[#5E6272]"}`}>
                        {s.hit_target ? "Target hit" : "Missed"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <BottomBar onLogout={() => { localStorage.removeItem("token"); navigate("/login"); }} />

      {/* ── Week Workout Sheet ── */}
      <AnimatePresence>
        {selectedWeek && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/70 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWeek(null)}
            />

            {/* Sheet */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#12151E] border-t border-[#2F3544] rounded-t-2xl max-h-[85vh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[#2F3544]" />
              </div>

              <div className="px-4 pb-8 pt-2">
                {/* Sheet header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-[#5E6272] uppercase tracking-widest">
                      Week {selectedWeek.weekNumber} · {CYCLE_LABELS[selectedWeek.cycleWeek] ?? ""}
                      {selectedWeek.isDeload ? " · Deload" : ""}
                    </p>
                    <h2 className="text-lg font-bold text-white mt-0.5">{goal.liftName} Workout</h2>
                  </div>
                  <button
                    onClick={() => setSelectedWeek(null)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>

                {/* TM badge */}
                <div className="inline-flex items-center gap-1.5 bg-[#EAB308]/10 border border-[#EAB308]/30 rounded-full px-3 py-1 mb-5">
                  <span className="text-xs text-[#EAB308] font-semibold">
                    Training Max: {selectedWeek.estimatedTm}kg
                  </span>
                </div>

                {/* Main lift sets */}
                <p className="text-xs text-[#5E6272] uppercase tracking-widest mb-2">Main Lift</p>
                <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl overflow-hidden mb-5">
                  {/* header row */}
                  <div className="grid grid-cols-3 px-3 py-2 border-b border-[#2F3544]">
                    <span className="text-[10px] text-[#5E6272] uppercase tracking-widest">Set</span>
                    <span className="text-[10px] text-[#5E6272] uppercase tracking-widest text-center">Weight</span>
                    <span className="text-[10px] text-[#5E6272] uppercase tracking-widest text-right">Reps</span>
                  </div>
                  {(selectedWeek.sets ?? []).map((s: any, i: number) => (
                    <div
                      key={i}
                      className={`grid grid-cols-3 px-3 py-2.5 ${
                        i < (selectedWeek.sets?.length ?? 0) - 1 ? "border-b border-[#2F3544]/50" : ""
                      } ${s.isFSL ? "bg-[#EAB308]/5" : ""}`}
                    >
                      <span className="text-sm text-[#5E6272]">
                        {s.isFSL ? `FSL ${i - 2}` : `${i + 1}`}
                      </span>
                      <span className="text-sm font-semibold text-white text-center">
                        {s.targetWeight > 0 ? `${s.targetWeight}kg` : "—"}
                        {!s.isFSL && s.percentageOfTm > 0 && (
                          <span className="text-[10px] text-[#5E6272] ml-1">
                            ({Math.round(s.percentageOfTm * 100)}%)
                          </span>
                        )}
                      </span>
                      <div className="flex justify-end">
                        {s.isAmrap ? (
                          <span className="text-[9px] font-bold text-[#2DD4BF] px-1.5 py-0.5 rounded bg-[#2DD4BF]/15 border border-[#2DD4BF]/40">
                            AMRAP
                          </span>
                        ) : s.isFSL ? (
                          <span className="text-sm text-[#EAB308]">5</span>
                        ) : (
                          <span className="text-sm text-white">{s.targetReps}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Accessories */}
                {(GOAL_ACCESSORIES[goal.exerciseId] ?? []).length > 0 && (
                  <>
                    <p className="text-xs text-[#5E6272] uppercase tracking-widest mb-2">Accessories</p>
                    <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl overflow-hidden mb-6">
                      {(GOAL_ACCESSORIES[goal.exerciseId] ?? []).map((acc, i, arr) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-3 py-2.5 ${
                            i < arr.length - 1 ? "border-b border-[#2F3544]/50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Dumbbell size={12} className="text-[#3A3E4A] flex-shrink-0" />
                            <span className="text-sm text-white">{acc.name}</span>
                          </div>
                          <span className="text-sm text-[#5E6272]">{acc.sets}×{acc.reps}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* CTA — only for current week */}
                {selectedWeek.weekNumber === currentWeekNumber ? (
                  <button
                    onClick={handleStartWorkout}
                    disabled={startingWorkout}
                    className="w-full py-4 rounded-xl bg-[#246BFD] text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
                  >
                    {startingWorkout ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Play size={16} fill="white" />
                    )}
                    {startingWorkout ? "Starting…" : "Start This Workout"}
                  </button>
                ) : selectedWeek.weekNumber < currentWeekNumber ? (
                  <div className="w-full py-3 rounded-xl bg-[#1C1F26] border border-[#2F3544] text-center">
                    <p className="text-sm text-[#5E6272]">This workout has already been completed</p>
                  </div>
                ) : (
                  <div className="w-full py-3 rounded-xl bg-[#1C1F26] border border-[#2F3544] text-center">
                    <p className="text-sm text-[#5E6272]">Complete previous weeks first</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
