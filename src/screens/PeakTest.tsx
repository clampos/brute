import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { pageTransition } from "../utils/animations";
import { ChevronLeft, Zap, CheckCircle, XCircle, AlertTriangle, Trophy } from "lucide-react";

type Phase = "overview" | "warmup" | "attempt1" | "feel1" | "attempt2" | "feel2" | "attempt3" | "result";
type Feel = "easy" | "solid" | "hard" | "missed";

interface WarmUpSet { setNumber: number; weight: number; reps: number; percent: number; }
interface Attempt { suggestedWeight: number; actualWeight: string; result: "hit" | "miss" | null; feel: Feel | null; }

const FEEL_OPTIONS: { value: Feel; label: string; emoji: string; desc: string }[] = [
  { value: "easy",   label: "Easy",   emoji: "💪", desc: "Could have done more" },
  { value: "solid",  label: "Solid",  emoji: "✅", desc: "Good, controlled lift" },
  { value: "hard",   label: "Hard",   emoji: "😅", desc: "Near maximum effort" },
  { value: "missed", label: "Missed", emoji: "❌", desc: "Failed the lift" },
];

export default function PeakTest() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [phase, setPhase]         = useState<Phase>("overview");
  const [goal, setGoal]           = useState<any>(null);
  const [warmUp, setWarmUp]       = useState<WarmUpSet[]>([]);
  const [warmUpDone, setWarmUpDone] = useState<Set<number>>(new Set());
  const [attempts, setAttempts]   = useState<Attempt[]>([
    { suggestedWeight: 0, actualWeight: "", result: null, feel: null },
    { suggestedWeight: 0, actualWeight: "", result: null, feel: null },
    { suggestedWeight: 0, actualWeight: "", result: null, feel: null },
  ]);
  const [currentAttempt, setCurrentAttempt] = useState(0); // 0-indexed
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [overrideWarning, setOverrideWarning] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!id || !token) return;
    fetch(`/auth/strength/goals/${id}/peak-week`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setGoal(data.goal);
        setWarmUp(data.maxAttemptWarmUp ?? []);
        const suggested1 = data.attempt1Suggested ?? 0;
        setAttempts(a => {
          const next = [...a];
          next[0] = { ...next[0], suggestedWeight: suggested1, actualWeight: String(suggested1) };
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const logAttempt = async (idx: number) => {
    if (!goal || !token) return;
    const a = attempts[idx];
    const actualWeight = parseFloat(a.actualWeight);
    if (!actualWeight || !a.result || !a.feel) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/auth/strength/goals/${id}/peak-week/log-attempt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptNumber: idx + 1,
          actualWeight,
          result: a.result,
          feel: a.feel,
        }),
      });
      const data = await res.json();

      // Set next attempt suggestion
      if (idx < 2 && data.nextSuggestion) {
        setAttempts(prev => {
          const next = [...prev];
          next[idx + 1] = { ...next[idx + 1], suggestedWeight: data.nextSuggestion, actualWeight: String(data.nextSuggestion) };
          return next;
        });
      }
    } catch {}
    setSubmitting(false);
  };

  const handleAttemptResult = async (idx: number, result: "hit" | "miss") => {
    setAttempts(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], result };
      return next;
    });
  };

  const handleFeel = async (idx: number, feel: Feel) => {
    const updated = [...attempts];
    updated[idx] = { ...updated[idx], feel };
    setAttempts(updated);
    await logAttempt(idx);

    if (idx < 2) {
      setCurrentAttempt(idx + 1);
      setPhase(`attempt${idx + 2}` as Phase);
    } else {
      setPhase("result");
    }
  };

  const completeTest = async (action: string) => {
    if (!token) return;
    setSubmitting(true);
    const bestHit = attempts.filter(a => a.result === "hit").map(a => parseFloat(a.actualWeight));
    const bestWeight = bestHit.length > 0 ? Math.max(...bestHit) : null;

    try {
      await fetch(`/auth/strength/goals/${id}/peak-week/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ bestSuccessfulWeight: bestWeight, postTestAction: action }),
      });
      navigate(`/strength/goals/${id}`);
    } catch {}
    setSubmitting(false);
  };

  if (loading || !goal) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#EAB308]/30 border-t-[#EAB308] rounded-full animate-spin" />
      </div>
    );
  }

  const goalWeight = goal.targetWeight;
  const liftName  = goal.liftName;

  return (
    <motion.div
      className="min-h-screen text-white flex flex-col p-4 pb-32"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(`/strength/goals/${id}`)} className="p-1 -ml-1">
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-[#EAB308] font-bold uppercase tracking-widest">Max Attempt Day</p>
          <h1 className="text-lg font-black text-white">{liftName} — {goalWeight}kg</h1>
        </div>
        <Zap size={20} className="text-[#EAB308]" fill="currentColor" />
      </div>

      <AnimatePresence mode="wait">

        {/* OVERVIEW */}
        {phase === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <div className="bg-[#EAB308]/10 border border-[#EAB308]/40 rounded-2xl p-5">
              <p className="text-[#EAB308] font-bold text-lg mb-1">Today is your max attempt day.</p>
              <p className="text-sm text-[#9CA3AF]">You'll complete a warm-up sequence then have 3 attempts to hit <span className="text-white font-semibold">{goalWeight}kg</span>. No accessories — this session is the test only.</p>
            </div>
            <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl p-4 space-y-2">
              <p className="text-xs text-[#5E6272] uppercase tracking-widest mb-3">Session structure</p>
              {[
                `Warm-up sequence (${warmUp.length} sets)`,
                `Attempt 1 — auto-suggested ${attempts[0].suggestedWeight}kg`,
                `Attempt 2 — based on attempt 1 feel`,
                `Attempt 3 — ${goalWeight}kg (default)`,
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#EAB308]/20 border border-[#EAB308]/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#EAB308]">{i + 1}</span>
                  </div>
                  <span className="text-sm text-[#9CA3AF]">{step}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setPhase("warmup")}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#EAB308] to-[#F59E0B] text-black font-black text-base"
            >
              Begin Warm-Up
            </button>
          </motion.div>
        )}

        {/* WARM-UP */}
        {phase === "warmup" && (
          <motion.div key="warmup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-white">Warm-Up Sequence</h2>
            <p className="text-sm text-[#5E6272]">Complete each set before moving on. Tap when done.</p>
            {warmUp.map((set) => {
              const done = warmUpDone.has(set.setNumber);
              return (
                <button
                  key={set.setNumber}
                  onClick={() => setWarmUpDone(prev => new Set([...prev, set.setNumber]))}
                  className={`flex items-center justify-between rounded-xl px-4 py-3.5 border transition-all ${
                    done ? "bg-emerald-900/20 border-emerald-500/40" : "bg-[#1C1F26] border-[#2F3544]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {done
                      ? <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-[#2F3544] flex-shrink-0" />
                    }
                    <span className={`text-sm font-semibold ${done ? "text-emerald-400" : "text-white"}`}>
                      {set.weight}kg × {set.reps}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#5E6272] bg-[#2F3544] px-2 py-0.5 rounded-full">{set.percent}%</span>
                </button>
              );
            })}
            {warmUpDone.size === warmUp.length && (
              <button
                onClick={() => { setPhase("attempt1"); setCurrentAttempt(0); }}
                className="w-full mt-2 py-4 rounded-xl bg-[#EAB308] text-black font-black text-base"
              >
                Warm-Up Complete → Attempt 1
              </button>
            )}
          </motion.div>
        )}

        {/* ATTEMPT */}
        {(["attempt1", "attempt2", "attempt3"] as Phase[]).map((p, idx) =>
          phase === p ? (
            <motion.div key={p} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-[#EAB308] uppercase tracking-widest">Attempt {idx + 1} of 3</p>
                <h2 className="text-2xl font-black text-white mt-0.5">Load the bar</h2>
              </div>

              <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl p-4">
                <p className="text-xs text-[#5E6272] mb-2">Suggested weight</p>
                <p className="text-4xl font-black text-[#EAB308]">{attempts[idx].suggestedWeight}kg</p>
                <p className="text-xs text-[#5E6272] mt-1">
                  {idx === 2 ? "Goal weight" : idx === 0 ? "92–95% of goal" : "Based on attempt 1 feel"}
                </p>
              </div>

              <div>
                <label className="text-xs text-[#5E6272] uppercase tracking-widest block mb-2">Actual weight loaded (kg)</label>
                <input
                  type="number"
                  value={attempts[idx].actualWeight}
                  onChange={e => {
                    const val = e.target.value;
                    const num = parseFloat(val);
                    setOverrideWarning(num > attempts[idx].suggestedWeight + 5);
                    setAttempts(prev => { const next = [...prev]; next[idx] = { ...next[idx], actualWeight: val }; return next; });
                  }}
                  className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 text-white text-2xl font-bold outline-none focus:border-[#EAB308]/60"
                  inputMode="decimal"
                />
                {overrideWarning && (
                  <p className="text-amber-400 text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={12} /> More than 5kg above suggestion — are you sure?
                  </p>
                )}
              </div>

              <p className="text-sm text-[#5E6272] text-center">Perform the lift, then mark the result.</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { handleAttemptResult(idx, "hit"); setPhase(`feel${idx + 1}` as Phase); }}
                  disabled={!attempts[idx].actualWeight}
                  className="py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <CheckCircle size={18} /> Hit
                </button>
                <button
                  onClick={() => { handleAttemptResult(idx, "miss"); setPhase(`feel${idx + 1}` as Phase); }}
                  disabled={!attempts[idx].actualWeight}
                  className="py-4 rounded-xl bg-red-700/40 border border-red-500/40 text-red-300 font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <XCircle size={18} /> Missed
                </button>
              </div>
            </motion.div>
          ) : null
        )}

        {/* FEEL prompts */}
        {(["feel1", "feel2", "feel3"] as Phase[]).map((p, idx) =>
          phase === p ? (
            <motion.div key={p} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-[#EAB308] uppercase tracking-widest">Attempt {idx + 1} — {attempts[idx].actualWeight}kg — {attempts[idx].result === "hit" ? "✅ Hit" : "❌ Missed"}</p>
                <h2 className="text-xl font-black text-white mt-0.5">How did that feel?</h2>
                <p className="text-sm text-[#5E6272] mt-1">This determines your next attempt suggestion.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {FEEL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleFeel(idx, opt.value)}
                    disabled={submitting}
                    className="bg-[#1C1F26] border border-[#2F3544] rounded-xl p-4 text-left hover:border-[#EAB308]/40 transition-colors disabled:opacity-50"
                  >
                    <span className="text-2xl block mb-1">{opt.emoji}</span>
                    <p className="text-sm font-bold text-white">{opt.label}</p>
                    <p className="text-[10px] text-[#5E6272] mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null
        )}

        {/* RESULT */}
        {phase === "result" && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-5">
            {(() => {
              const hits = attempts.filter(a => a.result === "hit");
              const bestHit = hits.length > 0 ? Math.max(...hits.map(a => parseFloat(a.actualWeight))) : null;
              const goalHit = bestHit !== null && bestHit >= goalWeight;
              return (
                <>
                  <div className={`rounded-2xl p-6 text-center ${goalHit ? "bg-emerald-900/20 border border-emerald-500/40" : "bg-[#1C1F26] border border-[#2F3544]"}`}>
                    {goalHit
                      ? <Trophy size={40} className="text-[#EAB308] mx-auto mb-3" />
                      : <Zap size={40} className="text-[#8EC5FF] mx-auto mb-3" />
                    }
                    <h2 className="text-2xl font-black text-white mb-1">
                      {goalHit ? `Goal hit! ${bestHit}kg` : `Best: ${bestHit ?? 0}kg`}
                    </h2>
                    <p className="text-sm text-[#9CA3AF]">
                      {goalHit
                        ? `You've hit your ${goalWeight}kg ${liftName} goal. Your TM will be updated from this result.`
                        : `You didn't hit ${goalWeight}kg today, but ${bestHit}kg is your new baseline. Your TM will be recalculated.`}
                    </p>
                  </div>

                  {/* Attempt summary */}
                  <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl p-4 space-y-2">
                    <p className="text-xs text-[#5E6272] uppercase tracking-widest mb-2">Attempt Summary</p>
                    {attempts.map((a, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-[#5E6272]">Attempt {i + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{a.actualWeight}kg</span>
                          {a.result === "hit"
                            ? <CheckCircle size={14} className="text-emerald-400" />
                            : a.result === "miss"
                            ? <XCircle size={14} className="text-red-400" />
                            : null
                          }
                        </div>
                      </div>
                    ))}
                  </div>

                  {goalHit ? (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => completeTest("set_new_goal")}
                        disabled={submitting}
                        className="w-full py-4 rounded-xl bg-[#EAB308] text-black font-black disabled:opacity-50"
                      >
                        Set a new target
                      </button>
                      <button
                        onClick={() => completeTest("continue_without_goal")}
                        disabled={submitting}
                        className="w-full py-3 rounded-xl bg-[#1C1F26] border border-[#2F3544] text-white font-semibold disabled:opacity-50"
                      >
                        Continue without a goal
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => completeTest("keep_goal_revised_timeline")}
                        disabled={submitting}
                        className="w-full py-4 rounded-xl bg-[#246BFD] text-white font-black disabled:opacity-50"
                      >
                        Keep {goalWeight}kg goal (revised timeline)
                      </button>
                      <button
                        onClick={() => completeTest("set_intermediate_goal")}
                        disabled={submitting}
                        className="w-full py-3 rounded-xl bg-[#1C1F26] border border-[#2F3544] text-white font-semibold disabled:opacity-50"
                      >
                        Set an intermediate target instead
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
