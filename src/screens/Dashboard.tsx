import React, { useState, useEffect } from "react";
import { ArrowRight, Play, Calendar, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const navItems = ["overview", "performance"];

  const isActive = (tab: string) => activeTab === tab;

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [firstName, setFirstName] = useState("John");
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
        // Fetch user data
        const dashboardRes = await fetch(
          "http://localhost:4242/api/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!dashboardRes.ok) throw new Error("Unauthorized");

        const userData = await dashboardRes.json();
        setFirstName(userData.firstName);
        setSurname(userData.surname);
        setMessage(userData.message);

        // Fetch profile data to get profile photo
        const profileRes = await fetch(
          "http://localhost:4242/auth/user/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfilePhoto(profileData.profilePhoto);
        }

        // Fetch active user program
        const userProgramRes = await fetch(
          "http://localhost:4242/auth/user-programs",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (userProgramRes.ok) {
          const userPrograms = await userProgramRes.json();
          const active = userPrograms.find((up: any) => up.status === "ACTIVE");
          setUserProgram(active);
        }

        setLoading(false);
      } catch (err) {
        console.error("Auth error:", err);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
    const fetchWeeklyStats = async () => {
      const token = localStorage.getItem("token");
      if (!token || !userProgram) return;

      setLoadingStats(true);
      try {
        const response = await fetch(
          "http://localhost:4242/auth/workouts/weekly-stats",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
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

    if (activeTab === "performance" && userProgram) {
      fetchWeeklyStats();
    }
  }, [activeTab, userProgram]);

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

  return (
    <div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16"
      style={{
        background:
          "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
      }}
    >
      {/* Logo */}
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
        <img
          src={logo}
          alt="Logo"
          className="w-[84.56px] h-[15px] object-contain md:w-[100px] md:h-[18px]"
        />
      </div>

      {/* Top Bar */}
      <div className="flex justify-between items-center mt-4 px-2">
        <h2
          className="text-white"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: "20px",
          }}
        >
          Dashboard
        </h2>
        <div
          className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-[#246BFD] hover:border-[#1a52cc] transition-colors relative"
          onClick={() => navigate("/settings")}
        >
          {profilePhoto ? (
            <img
              src={`http://localhost:4242${profilePhoto}`}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("Failed to load profile image:", profilePhoto);
                e.currentTarget.style.display = "none";
                const fallback =
                  e.currentTarget.parentElement!.querySelector(
                    ".fallback-icon"
                  );
                if (fallback) {
                  (fallback as HTMLElement).style.display = "flex";
                }
              }}
            />
          ) : null}
          <div
            className={`absolute inset-0 w-full h-full bg-[#262A34] flex items-center justify-center fallback-icon ${
              profilePhoto ? "hidden" : "flex"
            }`}
          >
            <User size={20} className="text-[#5E6272]" />
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <h1
        className="text-center mt-4"
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          fontSize: "36px",
          lineHeight: "40px",
          letterSpacing: "0px",
          color: "white",
        }}
      >
        {greeting}, {firstName}
      </h1>

      {/* Filter Menu */}
      <div className="flex justify-around mt-6 mb-4">
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => setActiveTab(item)}
            className={`px-4 py-2 rounded-full font-medium text-sm ${
              isActive(item)
                ? "bg-[#246BFD] text-white"
                : "text-[#5E6272] bg-transparent"
            }`}
          >
            {item === "overview" ? "Overview" : "This Week's Performance"}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          {/* Today's Workout Box */}
          {userProgram && todayWorkout ? (
            <div className="rounded-2xl p-4 bg-gradient-to-br from-[#FFB8E0] via-[#BE9EFF] via-[#88C0FC] to-[#86FF99] text-black relative">
              <div className="mb-2">
                <h2 className="text-lg font-semibold">Today's Workout</h2>
                <p className="text-sm opacity-80">
                  {userProgram.programme.name} - Week {userProgram.currentWeek},
                  Day {userProgram.currentDay}
                </p>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} />
                  <span className="text-sm font-medium">
                    {todayWorkout.exercises.length} exercise
                    {todayWorkout.exercises.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-2">
                  <div
                    className="bg-[#246BFD] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress(userProgram)}%` }}
                  ></div>
                </div>
                <p className="text-xs opacity-70 mt-1">
                  {calculateProgress(userProgram)}% programme complete
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/workouts")}
                  className="bg-[#246BFD] text-white px-4 py-2 rounded-full text-sm font-medium shadow-md flex items-center gap-2"
                >
                  <Play size={16} />
                  Start Workout
                </button>
                <button
                  onClick={() => navigate("/workouts")}
                  className="bg-white/20 text-black px-4 py-2 rounded-full text-sm font-medium"
                >
                  View Programme
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 bg-gradient-to-br from-[#FFB8E0] via-[#BE9EFF] via-[#88C0FC] to-[#86FF99] text-black relative">
              <h2 className="text-lg font-semibold mb-2">Today's Workout</h2>
              <p className="text-sm opacity-80 mb-4">
                Choose a programme to begin your fitness journey
              </p>
              <button
                onClick={() => navigate("/programmes")}
                className="bg-[#246BFD] text-white px-4 py-2 rounded-full text-sm font-medium shadow-md"
              >
                Start Now
              </button>
            </div>
          )}

          {/* Quick Action Boxes */}
          {[
            { title: "Update Bodyweight", path: "/settings" },
            { title: "View Programmes", path: "/programmes" },
            { title: "Workout History", path: "/workouts" },
          ].map((item, index) => (
            <div
              key={index}
              onClick={() => navigate(item.path)}
              className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer text-white hover:bg-[#2A2E38] transition-colors"
            >
              <span className="font-medium">{item.title}</span>
              <ArrowRight size={20} className="text-white" strokeWidth={1.5} />
            </div>
          ))}
        </div>
      )}

      {activeTab === "performance" && (
        <div className="flex flex-col gap-6 mt-4">
          {userProgram && (
            <div
              className="rounded-xl px-6 py-8"
              style={{ background: "#262A34" }}
            >
              <h3
                className="text-[#5E6272] font-semibold text-lg mb-4"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Current Programme Progress
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white">
                    {userProgram.programme.name}
                  </span>
                  <span className="text-[#246BFD] font-medium">
                    Week {userProgram.currentWeek}/{userProgram.programme.weeks}
                  </span>
                </div>
                <div className="w-full bg-[#1A1D23] rounded-full h-2">
                  <div
                    className="bg-[#246BFD] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress(userProgram)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-[#5E6272]">
                  <span>Started: {formatDate(userProgram.startDate)}</span>
                  <span>{calculateProgress(userProgram)}% complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Goal */}
          <div
            className="rounded-xl px-6 py-8"
            style={{ background: "#262A34" }}
          >
            <h3
              className="text-[#5E6272] font-semibold text-lg mb-4"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Weekly Goal
            </h3>
            {loadingStats ? (
              <p className="text-white text-sm">Loading stats...</p>
            ) : weeklyStats ? (
              <div className="flex flex-col items-center">
                {/* Circular Progress */}
                <div className="relative w-40 h-40 mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="#1A1D23"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${
                        2 *
                        Math.PI *
                        70 *
                        (weeklyStats.workoutsCompleted /
                          weeklyStats.workoutsTarget)
                      } ${2 * Math.PI * 70}`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                    <defs>
                      <linearGradient
                        id="gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#00FFAD" />
                        <stop offset="100%" stopColor="#246BFD" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {weeklyStats.workoutsCompleted}
                    </span>
                    <span className="text-sm text-[#5E6272]">
                      / {weeklyStats.workoutsTarget}
                    </span>
                  </div>
                </div>
                <p className="text-white text-center">
                  {weeklyStats.workoutsCompleted} of{" "}
                  {weeklyStats.workoutsTarget} workouts completed this week
                </p>
                {weeklyStats.workoutsCompleted >=
                  weeklyStats.workoutsTarget && (
                  <div className="mt-3 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm font-medium text-center">
                      🎉 Weekly goal achieved!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-white text-sm">
                Start a programme to track your weekly goals
              </p>
            )}
          </div>

          {/* Weight moved in the last 7 days */}
          <div
            className="rounded-xl px-6 py-8"
            style={{ background: "#262A34" }}
          >
            <h3
              className="text-[#5E6272] font-semibold text-lg mb-6"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Activity - Last 7 Days
            </h3>
            {loadingStats ? (
              <p className="text-white text-sm">Loading stats...</p>
            ) : weeklyStats && weeklyStats.dailyStats.length > 0 ? (
              <div>
                {/* Bar Chart */}
                <div className="flex items-end justify-between h-32 mb-4 gap-2">
                  {weeklyStats.dailyStats.map((day, index) => {
                    const maxSets = Math.max(
                      ...weeklyStats.dailyStats.map((d) => d.sets),
                      1
                    );
                    const heightPercentage = (day.sets / maxSets) * 100;

                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div className="w-full flex flex-col items-center justify-end h-full">
                          {/* Sets bar */}
                          {day.sets > 0 && (
                            <div
                              className="w-full bg-gradient-to-t from-[#246BFD] to-[#00FFAD] rounded-t transition-all duration-300 relative group"
                              style={{
                                height: `${heightPercentage}%`,
                                minHeight: day.sets > 0 ? "8px" : "0",
                              }}
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {day.sets} sets
                                <br />
                                {day.exercises} exercises
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Day label */}
                        <p className="text-[#5E6272] text-xs mt-2 font-medium">
                          {day.dayName.charAt(0)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="flex justify-center gap-6 pt-4 border-t border-[#1A1D23]">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {weeklyStats.totalSets}
                    </p>
                    <p className="text-xs text-[#5E6272]">Sets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {weeklyStats.totalExercises}
                    </p>
                    <p className="text-xs text-[#5E6272]">Exercises</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-white text-sm">
                No workout data for the last 7 days
              </p>
            )}
          </div>
        </div>
      )}

      <BottomBar onLogout={handleLogout} />
      <InstallPrompt forceShow={true} />
    </div>
  );
}
