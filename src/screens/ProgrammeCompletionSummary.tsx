import React from "react";
import { Trophy, TrendingUp, Dumbbell, Calendar, ArrowRight, RefreshCw, ArrowDown, Sparkles } from "lucide-react";

interface GenerateParams {
  goal: string;
  experienceLevel: string;
  daysPerWeek: number;
  priorityMuscle: string;
}

interface CompletionSummaryData {
  signals: {
    completionRate: number | null;
    progressionRate: number | null;
    avgRpe: number | null;
    goalMet: boolean | null;
  };
  recommendation: string | null;
  nextProgramme: {
    id: string;
    name: string;
    daysPerWeek: number;
    weeks: number;
    bodyPartFocus: string;
    experienceLevel: string | null;
    progressionFocus: string;
  } | null;
  suggestedGenerateParams: GenerateParams | null;
  stats: {
    totalWorkoutsCompleted: number;
    totalSets: number;
    totalVolumeKg: number;
    weeksCompleted: number;
    topExerciseName: string | null;
    topExerciseImprovement: number;
  };
  programmeName: string;
  programmeWeeks: number;
}

interface Props {
  data: CompletionSummaryData;
  onStartNextProgramme: (programmeId: string) => void;
  onGenerateProgramme: (params: GenerateParams) => void;
  onBrowseProgrammes: () => void;
  onDismiss: () => void;
}

const recommendationConfig = {
  ADVANCE: {
    label: "Ready to Advance",
    description: "You crushed this programme. Time to level up with a more challenging plan.",
    generateLabel: "Generate a harder programme",
    icon: ArrowRight,
    color: "text-green-400",
    bg: "bg-green-400/10 border-green-400/20",
  },
  REPEAT: {
    label: "Repeat for Best Results",
    description: "You made solid progress. Another cycle will build a stronger foundation.",
    generateLabel: "Generate a similar programme",
    icon: RefreshCw,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
  },
  STEP_BACK: {
    label: "Try an Easier Programme",
    description: "This programme was very demanding. A lighter programme will help you recover and rebuild.",
    generateLabel: "Generate an easier programme",
    icon: ArrowDown,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
  },
};

const levelLabel = (level: string | null) => {
  if (!level) return "";
  return level.charAt(0).toUpperCase() + level.slice(1);
};

