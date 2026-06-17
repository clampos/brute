import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { pageTransition } from "../utils/animations";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import { Zap, Target, Plus, ChevronRight, Dumbbell } from "lucide-react";

const BIG_4 = [
  { exerciseId: "quads_barbell_squat",  name: "Squat",          emoji: "🏋️" },
  { exerciseId: "chest_barbell_bench",   name: "Bench",          emoji: "💪" },
  { exerciseId: "back_deadlift",         name: "Deadlift",       emoji: "🔩" },
  { exerciseId: "shoulders_ohp",         name: "OHP",            emoji: "⬆️" },
];

export default function Strength() {
  const navigate = useNavigate();
  const [status, setStatus]   = useState<any>(null);
  const [goals, setGoals]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    Promise.all([
      fetch("/auth/strength/status",  { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/auth/strength/goals",   { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([s, g]) => {
      setStatus(s);
      setGoals(g.goals ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const activeGoals = goals.filter(g => g.status === "ACTIVE");

  return (
    <motion.div
      className="min-h-screen text-white flex flex-col p-4 pb-32"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      <TopBar title="Strength Hub" />

      <div className="flex flex-col gap-6 mt-2">

        {/* My Lifts */}
        <section>
          <h2 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase mb-3">
            My Lifts
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {BIG_4.map((lift) => {
              const data = status?.lifts?.[lift.exerciseId];
              const tm   = data?.state?.trainingMax ?? data?.estimatedTm;
              const oneRm = data?.estimatedOneRm;
              return (
                <div
                  key={lift.exerciseId}
                  className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4"
                >
                  <p className="text-[11px] text-[#5E6272] uppercase tracking-widest mb-1">
                    {lift.name}
                  </p>
                  {loading ? (
                    <p className="text-2xl font-bold text-[#5E6272]">—</p>
                  ) : tm ? (
                    <>
                      <p className="text-2xl font-bold text-white">{tm}kg</p>
                      <p className="text-[11px] text-[#5E6272] mt-0.5">TM</p>
                    </>
                  ) : oneRm ? (
                    <>
                      <p className="text-2xl font-bold text-[#EAB308]">{oneRm}kg</p>
                      <p className="text-[11px] text-[#5E6272] mt-0.5">Est. 1RM</p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-[#3A3E4A]">—</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Goal Programmes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
              Goal Programmes
            </h2>
            <button
              onClick={() => navigate("/strength/goals/new")}
              className="flex items-center gap-1 text-xs text-[#EAB308] font-semibold"
            >
              <Plus size={13} />
              Set a Goal
            </button>
          </div>

          {loading ? null : activeGoals.length === 0 ? (
            <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-8 flex flex-col items-center gap-3">
              <Target size={28} className="text-[#3A3E4A]" />
              <p className="text-sm text-[#5E6272] text-center">
                No active strength goals yet.
              </p>
              <button
                onClick={() => navigate("/strength/goals/new")}
                className="px-4 py-2 rounded-xl bg-[#EAB308]/20 border border-[#EAB308]/40 text-[#EAB308] text-sm font-semibold"
              >
                Set Your First Goal
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeGoals.map((goal) => {
                const progress = Math.min(
                  ((goal.currentTm - goal.startTm) / Math.max(goal.targetWeight - goal.startTm, 1)) * 100,
                  100,
                );
                const daysLeft = goal.projectedEndDate
                  ? Math.ceil((new Date(goal.projectedEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                return (
                  <button
                    key={goal.id}
                    onClick={() => navigate(`/strength/goals/${goal.id}`)}
                    className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4 text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">{goal.liftName}</span>
                      <ChevronRight size={14} className="text-[#5E6272]" />
                    </div>
                    <p className="text-xs text-[#5E6272] mb-2">
                      {goal.currentTm}kg → {goal.targetWeight}kg
                    </p>
                    <div className="h-1.5 bg-[#2F3544] rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#EAB308] to-[#F59E0B] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#5E6272]">{progress.toFixed(0)}% complete</span>
                      {daysLeft != null && daysLeft > 0 && (
                        <span className="text-[11px] text-[#5E6272]">{daysLeft}d left</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Strength Programme */}
        <section>
          <h2 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase mb-3">
            Strength Programme
          </h2>
          {status?.activeProgramme ? (
            <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-[#EAB308]" />
                <span className="text-sm font-semibold text-white">Active Programme</span>
              </div>
              <p className="text-xs text-[#5E6272]">
                Manage your programme in the Programmes tab.
              </p>
            </div>
          ) : (
            <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-6 flex flex-col items-center gap-3">
              <Dumbbell size={28} className="text-[#3A3E4A]" />
              <p className="text-sm text-[#5E6272] text-center">
                No active strength programme.
              </p>
              <button
                onClick={() => navigate("/programmes", { state: { openGenerate: true } })}
                className="px-4 py-2 rounded-xl bg-[#EAB308]/20 border border-[#EAB308]/40 text-[#EAB308] text-sm font-semibold"
              >
                Generate Strength Programme
              </button>
            </div>
          )}
        </section>

      </div>

      <BottomBar onLogout={() => { localStorage.removeItem("token"); navigate("/login"); }} />
    </motion.div>
  );
}
