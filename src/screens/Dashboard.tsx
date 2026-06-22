import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { fadeUp, stagger, easeOut, pageTransition } from "../utils/animations";
import CountUp from "../components/CountUp";
import {
  ArrowRight,
  Play,
  Calendar,
  User,
  Scale,
  Trophy,
  ListTodo,
  Flame,
  Shield,
  History,
  Zap,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import TopBar from "../components/TopBar";
import icon from "../assets/icon_placeholder.png";
import InstallPrompt from "../components/InstallPrompt";
import BottomBar from "../components/BottomBar";

interface UserProgram {
  id: string;
  programmeId: string;
  currentWeek: number;
  currentDay: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  programme: {
    name: string;
    weeks: number;
    daysPerWeek: number;
    bodyPartFocus: string;
  };
  startDate: string;
  endDate?: string;
}

interface WeeklyStats {
  workoutsCompleted: number;
  workoutsTarget: number;
  dailyStats: {
    date: string;
    dayName: string;
    sets: number;
    exercises: number;
  }[];
  totalSets: number;
  totalExercises: number;
}

interface StreakStatus {
  streakCount: number;
  streakGoal: number;
  currentWindowWorkouts: number;
  currentWindowStart: string | null;
  lastWorkoutAt: string | null;
  streakFreezeAvailable: boolean;
  freezeUsedOnCurrentStreak: boolean;
  showCountdown: boolean;
  countdownDaysRemaining: number | null;
  daysUntilExpiry: number | null;
}

interface TileData {
  lastBodyweight: { weight: number; date: string } | null;
  lastWorkout: { date: string; bodyPartFocus: string } | null;
  activeProgram: {
    currentWeek: number;
    currentDay: number;
    weeks: number;
    daysPerWeek: number;
    bodyPartFocus: string;
    lastWorkoutAt: string | null;
  } | null;
  recentPR: { exerciseName: string; weight: number; reps: number } | null;
  volumeMilestone: { muscle: string; sets: number } | null;
}

type DynamicTile = {
  key: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  gradient: string;
  onClick: () => void;
  priority: number;
};

function computeDynamicTiles(
  data: TileData,
  streakStatus: StreakStatus | null,
  navigate: (path: string) => void,
): DynamicTile[] {
  const tiles: DynamicTile[] = [];
  const now = new Date();

  // 1. No active programme
  if (!data.activeProgram) {
    tiles.push({
      key: "no_programme",
      label: "Start a programme",
      sublabel: "Choose a plan to begin your journey",
      icon: <ListTodo size={24} className="text-white" />,
      gradient: "from-[#DA70D6] to-[#C2185B]",
      onClick: () => navigate("/programmes"),
      priority: 1,
    });
  }

  // 2. Real PR (last 7 days)
  if (data.recentPR) {
    tiles.push({
      key: "pr",
      label: `New ${data.recentPR.exerciseName} PR!`,
      sublabel: `${data.recentPR.weight}kg × ${data.recentPR.reps} reps`,
      icon: <Trophy size={24} className="text-white" />,
      gradient: "from-[#66BB6A] to-[#43A047]",
      onClick: () => navigate("/metrics"),
      priority: 2,
    });
  }

  // 3. Stale programme (10+ days no workout)
  if (data.activeProgram?.lastWorkoutAt) {
    const daysSince = Math.floor(
      (now.getTime() - new Date(data.activeProgram.lastWorkoutAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSince >= 10) {
      tiles.push({
        key: "stale_programme",
        label: "Back on track?",
        sublabel: `No workout in ${daysSince} days`,
        icon: <Play size={24} className="text-white" />,
        gradient: "from-[#FF6B6B] to-[#FF8E53]",
        onClick: () => navigate("/workouts"),
        priority: 3,
      });
    }
  }

  // 4. Programme nearly complete (≤2 weeks left)
  if (data.activeProgram) {
    const weeksLeft = data.activeProgram.weeks - data.activeProgram.currentWeek;
    if (weeksLeft >= 0 && weeksLeft <= 2) {
      tiles.push({
        key: "nearly_done",
        label: weeksLeft === 0 ? "Final week — well done!" : `${weeksLeft} week${weeksLeft === 1 ? "" : "s"} left`,
        sublabel: "Plan your next programme",
        icon: <ListTodo size={24} className="text-white" />,
        gradient: "from-[#FFC857] to-[#FF8C42]",
        onClick: () => navigate("/programmes"),
        priority: 4,
      });
    }
  }

  // 5. Upcoming workout (active programme, not stale)
  if (data.activeProgram) {
    const daysSince = data.activeProgram.lastWorkoutAt
      ? Math.floor(
          (now.getTime() - new Date(data.activeProgram.lastWorkoutAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 999;
    if (daysSince < 10) {
      tiles.push({
        key: "upcoming",
        label: `Next: Day ${data.activeProgram.currentDay}`,
        sublabel: data.activeProgram.bodyPartFocus,
        icon: <Play size={24} className="text-white" />,
        gradient: "from-[#9ED3FF] to-[#246BFD]",
        onClick: () => navigate("/workouts"),
        priority: 5,
      });
    }
  }

  // 6. Volume milestone this week
  if (data.volumeMilestone) {
    tiles.push({
      key: "volume_milestone",
      label: `${data.volumeMilestone.sets} sets of ${data.volumeMilestone.muscle}`,
      sublabel: "This week · Great volume!",
      icon: <Trophy size={24} className="text-white" />,
      gradient: "from-[#C6B5FF] to-[#7B5FD6]",
      onClick: () => navigate("/metrics"),
      priority: 6,
    });
  }

  // 7. Streak milestone
  if (streakStatus && [1, 2, 4, 8, 12, 16, 20, 26, 52].includes(streakStatus.streakCount)) {
    tiles.push({
      key: "streak_milestone",
      label: `${streakStatus.streakCount}-week streak!`,
      sublabel: "Keep the momentum going",
      icon: <Flame size={24} className="text-white" />,
      gradient: "from-[#FF8C42] to-[#FFC857]",
      onClick: () => navigate("/"),
      priority: 7,
    });
  }

  // 8. Bodyweight — stale, never logged, or recent
  if (!data.lastBodyweight) {
    tiles.push({
      key: "bodyweight_log",
      label: "Log your bodyweight",
      sublabel: "Track your progress over time",
      icon: <Scale size={24} className="text-white" />,
      gradient: "from-[#FF9966] to-[#FF6B6B]",
      onClick: () => navigate("/settings"),
      priority: 8,
    });
  } else {
    const daysSince = Math.floor(
      (now.getTime() - new Date(data.lastBodyweight.date).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSince >= 7) {
      tiles.push({
        key: "bodyweight_stale",
        label: "Update Bodyweight",
        sublabel: `Last logged ${daysSince} days ago`,
        icon: <Scale size={24} className="text-white" />,
        gradient: "from-[#FF9966] to-[#FF6B6B]",
        onClick: () => navigate("/settings"),
        priority: 8,
      });
    } else {
      tiles.push({
        key: "bodyweight_recent",
        label: `${data.lastBodyweight.weight}kg`,
        sublabel: `Logged ${daysSince === 0 ? "today" : `${daysSince} day${daysSince === 1 ? "" : "s"} ago`}`,
        icon: <Scale size={24} className="text-white" />,
        gradient: "from-[#FF9966] to-[#FF6B6B]",
        onClick: () => navigate("/settings"),
        priority: 8,
      });
    }
  }

  // 9. Last workout recap (within 14 days)
  if (data.lastWorkout) {
    const daysSince = Math.floor(
      (now.getTime() - new Date(data.lastWorkout.date).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSince <= 14) {
      tiles.push({
        key: "last_workout",
        label: daysSince === 0 ? "Trained today" : `Trained ${daysSince} day${daysSince === 1 ? "" : "s"} ago`,
        sublabel: data.lastWorkout.bodyPartFocus,
        icon: <History size={24} className="text-white" />,
        gradient: "from-[#43CBFF] to-[#9708CC]",
        onClick: () => navigate("/metrics"),
        priority: 9,
      });
    }
  }

  return tiles.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
  const [tileData, setTileData] = useState<TileData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const hasFetchedStats = useRef(false);
  const [strengthGoals, setStrengthGoals] = useState<any[]>([]);

  const navItems = ["overview", "performance"];

  const isActive = (tab: string) => activeTab === tab;

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("Doe");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Fire all independent requests in parallel
        const [dashboardRes, profileRes, userProgramRes, streakRes, tilesRes] =
          await Promise.all([
            fetch("/api/dashboard",          { headers }),
            fetch("/auth/user/profile",      { headers }),
            fetch("/auth/user-programs",     { headers }),
            fetch("/auth/streak",            { headers }),
            fetch("/auth/dashboard/tiles",   { headers }),
          ]);

        if (dashboardRes.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }

        if (dashboardRes.status === 403) {
          setMessage(
            "Your account access is currently limited. Please check your subscription status."
          );
          setLoading(false);
          return;
        }

        if (!dashboardRes.ok) {
          throw new Error(`Failed to fetch dashboard: ${dashboardRes.status}`);
        }

        const userData = await dashboardRes.json();
        const dashboardFirstName = (userData?.firstName ?? "").trim();
        if (dashboardFirstName) setFirstName(dashboardFirstName);
        setSurname(userData.surname);
        setMessage(userData.message);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const profileFirstName = (profileData?.firstName ?? "").trim();
          if (profileFirstName) setFirstName(profileFirstName);
          setProfilePhoto(profileData.profilePhoto);
        }

        if (userProgramRes.ok) {
          const userPrograms = await userProgramRes.json();
          setUserProgram(userPrograms.find((up: any) => up.status === "ACTIVE"));
        }

        if (streakRes.ok) setStreakStatus(await streakRes.json());
        if (tilesRes.ok)  setTileData(await tilesRes.json());

        setLoading(false);
      } catch (err) {
        console.error("Dashboard bootstrap error:", err);
        setMessage("We could not load your dashboard right now. Please retry.");
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
    const fetchWeeklyStats = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      setLoadingStats(true);
      try {
        const response = await fetch(
          "/auth/workouts/weekly-stats",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          const stats = await response.json();
          setWeeklyStats(stats);
        }
      } catch (error) {
        console.error("Error fetching weekly stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (activeTab === "performance" && !hasFetchedStats.current) {
      hasFetchedStats.current = true;
      fetchWeeklyStats();
    }
  }, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/auth/strength/goals", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.goals) setStrengthGoals(data.goals.filter((g: any) => g.status === "ACTIVE")); })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

  const calculateProgress = (userProgram: UserProgram) => {
    const totalDays =
      userProgram.programme.weeks * userProgram.programme.daysPerWeek;
    const completedDays =
      (userProgram.currentWeek - 1) * userProgram.programme.daysPerWeek +
      (userProgram.currentDay - 1);
    return Math.round((completedDays / totalDays) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-poppins bg-gradient-to-b from-[#001F3F] to-[#000B1A]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const displayFirstName = firstName.trim();

  return (
    <motion.div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-32"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      <TopBar
        title="Dashboard"
        pageIcon={
          <button
            className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border border-[#246BFD]/60 hover:border-[#6BA9FF] transition-colors relative"
            onClick={() => navigate("/settings")}
            aria-label="Open profile settings"
            title="Profile"
          >
            {profilePhoto ? (
              <img
                src={`${profilePhoto}`}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("Failed to load profile image:", profilePhoto);
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <div
              className={`absolute inset-0 w-full h-full bg-[#262A34] flex items-center justify-center ${
                profilePhoto ? "hidden" : "flex"
              }`}
            >
              <User size={16} className="text-[#9CA3AF]" />
            </div>
          </button>
        }
        menuItems={[
          { label: "Programmes",       onClick: () => navigate("/programmes") },
          { label: "Workouts",         onClick: () => navigate("/workouts") },
          { label: "Track Metrics",    onClick: () => navigate("/metrics") },
          { label: "Exercise Library", onClick: () => navigate("/exercises") },
          { label: "Settings",         onClick: () => navigate("/settings") },
        ]}
      />

      {/* Welcome Message */}
      <motion.h1
        className="text-center mt-1"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          fontSize: "36px",
          lineHeight: "40px",
          letterSpacing: "0px",
          color: "white",
        }}
      >
        {displayFirstName ? `${greeting}, ${displayFirstName}` : `${greeting}!`}
      </motion.h1>

      {/* Filter Menu */}
      <div className="flex justify-around mt-3 mb-4">
        {navItems.map((item) => (
          <motion.button
            key={item}
            onClick={() => setActiveTab(item)}
            whileTap={{ scale: 0.93 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`px-4 py-2 rounded-full font-medium text-sm ${
              isActive(item)
                ? "bg-[#246BFD] text-white"
                : "text-[#5E6272] bg-transparent"
            }`}
          >
            {item === "overview" ? "Overview" : "This Week's Performance"}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          {/* Today's Workout Box */}
          <motion.div
            className="rounded-2xl px-4 py-3 bg-gradient-to-br from-[#00CED1] via-[#87CEEB] to-[#FFB6D9] text-black relative overflow-hidden"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3, boxShadow: "0 12px 36px rgba(0,206,209,0.35)" }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold mb-0.5">Today's Workout</h2>
                <p className="text-xs opacity-80 font-medium">
                  {userProgram
                    ? `${userProgram.programme.name} · Week ${userProgram.currentWeek}, Day ${userProgram.currentDay}`
                    : "Choose a programme to begin your fitness journey"}
                </p>
              </div>
              <motion.button
                onClick={() => navigate(userProgram ? "/workouts" : "/programmes")}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-[#246BFD] hover:bg-[#1a52cc] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all flex-shrink-0 ml-3"
              >
                {userProgram ? "Start" : "Choose"}
              </motion.button>
            </div>
          </motion.div>

          {/* Old code removed - was showing progress bar and view programme button */}

          {/* Rolling consistency streak */}
          {streakStatus && (
            <motion.div
              className="relative overflow-hidden rounded-2xl border border-[#FF8C42]/30"
              style={{ background: "linear-gradient(135deg, #1C1F26 0%, #1A0F00 100%)" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2, boxShadow: "0 12px 32px rgba(255,140,66,0.2)" }}
            >
              {/* Ambient glow */}
              <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-[#FF8C42]/10 blur-2xl pointer-events-none" />

              <div className="relative p-5">
                {/* Top row — flame icon + streak number */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FFC857] flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/25">
                      <Flame size={24} className="text-white" fill="white" />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-white leading-none tracking-tight">
                        <CountUp to={streakStatus.streakCount} duration={0.7} />
                        <span className="text-xl font-bold text-[#FF8C42] ml-1.5">Week Streak</span>
                      </p>
                      <p className="text-sm text-[#FF8C42]/70 font-medium mt-0.5">
                        {streakStatus.currentWindowWorkouts} Workouts In A Row
                      </p>
                    </div>
                  </div>
                  {streakStatus.freezeUsedOnCurrentStreak && (
                    <div className="flex items-center gap-1 bg-[#8AB4FF]/10 border border-[#8AB4FF]/30 rounded-full px-2.5 py-1">
                      <Shield size={12} className="text-[#8AB4FF]" />
                      <span className="text-[#8AB4FF] text-[10px] font-semibold">Freeze used</span>
                    </div>
                  )}
                </div>

                {/* Progress section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-[#9AA0AE] uppercase tracking-widest">Workouts This Week</span>
                    <span className="text-sm font-bold text-[#FF8C42]">
                      {streakStatus.currentWindowWorkouts} / {streakStatus.streakGoal}
                    </span>
                  </div>
                  <div className="h-2.5 bg-[#2A1800] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF8C42] to-[#FFC857]"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (streakStatus.currentWindowWorkouts / Math.max(streakStatus.streakGoal, 1)) * 100)}%`,
                      }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>

                {streakStatus.showCountdown && (
                  <p className="text-[#AFC4E8] text-xs mt-3 bg-[#246BFD]/10 rounded-lg px-3 py-2 border border-[#246BFD]/20">
                    Log a workout in the next {streakStatus.countdownDaysRemaining} day
                    {streakStatus.countdownDaysRemaining === 1 ? "" : "s"} to keep your streak.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Strength Goals */}
          {strengthGoals.length > 0 && (
            <div className="flex flex-col gap-3">
              {strengthGoals.map((goal: any) => {
                // Reverse TM → 1RM by rounding to nearest 2.5 (TMs are multiples of 2.5,
                // so plain Math.round loses 1kg due to floating-point precision).
                const tm2rm = (tm: number) => Math.round(tm / 0.9 / 2.5) * 2.5;
                const start1rm  = goal.start1rm  ?? tm2rm(goal.startTm);
                const current1rm = tm2rm(goal.currentTm);
                const progress = Math.min(
                  Math.max(((current1rm - start1rm) / Math.max(goal.targetWeight - start1rm, 1)) * 100, 0),
                  100,
                );
                const kgToGo = Math.max(goal.targetWeight - current1rm, 0);
                return (
                  <motion.div
                    key={goal.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/strength/goals/${goal.id}`)}
                    className="relative overflow-hidden rounded-2xl border border-[#EAB308]/30 cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #1C1F26 0%, #16130000 100%)" }}
                    whileHover={{ y: -2, boxShadow: "0 12px 32px rgba(234,179,8,0.15)" }}
                  >
                    {/* Ambient glow */}
                    <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-[#EAB308]/8 blur-2xl pointer-events-none" />

                    <div className="relative px-4 py-3">
                      {/* Header + lift name row */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-[#EAB308]/20 border border-[#EAB308]/30 flex items-center justify-center">
                            <Zap size={11} className="text-[#EAB308]" fill="currentColor" />
                          </div>
                          <span className="text-base font-black text-white tracking-tight">{goal.liftName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#5E6272]">
                          <span className="text-[10px]">{progress.toFixed(0)}%</span>
                          <ChevronRight size={12} />
                        </div>
                      </div>

                      {/* Current → target weight display */}
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-black text-white">{current1rm}<span className="text-sm font-semibold text-[#9AA0AE] ml-0.5">kg</span></span>
                        <TrendingUp size={15} className="text-[#EAB308] flex-shrink-0 mb-0.5" />
                        <span className="text-2xl font-black text-[#EAB308]">{goal.targetWeight}<span className="text-sm font-semibold text-[#EAB308]/60 ml-0.5">kg</span></span>
                        {kgToGo > 0 && (
                          <span className="text-xs text-[#5E6272] ml-1 self-end">({kgToGo}kg to go)</span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="h-2 bg-[#2A2000] rounded-full overflow-hidden mb-1">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[#EAB308] to-[#F59E0B]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-[#5E6272]">{start1rm}kg</span>
                          <span className="text-[10px] text-[#EAB308]/70">{goal.targetWeight}kg</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Quick Action Tiles */}
          {tileData && (
            <motion.div
              className="flex flex-col gap-4"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              {computeDynamicTiles(tileData, streakStatus, navigate).map((tile) => (
                <motion.div
                  key={tile.key}
                  variants={fadeUp}
                  transition={easeOut}
                  whileTap={{ scale: 0.97 }}
                  onClick={tile.onClick}
                  className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4 flex justify-between items-center cursor-pointer hover:bg-[#2A2E38] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tile.gradient} flex items-center justify-center flex-shrink-0`}
                    >
                      {tile.icon}
                    </div>
                    <div>
                      <span className="font-medium text-white block">{tile.label}</span>
                      {tile.sublabel && (
                        <span className="text-xs text-[#A0AEC0]">{tile.sublabel}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-white flex-shrink-0" strokeWidth={1.5} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {activeTab === "performance" && (
        <div className="flex flex-col gap-4 mt-2">

          {/* Programme Progress */}
          {userProgram ? (
            <div className="glass-card border border-white/10 rounded-2xl p-5">
              <p className="text-[#A0AEC0] text-xs uppercase tracking-widest mb-3">Programme Progress</p>
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-white font-semibold">{userProgram.programme.name}</span>
                <span className="text-[#9ED3FF] text-sm font-medium">
                  Week {userProgram.currentWeek} / {userProgram.programme.weeks}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 mb-3">
                <motion.div
                  className="bg-gradient-to-r from-[#9ED3FF] to-[#246BFD] h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateProgress(userProgram)}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="flex justify-between text-xs text-[#5E6272]">
                <span>Started {formatDate(userProgram.startDate)}</span>
                <span>{calculateProgress(userProgram)}% complete</span>
              </div>
            </div>
          ) : (
            <div className="glass-card border border-white/10 rounded-2xl p-5 text-center">
              <p className="text-[#A0AEC0] text-sm">No active programme</p>
              <button
                onClick={() => navigate("/programmes")}
                className="mt-3 text-[#9ED3FF] text-sm font-medium underline underline-offset-2"
              >
                Start one now
              </button>
            </div>
          )}

          {/* This Week summary */}
          <div className="glass-card border border-white/10 rounded-2xl p-5">
            <p className="text-[#A0AEC0] text-xs uppercase tracking-widest mb-4">This Week</p>

            {loadingStats ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#9ED3FF]" />
              </div>
            ) : weeklyStats ? (
              <>
                {/* Stat pills */}
                <motion.div
                  className="grid grid-cols-3 gap-3 mb-6"
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                >
                  <motion.div variants={fadeUp} transition={easeOut} className="glass-subtile rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">
                      <CountUp to={weeklyStats.workoutsCompleted} duration={0.7} />
                    </p>
                    <p className="text-[10px] text-[#A0AEC0] mt-0.5">
                      / {weeklyStats.workoutsTarget} workouts
                    </p>
                  </motion.div>
                  <motion.div variants={fadeUp} transition={easeOut} className="glass-subtile rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">
                      <CountUp to={weeklyStats.totalSets} duration={0.8} />
                    </p>
                    <p className="text-[10px] text-[#A0AEC0] mt-0.5">sets</p>
                  </motion.div>
                  <motion.div variants={fadeUp} transition={easeOut} className="glass-subtile rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">
                      <CountUp to={weeklyStats.totalExercises} duration={0.9} />
                    </p>
                    <p className="text-[10px] text-[#A0AEC0] mt-0.5">exercises</p>
                  </motion.div>
                </motion.div>

                {/* Weekly goal progress bar */}
                {weeklyStats.workoutsTarget > 0 && (
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-[#5E6272] mb-1.5">
                      <span>Weekly goal</span>
                      <span>{weeklyStats.workoutsCompleted}/{weeklyStats.workoutsTarget} sessions</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-[#00FFAD] to-[#246BFD] h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (weeklyStats.workoutsCompleted / weeklyStats.workoutsTarget) * 100)}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>
                )}

                {/* Day-by-day bar chart */}
                <div>
                  <p className="text-[#5E6272] text-xs mb-3">Sets per day</p>
                  <div className="flex items-end justify-between gap-1.5 h-24">
                    {weeklyStats.dailyStats.map((day, index) => {
                      const maxSets = Math.max(...weeklyStats.dailyStats.map((d) => d.sets), 1);
                      const heightPct = (day.sets / maxSets) * 100;
                      const isToday = new Date(day.date).toDateString() === new Date().toDateString();
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1.5">
                          <div className="w-full flex items-end" style={{ height: "80px" }}>
                            <motion.div
                              className={`w-full rounded-t ${
                                day.sets === 0
                                  ? "bg-white/5"
                                  : isToday
                                  ? "bg-gradient-to-t from-[#86FF99] to-[#00D699]"
                                  : "bg-gradient-to-t from-[#9ED3FF] to-[#246BFD]"
                              }`}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{
                                duration: 0.4,
                                delay: index * 0.05,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              style={{
                                transformOrigin: "bottom",
                                height: day.sets === 0 ? "4px" : `${heightPct}%`,
                                minHeight: "4px",
                              }}
                            />
                          </div>
                          <p className={`text-[10px] font-medium ${isToday ? "text-white" : "text-[#5E6272]"}`}>
                            {day.dayName.substring(0, 1)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[#A0AEC0] text-sm text-center py-4">
                No workout data this week
              </p>
            )}
          </div>

          <motion.button
            onClick={() => navigate("/programmes")}
            whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(36,107,253,0.2)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="w-full glass-button border border-white/10 rounded-2xl py-3.5 text-white text-sm font-medium"
          >
            View Full Programme
          </motion.button>
        </div>
      )}

      <BottomBar onLogout={handleLogout} />
      <InstallPrompt forceShow={true} />
    </motion.div>
  );
}
