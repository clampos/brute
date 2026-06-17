import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { pageTransition } from "../utils/animations";
import { ChevronLeft, ChevronRight, Zap, History, X } from "lucide-react";

const BIG_4 = [
  { exerciseId: "quads_barbell_squat",  name: "Squat",          desc: "Primary lower-body strength builder" },
  { exerciseId: "chest_barbell_bench",   name: "Bench Press",    desc: "Upper-body pushing strength" },
  { exerciseId: "back_deadlift",         name: "Deadlift",       desc: "Full-body pulling strength" },
  { exerciseId: "shoulders_ohp",         name: "Overhead Press", desc: "Vertical pressing power" },
];

const EXPERIENCE_OPTIONS = ["beginner", "intermediate", "advanced"];

export default function StrengthGoalCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [selectedLift, setSelectedLift] = useState<string | null>(null);

  // Step 2 — 1RM
  const [currentOneRm, setCurrentOneRm]         = useState<string>("");
  const [autoDetectedRm, setAutoDetectedRm]     = useState<number | null>(null);
  const [loadingOneRm, setLoadingOneRm]         = useState(false);
  const [manuallyEdited, setManuallyEdited]     = useState(false);

  // Step 3
  const [targetWeight, setTargetWeight]     = useState<string>("");
  const [daysPerWeek, setDaysPerWeek]       = useState(4);
  const [experienceLevel, setExperienceLevel] = useState("intermediate");

  // Step 4
  const [preview, setPreview]           = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saveStep, setSaveStep]         = useState<string>("");
  const [error, setError]               = useState<string | null>(null);

  const selectedLiftName = BIG_4.find(l => l.exerciseId === selectedLift)?.name ?? "";

  // Auto-fetch 1RM when step 2 activates
  useEffect(() => {
    if (step !== 2 || !selectedLift) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoadingOneRm(true);
    setManuallyEdited(false);
    fetch(`/auth/strength/lifts/${selectedLift}/state`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const estimate = data.estimatedOneRm;
        if (estimate && estimate > 0) {
          const rounded = Math.round(estimate);
          setAutoDetectedRm(rounded);
          setCurrentOneRm(String(rounded));
        } else {
          setAutoDetectedRm(null);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingOneRm(false));
  }, [step, selectedLift]);

  // Fetch preview when step 4 activates
  useEffect(() => {
    if (step !== 4 || !selectedLift || !currentOneRm || !targetWeight) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoadingPreview(true);
    setError(null);
    fetch("/auth/strength/goals/preview", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId: selectedLift,
        current1rm: parseFloat(currentOneRm),
        targetWeight: parseFloat(targetWeight),
        experienceLevel,
        daysPerWeek,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setPreview(data.preview ?? data);
      })
      .catch(() => setError("Failed to compute preview"))
      .finally(() => setLoadingPreview(false));
  }, [step]);

  const handleCreate = async () => {
    if (!selectedLift || !currentOneRm || !targetWeight || !preview) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    setError(null);

    try {
      // 1. Create the goal record
      setSaveStep("Creating goal…");
      const goalRes = await fetch("/auth/strength/goals", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: selectedLift,
          current1rm: parseFloat(currentOneRm),
          targetWeight: parseFloat(targetWeight),
          experienceLevel,
          daysPerWeek,
          preview,
        }),
      });
      const goalData = await goalRes.json();
      if (goalData.error) { setError(goalData.error); setSaving(false); return; }

      // 2. Generate a STRENGTH programme with the chosen parameters
      setSaveStep("Building your programme…");
      const genRes = await fetch("/auth/programmes/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: "STRENGTH",
          experienceLevel,
          daysPerWeek,
          equipment: "fullGym",
          weeks: preview?.projectedWeeks ?? undefined,
          programmeName: `${targetWeight}kg ${selectedLiftName} Programme`,
        }),
      });
      const genData = await genRes.json();
      if (genData.error || !genData.id) {
        // Programme gen failed — still navigate to goal (non-fatal)
        navigate(`/strength/goals/${goalData.goal.id}`);
        return;
      }

      // 3. Cancel any existing active programme and activate the new one
      setSaveStep("Activating programme…");
      const userProgsRes = await fetch("/auth/user-programs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userProgs = await userProgsRes.json();
      const active = Array.isArray(userProgs)
        ? userProgs.find((p: any) => p.status === "ACTIVE")
        : null;
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
        body: JSON.stringify({ programmeId: genData.id, startDate: new Date().toISOString() }),
      });

      // Link the generated programme back to this goal record
      await fetch(`/auth/strength/goals/${goalData.goal.id}/link-programme`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ programmeId: genData.id }),
      });

      // Navigate to workouts so the user sees their first session
      navigate("/workouts");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const canAdvanceStep1 = !!selectedLift;
  const canAdvanceStep2 = !!currentOneRm && parseFloat(currentOneRm) > 0;
  const canAdvanceStep3 =
    !!targetWeight &&
    parseFloat(targetWeight) > parseFloat(currentOneRm || "0");

  const tm = currentOneRm ? Math.round(parseFloat(currentOneRm) * 0.9 * 2) / 2 : null;

  return (
    <motion.div
      className="min-h-screen text-white flex flex-col p-4 pb-24"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        {step > 1 && !saving && (
          <button onClick={() => setStep(s => s - 1)} className="p-1 -ml-1">
            <ChevronLeft size={22} className="text-white" />
          </button>
        )}
        <h1 className="text-lg font-bold text-white flex-1">Set a Strength Goal</h1>
        {!saving && (
          <button onClick={() => navigate(-1)} className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X size={18} className="text-white" />
          </button>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mt-4 mb-6">
        {[1, 2, 3, 4].map(n => (
          <div
            key={n}
            className={`rounded-full transition-all duration-300 ${
              n === step ? "w-6 h-2 bg-[#EAB308]" : n < step ? "w-2 h-2 bg-[#EAB308]/50" : "w-2 h-2 bg-[#2F3544]"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Pick Lift ── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <h2 className="text-xl font-bold text-white">Which lift?</h2>
            <p className="text-sm text-[#5E6272] -mt-2">Select the lift you want to set a goal for.</p>
            {BIG_4.map(lift => (
              <button
                key={lift.exerciseId}
                onClick={() => setSelectedLift(lift.exerciseId)}
                className={`w-full text-left rounded-xl px-4 py-4 border transition-all ${
                  selectedLift === lift.exerciseId
                    ? "bg-[#EAB308]/20 border-[#EAB308]/60"
                    : "bg-[#1C1F26] border-[#2F3544]"
                }`}
              >
                <p className={`font-semibold ${selectedLift === lift.exerciseId ? "text-[#EAB308]" : "text-white"}`}>
                  {lift.name}
                </p>
                <p className="text-xs text-[#5E6272] mt-0.5">{lift.desc}</p>
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Step 2: Current 1RM ── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <h2 className="text-xl font-bold text-white">{selectedLiftName} — Current 1RM</h2>

            {loadingOneRm ? (
              <div className="flex items-center gap-2 bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3">
                <Zap size={16} className="text-[#EAB308] animate-pulse" />
                <p className="text-sm text-[#5E6272]">Estimating from your workout history…</p>
              </div>
            ) : autoDetectedRm ? (
              <div className="flex items-start gap-3 bg-[#EAB308]/10 border border-[#EAB308]/40 rounded-xl px-4 py-3">
                <History size={18} className="text-[#EAB308] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Estimated 1RM: <span className="text-[#EAB308]">{autoDetectedRm}kg</span>
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    Calculated from your workout history using the Epley formula.
                    Adjust below if this doesn't feel right.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3">
                <p className="text-sm text-[#5E6272]">
                  No workout history found for this lift. Enter your current 1RM manually.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs text-[#5E6272] uppercase tracking-widest mb-2">
                {autoDetectedRm ? "Override 1RM (optional)" : "Current 1RM"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder={autoDetectedRm ? String(autoDetectedRm) : "e.g. 100"}
                  value={currentOneRm}
                  onChange={e => {
                    setCurrentOneRm(e.target.value);
                    setManuallyEdited(true);
                  }}
                  className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 text-white text-xl font-bold placeholder:text-[#5E6272] focus:border-[#EAB308]/60 outline-none"
                  inputMode="decimal"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5E6272] text-sm">kg</span>
              </div>
            </div>

            {tm && (
              <p className="text-xs text-[#5E6272]">
                Training max (90%): <span className="text-white font-semibold">{tm}kg</span>
              </p>
            )}
          </motion.div>
        )}

        {/* ── Step 3: Target + Settings ── */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-5"
          >
            <div>
              <h2 className="text-xl font-bold text-white">Set your target</h2>
              <p className="text-sm text-[#5E6272] mt-1">
                Current 1RM: <span className="text-white font-semibold">{currentOneRm}kg</span>
              </p>
            </div>

            <div>
              <label className="block text-xs text-[#5E6272] uppercase tracking-widest mb-2">
                Target Weight (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder={`Above ${currentOneRm}kg`}
                  value={targetWeight}
                  onChange={e => setTargetWeight(e.target.value)}
                  className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 text-white text-xl font-bold placeholder:text-[#5E6272] focus:border-[#EAB308]/60 outline-none"
                  inputMode="decimal"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5E6272] text-sm">kg</span>
              </div>
              {targetWeight && parseFloat(targetWeight) > 0 && (
                <p className="text-xs text-[#5E6272] mt-1.5">
                  +{(parseFloat(targetWeight) - parseFloat(currentOneRm || "0")).toFixed(1)}kg above current
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-[#5E6272] uppercase tracking-widest mb-2">
                Training Days Per Week
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map(d => (
                  <button
                    key={d}
                    onClick={() => setDaysPerWeek(d)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      daysPerWeek === d
                        ? "bg-[#EAB308]/20 border-[#EAB308]/60 text-[#EAB308]"
                        : "bg-[#1C1F26] border-[#2F3544] text-[#5E6272]"
                    }`}
                  >
                    {d}×
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#5E6272] uppercase tracking-widest mb-2">
                Experience Level
              </label>
              <div className="flex flex-col gap-2">
                {EXPERIENCE_OPTIONS.map(level => (
                  <button
                    key={level}
                    onClick={() => setExperienceLevel(level)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all capitalize ${
                      experienceLevel === level
                        ? "bg-[#EAB308]/20 border-[#EAB308]/60 text-[#EAB308]"
                        : "bg-[#1C1F26] border-[#2F3544] text-[#5E6272]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Preview & Confirm ── */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <div>
              <h2 className="text-xl font-bold text-white">Your Programme</h2>
              <p className="text-sm text-[#5E6272] mt-1">
                Confirming will generate your strength programme and activate it.
              </p>
            </div>

            {loadingPreview ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <Zap size={28} className="text-[#EAB308] animate-pulse" />
                <p className="text-sm text-[#5E6272]">Building your programme…</p>
              </div>
            ) : error ? (
              <div className="bg-red-900/20 border border-red-500/40 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            ) : preview ? (
              <>
                {preview.isUnrealistic && (
                  <div className="bg-amber-900/20 border border-[#EAB308]/40 rounded-xl px-4 py-3">
                    <p className="text-[#EAB308] text-sm font-semibold mb-1">Long-term goal</p>
                    <p className="text-xs text-[#9CA3AF]">
                      This will realistically take {preview.realisticProjection}.
                      The programme below covers the first 12 months.
                    </p>
                  </div>
                )}

                {/* Summary card */}
                <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-3 border-b border-[#2F3544]">
                    <div>
                      <p className="text-xs text-[#5E6272] uppercase tracking-widest">Goal</p>
                      <p className="text-lg font-bold text-white mt-0.5">{selectedLiftName} — {targetWeight}kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#5E6272] uppercase tracking-widest">Est. date</p>
                      <p className="text-sm font-semibold text-[#EAB308] mt-0.5">
                        {new Date(preview.projectedEndDate).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">{preview.projectedWeeks}</p>
                      <p className="text-[10px] text-[#5E6272] uppercase tracking-widest">Weeks</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white capitalize">{preview.programmeType}</p>
                      <p className="text-[10px] text-[#5E6272] uppercase tracking-widest">Method</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{daysPerWeek}×</p>
                      <p className="text-[10px] text-[#5E6272] uppercase tracking-widest">Per week</p>
                    </div>
                  </div>
                </div>

                {/* What's included */}
                <div className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4">
                  <p className="text-xs text-[#5E6272] uppercase tracking-widest mb-3">Your programme includes</p>
                  <div className="flex flex-col gap-2">
                    {daysPerWeek >= 4 ? (
                      <>
                        <ProgramDay n={1} title="Squat Day" desc="Squat 3×5 + lower accessories" />
                        <ProgramDay n={2} title="Bench Day" desc="Bench 3×5 + push accessories" />
                        <ProgramDay n={3} title="Deadlift Day" desc="Deadlift 1×5 + pull accessories" />
                        <ProgramDay n={4} title="OHP Day" desc="Overhead Press 3×5 + shoulder/tricep accessories" />
                      </>
                    ) : (
                      <>
                        <ProgramDay n={1} title="Day A" desc="Squat + Bench + Row" />
                        <ProgramDay n={2} title="Day B" desc="Deadlift + OHP + Row" />
                        {daysPerWeek >= 3 && <ProgramDay n={3} title="Day A (repeat)" desc="Squat + Bench + Row" />}
                      </>
                    )}
                  </div>
                </div>

                {/* First 4 weeks */}
                <div>
                  <p className="text-xs text-[#5E6272] uppercase tracking-widest mb-2">Progression preview</p>
                  <div className="flex flex-col gap-1.5">
                    {preview.weeks?.slice(0, 4).map((w: any) => (
                      <div
                        key={w.weekNumber}
                        className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">Week {w.weekNumber}</span>
                          {w.isDeload && (
                            <span className="text-[9px] font-bold text-[#5E6272] uppercase tracking-widest bg-[#2F3544] px-1.5 py-0.5 rounded">
                              Deload
                            </span>
                          )}
                          {w.milestone && (
                            <span className="text-[9px] font-bold text-[#EAB308] bg-[#EAB308]/15 px-1.5 py-0.5 rounded">
                              {w.milestone}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-white">{w.estimatedTm}kg</span>
                          <span className="text-xs text-[#5E6272] ml-1">TM</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0B0F1A] border-t border-[#1C1F26]">
        {saving ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Zap size={20} className="text-[#EAB308] animate-pulse" />
            <p className="text-sm text-[#5E6272]">{saveStep}</p>
          </div>
        ) : step < 4 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={
              (step === 1 && !canAdvanceStep1) ||
              (step === 2 && !canAdvanceStep2) ||
              (step === 3 && !canAdvanceStep3)
            }
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              (step === 1 && !canAdvanceStep1) || (step === 2 && !canAdvanceStep2) || (step === 3 && !canAdvanceStep3)
                ? "bg-[#1C1F26] text-[#5E6272] border border-[#2F3544]"
                : "bg-[#EAB308] text-black"
            }`}
          >
            Continue
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={loadingPreview || !!error || !preview}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
              loadingPreview || !!error || !preview
                ? "bg-[#1C1F26] text-[#5E6272] border border-[#2F3544]"
                : "bg-[#EAB308] text-black"
            }`}
          >
            Generate Programme & Start Training
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ProgramDay({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-[#EAB308]/20 border border-[#EAB308]/40 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-[#EAB308]">{n}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-[#5E6272]">{desc}</p>
      </div>
    </div>
  );
}
