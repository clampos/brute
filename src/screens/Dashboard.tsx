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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);

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
        setProfilePhoto(userData.profilePhoto);

        setLoading(false);
      } catch (err) {
        console.error("Auth error:", err);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchData();
  }, [navigate]);

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
          className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-[#246BFD] hover:border-[#1a52cc] transition-colors"
          onClick={() => navigate("/settings")}
        >
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#262A34] flex items-center justify-center">
              <User size={20} className="text-[#5E6272]" />
            </div>
          )}
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
                  onClick={() => navigate("/workout")}
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
            { title: "New Bench Press PR!", path: "/programmes" },
            { title: "Plan Your Next Programme", path: "/programmes" },
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

          {["Weekly Goal", "Weight moved in the last 7 days"].map(
            (heading, idx) => (
              <div
                key={idx}
                className="rounded-xl px-6 py-8"
                style={{ background: "#262A34" }}
              >
                <h3
                  className="text-[#5E6272] font-semibold text-lg mb-4"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {heading}
                </h3>
                <p className="text-white text-sm">Content goes here...</p>
              </div>
            )
          )}
        </div>
      )}

      <BottomBar onLogout={handleLogout} />
      <InstallPrompt />
    </div>
  );
}
