import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import BottomBar from "../components/BottomBar";
import TopBar from "../components/TopBar";
import {
  Dumbbell,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Edit3,
  Play,
  X,
} from "lucide-react";

export default function Programmes() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("John");
  const [surname, setSurname] = useState("Doe");
  const [loading, setLoading] = useState(true);
  const [programmesData, setProgrammesData] = useState<Record<string, any[]>>(
    {},
  );
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [activeUserProgram, setActiveUserProgram] = useState<any>(null);
  const [filterTab, setFilterTab] = useState<"all" | "previous">("all");
  const [progressionFocusTab, setProgressionFocusTab] = useState<
    "MUSCLE_BUILDING" | "STRENGTH"
  >("MUSCLE_BUILDING");
  const [previousPrograms, setPreviousPrograms] = useState<any[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(
    null,
  );
  const [selectedProgrammeName, setSelectedProgrammeName] =
    useState<string>("");
  const [showEndProgrammeModal, setShowEndProgrammeModal] = useState(false);
  const [endingProgramme, setEndingProgramme] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch user
        const userRes = await fetch("http://localhost:4242/api/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (userRes.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }

        if (!userRes.ok) {
          throw new Error(`Failed to fetch user: ${userRes.status}`);
        }

        const userData = await userRes.json();
        setFirstName(userData.firstName);
        setSurname(userData.surname);

        // Fetch active user program and previous programmes
        const userProgramRes = await fetch(
          "http://localhost:4242/auth/user-programs",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (userProgramRes.ok) {
          const userPrograms = await userProgramRes.json();
          const active = userPrograms.find((up: any) => up.status === "ACTIVE");
          setActiveUserProgram(active);

          // Get completed programs
          const completed = userPrograms.filter(
            (up: any) => up.status === "COMPLETED",
          );
          setPreviousPrograms(completed);
        }

        // Fetch programmes
        const progRes = await fetch("http://localhost:4242/auth/programmes", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!progRes.ok) throw new Error("Failed to fetch programmes");

        const data = await progRes.json();

        // Group by bodyPartFocus
        const grouped: Record<string, any[]> = {};
        data.forEach((p: any) => {
          if (!grouped[p.bodyPartFocus]) grouped[p.bodyPartFocus] = [];
          grouped[p.bodyPartFocus].push(p);
        });

        setProgrammesData(grouped);

        // Initialize open state for all sections
        const initialOpen: Record<string, boolean> = {};
        Object.keys(grouped).forEach((key) => {
          initialOpen[key] = true;
        });
        setOpenSections(initialOpen);
      } catch (err) {
        console.error("Programmes bootstrap error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatProgrammeDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const monthDiff =
      (today.getFullYear() - date.getFullYear()) * 12 +
      (today.getMonth() - date.getMonth());

    if (monthDiff === 0) {
      return "This month";
    } else if (monthDiff === 1) {
      return "Last month";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    }
  };

  const handleEditProgramme = (programmeId: string) => {
    navigate(`/editor/${programmeId}`);
  };

  const filteredProgrammeSections = Object.entries(programmesData)
    .map(([section, programmes]) => {
      const filteredProgrammes = (programmes as any[]).filter((prog: any) => {
        const focus = prog.progressionFocus || "MUSCLE_BUILDING";
        return focus === progressionFocusTab;
      });
      return [section, filteredProgrammes] as [string, any[]];
    })
    .filter(([, programmes]) => programmes.length > 0);

  const handleStartProgramme = async (programmeId: string) => {
    // Check if there's an active programme that's different from the one being selected
    if (activeUserProgram && activeUserProgram.programmeId !== programmeId) {
      // Find the programme name
      let programmeName = "";
      Object.values(programmesData).forEach((programs: any[]) => {
        const found = programs.find((p) => p.id === programmeId);
        if (found) programmeName = found.name;
      });

      setSelectedProgrammeId(programmeId);
      setSelectedProgrammeName(programmeName);
      setShowWarningModal(true);
      return;
    }

    // If no active programme or it's the same one, proceed directly
    await startSelectedProgramme(programmeId);
  };

  const startSelectedProgramme = async (programmeId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // First, cancel any active programmes
      if (activeUserProgram) {
        await fetch(
          `http://localhost:4242/auth/user-programs/${activeUserProgram.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: "CANCELLED" }),
          },
        );
      }

      // Create new user program with today as start date
      const response = await fetch("http://localhost:4242/auth/user-programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          programmeId: programmeId,
          startDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start programme");
      }

      setShowWarningModal(false);
      localStorage.removeItem("workoutSession");
      alert("Programme started! Head to Workouts to begin.");
      navigate("/workouts");
    } catch (error) {
      console.error("Error starting programme:", error);
      alert("Failed to start programme. Please try again.");
    }
  };

  const endActiveProgramme = async () => {
    if (!activeUserProgram) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setEndingProgramme(true);

    try {
      const response = await fetch(
        `http://localhost:4242/auth/user-programs/${activeUserProgram.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "COMPLETED" }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to end programme");
      }

      const updatedProgram = await response.json();

      setPreviousPrograms((prev) => [
        {
          ...activeUserProgram,
          status: "COMPLETED",
          endDate: updatedProgram.endDate ?? new Date().toISOString(),
        },
        ...prev,
      ]);
      setActiveUserProgram(null);
      setShowEndProgrammeModal(false);
      localStorage.removeItem("workoutSession");
    } catch (error) {
      console.error("Error ending programme:", error);
      alert("Failed to end programme. Please try again.");
    } finally {
      setEndingProgramme(false);
    }
  };

  return (
    <div className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-32">
      <TopBar
        title="Programmes"
        pageIcon={<Dumbbell size={18} />}
        menuItems={[
          { label: "Dashboard", onClick: () => navigate("/dashboard") },
          { label: "Workouts", onClick: () => navigate("/workouts") },
          { label: "Track Metrics", onClick: () => navigate("/metrics") },
          { label: "Settings", onClick: () => navigate("/settings") },
        ]}
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 mt-3 mb-5">
        <button
          onClick={() => setFilterTab("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            filterTab === "all"
              ? "bg-[#246BFD] text-white"
              : "text-[#5E6272] bg-transparent"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterTab("previous")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            filterTab === "previous"
              ? "bg-[#246BFD] text-white"
              : "text-[#5E6272] bg-transparent"
          }`}
        >
          Previous
        </button>
      </div>

      {/* Active Programme Banner */}
      {activeUserProgram && (
        <div className="w-full px-2 mb-5">
          <div className="bg-gradient-to-br from-[#FFB8E0] via-[#BE9EFF] via-[#88C0FC] to-[#86FF99] rounded-xl px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-black font-semibold text-sm">
                ACTIVE PROGRAMME
              </span>
              <button
                onClick={() => setShowEndProgrammeModal(true)}
                className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/30 text-black flex items-center justify-center transition-colors"
                aria-label="End active programme"
                title="End programme"
              >
                <X size={16} />
              </button>
            </div>
            <h3 className="text-black font-bold text-lg mb-1">
              {activeUserProgram.programme.name}
            </h3>
            <p className="text-black/80 text-sm mb-3">
              Week {activeUserProgram.currentWeek} • Day{" "}
              {activeUserProgram.currentDay}
            </p>
            <button
              onClick={() => navigate("/workouts")}
              className="w-full bg-black text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Play size={16} />
              Continue Workout
            </button>
          </div>
        </div>
      )}

      {/* Create New Custom Programme */}
      <div className="w-full px-2 mb-6 mt-6">
        <div
          className="bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-4 flex justify-between items-center cursor-pointer hover:bg-[#2A2E38] transition-colors"
          onClick={() => navigate("/programmes/create")}
        >
          <span className="font-semibold text-base text-white">
            Create New Custom Programme
          </span>
          <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold">
            +
          </div>
        </div>

        {filterTab === "all" && (
          <div className="flex gap-3 mt-3 w-full">
            <button
              onClick={() => setProgressionFocusTab("MUSCLE_BUILDING")}
              className={`flex-1 glass-pressable border rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                progressionFocusTab === "MUSCLE_BUILDING"
                  ? "bg-[#246BFD]/20 border-[#246BFD]/60 text-white"
                  : "text-[#9CA3AF] border-[#2F3544]"
              }`}
            >
              Muscle Building
            </button>
            <button
              onClick={() => setProgressionFocusTab("STRENGTH")}
              className={`flex-1 glass-pressable border rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                progressionFocusTab === "STRENGTH"
                  ? "bg-[#246BFD]/20 border-[#246BFD]/60 text-white"
                  : "text-[#9CA3AF] border-[#2F3544]"
              }`}
            >
              Strength
            </button>
          </div>
        )}
      </div>

      {/* Programme Sections */}
      <div className="flex flex-col gap-6 px-2">
        {loading ? (
          <div className="text-white">Loading...</div>
        ) : filterTab === "previous" ? (
          // Previous Programmes View
          previousPrograms && previousPrograms.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase mb-2">
                Completed Programmes
              </h3>
              {previousPrograms.map((userProgram: any) => {
                const colours = [
                  { bg: "from-[#FFB8E0]", accent: "border-[#FF6BB8]" },
                  { bg: "from-[#88C0FC]", accent: "border-[#246BFD]" },
                  { bg: "from-[#86FF99]", accent: "border-[#00FFAD]" },
                  { bg: "from-[#FFD700]", accent: "border-[#FFA500]" },
                  { bg: "from-[#BE9EFF]", accent: "border-[#9C6BFF]" },
                ];
                const colourIdx =
                  previousPrograms.indexOf(userProgram) % colours.length;
                const colour = colours[colourIdx];

                return (
                  <div
                    key={userProgram.id}
                    className={`w-full bg-[#1C1F26] rounded-xl px-4 py-4 border-l-4 ${colour.accent}`}
                  >
                    <p className="font-semibold text-white mb-1">
                      {userProgram.programme.name}
                    </p>
                    <p className="text-sm text-[#5E6272]">
                      Completed {formatProgrammeDate(userProgram.endDate)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-10 flex justify-center items-center">
              <p className="text-[#5E6272] font-semibold text-lg">
                No completed programmes yet
              </p>
            </div>
          )
        ) : // All Programmes View
        filteredProgrammeSections.length > 0 ? (
          filteredProgrammeSections.map(([section, programmes], idx) => {
            const isOpen = openSections[section];

            return (
              <div key={idx}>
                <div
                  className="flex items-center gap-2 cursor-pointer mb-2"
                  onClick={() => toggleSection(section)}
                >
                  {isOpen ? (
                    <ChevronDown className="text-green-500 w-4 h-4" />
                  ) : (
                    <ChevronRight className="text-green-500 w-4 h-4" />
                  )}
                  <h3 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
                    {section}
                  </h3>
                </div>

                {isOpen && (
                  <div className="flex flex-col gap-3">
                    {programmes.map((prog: any) => {
                      const isActive =
                        activeUserProgram?.programmeId === prog.id;

                      return (
                        <div
                          key={prog.id}
                          className={`w-full bg-[#1C1F26] rounded-xl px-4 py-3 ${
                            isActive
                              ? "border-2 border-green-500"
                              : "border border-[#2F3544]"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-white">
                                  {prog.name}
                                </p>
                                {isActive && (
                                  <CheckCircle
                                    className="text-green-500"
                                    size={16}
                                  />
                                )}
                              </div>
                              <p className="text-sm text-[#00FFAD]">
                                {prog.daysPerWeek} days · {prog.weeks} weeks
                              </p>
                              {prog.description && (
                                <p className="text-xs text-[#5E6272] mt-1">
                                  {prog.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleEditProgramme(prog.id)}
                              className="flex-1 bg-[#2A2E38] hover:bg-[#3a3f4a] text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                              <Edit3 size={14} />
                              Customize
                            </button>
                            {!isActive && (
                              <button
                                onClick={() => handleStartProgramme(prog.id)}
                                className="flex-1 bg-[#246BFD] hover:bg-blue-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                              >
                                <Play size={14} />
                                Start
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-10 flex justify-center items-center">
            <p className="text-[#5E6272] font-semibold text-lg">
              {progressionFocusTab === "STRENGTH"
                ? "No strength programmes yet"
                : "No muscle-building programmes yet"}
            </p>
          </div>
        )}
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1C1F26] rounded-2xl p-8 w-full max-w-md border border-[#2F3544] shadow-2xl">
            <h2 className="text-white text-2xl font-bold text-center mb-4">
              Switch Programme?
            </h2>
            <p className="text-[#A0AEC0] text-center mb-6">
              You currently have{" "}
              <span className="text-[#00FFAD] font-semibold">
                {activeUserProgram?.programme?.name}
              </span>{" "}
              in progress. Starting a new programme will pause your current
              progress.
            </p>
            <p className="text-[#5E6272] text-center text-sm mb-6">
              Are you sure you want to switch to{" "}
              <span className="text-[#246BFD] font-semibold">
                {selectedProgrammeName}
              </span>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  setSelectedProgrammeId(null);
                  setSelectedProgrammeName("");
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-[#2A2E38] hover:bg-[#3A3E48] text-white font-semibold transition-colors"
              >
                Keep Current
              </button>
              <button
                onClick={() => {
                  if (selectedProgrammeId) {
                    startSelectedProgramme(selectedProgrammeId);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-[#246BFD] hover:bg-blue-700 text-white font-semibold transition-colors"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Active Programme Modal */}
      {showEndProgrammeModal && activeUserProgram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1C1F26] rounded-2xl p-8 w-full max-w-md border border-[#2F3544] shadow-2xl">
            <h2 className="text-white text-2xl font-bold text-center mb-4">
              End Programme?
            </h2>
            <p className="text-[#A0AEC0] text-center mb-2">
              This will end
              <span className="text-[#00FFAD] font-semibold"> {activeUserProgram.programme?.name}</span>
              .
            </p>
            <p className="text-[#5E6272] text-center text-sm mb-6">
              Your progress and workout history will still be saved. You can start
              another programme anytime.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndProgrammeModal(false)}
                className="flex-1 px-4 py-3 rounded-lg bg-[#2A2E38] hover:bg-[#3A3E48] text-white font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={endActiveProgramme}
                disabled={endingProgramme}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  endingProgramme
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-500/50"
                }`}
              >
                {endingProgramme ? "Ending..." : "End Programme"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