export default function ProgrammeCompletionSummary({ data, onStartNextProgramme, onGenerateProgramme, onBrowseProgrammes, onDismiss }: Props) {
  const recKey = (data.recommendation ?? "REPEAT") as keyof typeof recommendationConfig;
  const rec = recommendationConfig[recKey] ?? recommendationConfig.REPEAT;
  const RecIcon = rec.icon;

  const completionPct = data.signals.completionRate != null
    ? Math.round(data.signals.completionRate * 100)
    : null;

  const defaultGenerateParams: GenerateParams = data.suggestedGenerateParams ?? {
    goal: "MUSCLE_BUILDING",
    experienceLevel: "intermediate",
    daysPerWeek: 4,
    priorityMuscle: "fullBody",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto" style={{ background: "linear-gradient(135deg, #0a0f1f 0%, #111827 100%)" }}>
      <div className="flex flex-col min-h-full px-4 pb-8 pt-12">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Programme Complete!</h1>
          <p className="text-white/60 text-sm">
            {data.programmeName} · {data.stats.weeksCompleted} weeks
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-card p-3 text-center rounded-xl">
            <p className="text-xl font-bold text-white">{data.stats.totalWorkoutsCompleted}</p>
            <p className="text-white/50 text-xs mt-0.5">Workouts</p>
          </div>
          <div className="glass-card p-3 text-center rounded-xl">
            <p className="text-xl font-bold text-white">{data.stats.totalSets}</p>
            <p className="text-white/50 text-xs mt-0.5">Total Sets</p>
          </div>
          <div className="glass-card p-3 text-center rounded-xl">
            <p className="text-xl font-bold text-white">
              {data.stats.totalVolumeKg >= 1000
                ? `${(data.stats.totalVolumeKg / 1000).toFixed(1)}t`
                : `${data.stats.totalVolumeKg}kg`}
            </p>
            <p className="text-white/50 text-xs mt-0.5">Volume</p>
          </div>
        </div>

        {/* Completion rate + top exercise */}
        <div className="glass-card rounded-xl p-4 mb-6 flex flex-col gap-3">
          {completionPct !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Attendance</span>
              </div>
              <span className={`text-sm font-semibold ${completionPct >= 85 ? "text-green-400" : completionPct >= 70 ? "text-amber-400" : "text-red-400"}`}>
                {completionPct}%
              </span>
            </div>
          )}
          {data.stats.topExerciseName && data.stats.topExerciseImprovement > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span className="truncate max-w-[160px]">{data.stats.topExerciseName}</span>
              </div>
              <span className="text-green-400 text-sm font-semibold">+{data.stats.topExerciseImprovement}% 1RM</span>
            </div>
          )}
        </div>

        {/* Recommendation */}
        <div className={`rounded-xl border p-4 mb-6 ${rec.bg}`}>
          <div className="flex items-center gap-2 mb-2">
            <RecIcon className={`w-4 h-4 ${rec.color}`} />
            <span className={`font-semibold text-sm ${rec.color}`}>{rec.label}</span>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">{rec.description}</p>
        </div>

        {/* Next programme card (existing programme match) */}
        {data.nextProgramme && (
          <div className="glass-card rounded-xl p-4 mb-4">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Recommended Next</p>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-semibold">{data.nextProgramme.name}</p>
                <p className="text-white/50 text-xs mt-0.5">
                  {[levelLabel(data.nextProgramme.experienceLevel), `${data.nextProgramme.daysPerWeek} days/week`, `${data.nextProgramme.weeks} weeks`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Dumbbell className="w-5 h-5 text-white/30 mt-0.5 flex-shrink-0" />
            </div>
            <button
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF8C42] to-[#FFC857] text-white font-semibold text-sm"
              onClick={() => onStartNextProgramme(data.nextProgramme!.id)}
            >
              Start This Programme
            </button>
          </div>
        )}

        {/* Generate a tailored programme */}
        <div className={`rounded-xl p-4 mb-6 border ${data.nextProgramme ? "glass-card border-white/10" : "bg-gradient-to-br from-[#246BFD]/20 to-[#BE9EFF]/20 border-[#246BFD]/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={`w-4 h-4 ${data.nextProgramme ? "text-white/50" : "text-[#BE9EFF]"}`} />
            <p className={`text-xs uppercase tracking-wider font-medium ${data.nextProgramme ? "text-white/50" : "text-[#BE9EFF]"}`}>
              {data.nextProgramme ? "Or" : "Recommended"}
            </p>
          </div>
          <p className={`font-semibold mb-1 ${data.nextProgramme ? "text-white/80" : "text-white"}`}>
            Generate a Tailored Programme
          </p>
          <p className="text-white/50 text-xs mb-3 leading-relaxed">
            Let AI build a programme matched to your performance data — {defaultGenerateParams.daysPerWeek} days/week, {levelLabel(defaultGenerateParams.experienceLevel)} level.
          </p>
          <button
            className={`w-full py-3 rounded-xl font-semibold text-sm ${data.nextProgramme
              ? "glass-card text-white/70 border border-white/10"
              : "bg-gradient-to-r from-[#246BFD] to-[#BE9EFF] text-white"
            }`}
            onClick={() => onGenerateProgramme(defaultGenerateParams)}
          >
            {rec.generateLabel}
          </button>
        </div>

        {/* Browse all / dismiss */}
        <div className="flex flex-col gap-3">
          <button
            className="w-full py-3 rounded-xl glass-card text-white/70 text-sm font-medium"
            onClick={onBrowseProgrammes}
          >
            Browse All Programmes
          </button>
          <button
            className="w-full py-2 text-white/40 text-sm"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
