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
  Edit3,
  Play,
  X,
  Sparkles,
  Trash2,
  Pencil,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { modalOverlay, modalPanel, spring, pageTransition, stagger, fadeUp, easeOut } from "../utils/animations";

export default function Programmes() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("John");
  const [surname, setSurname] = useState("Doe");
  const [loading, setLoading] = useState(true);
  const [programmes, setprogrammes] = useState<any[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ brute: true, custom: true });
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

  // Generate programme modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  // Delete programme modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programmeToDelete, setProgrammeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingProgramme, setDeletingProgramme] = useState(false);
  const [programmeSourceTab, setProgrammeSourceTab] = useState<"custom" | "brute">("custom");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [generateStep, setGenerateStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [generateGoal, setGenerateGoal] = useState<string>("MUSCLE_BUILDING");
  const [generateLevel, setGenerateLevel] = useState<string>("");
  const [generateDays, setGenerateDays] = useState<number>(4);
  const [generateEquipment, setGenerateEquipment] = useState<string>("");
  const [generatePriorityMuscle, setGeneratePriorityMuscle] = useState<string>("fullBody");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // All three are independent — fetch in parallel
        const [userRes, userProgramRes, progRes] = await Promise.all([
          fetch("/api/dashboard",       { headers }),
          fetch("/auth/user-programs",  { headers }),
          fetch("/auth/programmes",     { headers }),
        ]);

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

        if (!progRes.ok) throw new Error("Failed to fetch programmes");

        const data = await progRes.json();
        setprogrammes(data);
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

  const filteredProgrammes = programmes.filter((p: any) => {
    const focus = p.progressionFocus || "MUSCLE_BUILDING";
    return focus === progressionFocusTab;
  });
  const bruteProgs = filteredProgrammes.filter((p: any) => !p.isCustom);
  const customProgs = filteredProgrammes.filter((p: any) => p.isCustom);

  const handleDeleteProgramme = async (programmeId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setDeletingProgramme(true);
    try {
      const res = await fetch(`/auth/programmes/${programmeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete programme");
      }
      setprogrammes((prev) => prev.filter((p) => p.id !== programmeId));
      setShowDeleteModal(false);
      setProgrammeToDelete(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete programme");
    } finally {
      setDeletingProgramme(false);
    }
  };

  const handleRename = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token || !renameValue.trim()) return;
    setSavingRename(true);
    try {
      const res = await fetch(`/auth/programmes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      setprogrammes((prev) => prev.map((p) => p.id === id ? { ...p, name: renameValue.trim() } : p));
      setRenamingId(null);
    } catch {
      alert("Failed to rename programme");
    } finally {
      setSavingRename(false);
    }
  };

  const handleStartProgramme = async (programmeId: string) => {
    // Check if there's an active programme that's different from the one being selected
    if (activeUserProgram && activeUserProgram.programmeId !== programmeId) {
      // Find the programme name
      const found = programmes.find((p: any) => p.id === programmeId);
      const programmeName = found?.name || "";

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
          `/auth/user-programs/${activeUserProgram.id}`,
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
      const response = await fetch("/auth/user-programs", {
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
        `/auth/user-programs/${activeUserProgram.id}`,
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

  const resetGenerateModal = () => {
    setShowGenerateModal(false);
    setGenerateStep(1);
    setGenerateGoal("MUSCLE_BUILDING");
    setGenerateLevel("");
    setGenerateDays(4);
    setGenerateEquipment("");
    setGeneratePriorityMuscle("fullBody");
    setGenerateError(null);
  };

  const handleGenerateProgramme = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/auth/programmes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          goal: generateGoal,
          experienceLevel: generateLevel,
          daysPerWeek: generateDays,
          equipment: generateEquipment,
          priorityMuscle: generatePriorityMuscle,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate programme");
      }

      const newProg = await res.json();

      // Refresh programme list
      const progRes = await fetch("/auth/programmes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (progRes.ok) {
        const data = await progRes.json();
        setprogrammes(data);
      }

      resetGenerateModal();
      navigate(`/editor/${newProg.id}`);
    } catch (err: any) {
      setGenerateError(err.message ?? "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-32"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
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
      <div className="flex gap-2 mt-2 mb-3">
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
        <div className="w-full px-2 mb-3">
          <div className="bg-gradient-to-br from-[#FFB8E0] via-[#BE9EFF] via-[#88C0FC] to-[#86FF99] rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-black font-semibold text-xs tracking-wide">
                ACTIVE PROGRAMME
              </span>
              <button
                onClick={() => setShowEndProgrammeModal(true)}
                className="w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 text-black flex items-center justify-center transition-colors"
                aria-label="End active programme"
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-black font-bold text-base truncate">
                  {activeUserProgram.programme.name}
                </h3>
                <p className="text-black/70 text-xs">
                  Week {activeUserProgram.currentWeek} · Day {activeUserProgram.currentDay}
                </p>
              </div>
              <button
                onClick={() => navigate("/workouts")}
                className="flex-shrink-0 bg-black text-white px-4 py-2 rounded-lg font-medium flex items-center gap-1.5 text-sm"
              >
                <Play size={13} />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Generate + Focus tabs */}
      <div className="w-full px-2 mb-4 mt-3">
        <div
          className="bg-gradient-to-r from-[#246BFD]/20 to-[#BE9EFF]/20 border border-[#246BFD]/40 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:from-[#246BFD]/30 hover:to-[#BE9EFF]/30 transition-colors"
          onClick={() => { setShowGenerateModal(true); setGenerateStep(1); }}
        >
          <div>
            <span className="font-semibold text-base text-white block">
              Generate a Programme
            </span>
            <span className="text-xs text-[#8EC5FF]">Built around your goals and schedule</span>
          </div>
          <Sparkles size={20} className="text-[#8EC5FF]" />
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
                const colourIdx = previousPrograms.indexOf(userProgram) % colours.length;
                const colour = colours[colourIdx];
                return (
                  <div key={userProgram.id} className={`w-full bg-[#1C1F26] rounded-xl px-4 py-4 border-l-4 ${colour.accent}`}>
                    <p className="font-semibold text-white mb-1">{userProgram.programme.name}</p>
                    <p className="text-sm text-[#5E6272]">Completed {formatProgrammeDate(userProgram.endDate)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-10 flex justify-center items-center">
              <p className="text-[#5E6272] font-semibold text-lg">No completed programmes yet</p>
            </div>
          )
        ) : (
          // All Programmes View — sub-tabs for My vs Brute
          <div>
            {/* Source sub-tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setProgrammeSourceTab("custom")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                  programmeSourceTab === "custom"
                    ? "bg-[#246BFD]/20 border-[#246BFD]/60 text-white"
                    : "bg-transparent border-[#2F3544] text-[#5E6272]"
                }`}
              >
                My Programmes
                {customProgs.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">({customProgs.length})</span>
                )}
              </button>
              <button
                onClick={() => setProgrammeSourceTab("brute")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                  programmeSourceTab === "brute"
                    ? "bg-[#00FFAD]/10 border-[#00FFAD]/40 text-white"
                    : "bg-transparent border-[#2F3544] text-[#5E6272]"
                }`}
              >
                Brute Library
                {bruteProgs.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">({bruteProgs.length})</span>
                )}
              </button>
            </div>

            {/* My Programmes list */}
            {programmeSourceTab === "custom" && (
              customProgs.length === 0 ? (
                <div className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-10 flex flex-col items-center gap-3">
                  <p className="text-[#5E6272] font-semibold text-base">No custom programmes yet</p>
                  <p className="text-[#3A3E48] text-sm text-center">Generate one or create your own above</p>
                </div>
              ) : (
                <motion.div className="flex flex-col gap-3" variants={stagger} initial="hidden" animate="show">
                  {customProgs.map((prog: any) => {
                    const isActive = activeUserProgram?.programmeId === prog.id;
                    const isRenaming = renamingId === prog.id;
                    return (
                      <motion.div
                        key={prog.id}
                        variants={fadeUp}
                        transition={easeOut}
                        className={`w-full bg-[#1C1F26] rounded-xl px-4 py-3 border ${
                          isActive ? "border-green-500/60" : "border-[#246BFD]/30"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {isRenaming ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    autoFocus
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleRename(prog.id);
                                      if (e.key === "Escape") setRenamingId(null);
                                    }}
                                    className="flex-1 bg-[#2A2E38] border border-[#246BFD]/60 rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                                  />
                                  <button
                                    onClick={() => handleRename(prog.id)}
                                    disabled={savingRename}
                                    className="p-1.5 rounded-lg bg-[#246BFD]/20 text-[#8EC5FF] hover:bg-[#246BFD]/40 transition-colors"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setRenamingId(null)}
                                    className="p-1.5 rounded-lg bg-white/5 text-[#5E6272] hover:bg-white/10 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className="font-semibold text-white truncate">{prog.name}</p>
                                  {isActive && <CheckCircle className="text-green-500 flex-shrink-0" size={16} />}
                                  <span className="text-xs text-[#8EC5FF] bg-[#246BFD]/15 px-1.5 py-0.5 rounded-full flex-shrink-0">Custom</span>
                                  <button
                                    onClick={() => { setRenamingId(prog.id); setRenameValue(prog.name); }}
                                    className="p-1 rounded-lg text-[#5E6272] hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                            <p className="text-sm text-[#00FFAD]">{prog.daysPerWeek} days · {prog.weeks} weeks</p>
                            {prog.description && <p className="text-xs text-[#5E6272] mt-1">{prog.description}</p>}
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
                          <button
                            onClick={() => { setProgrammeToDelete({ id: prog.id, name: prog.name }); setShowDeleteModal(true); }}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )
            )}

            {/* Brute Library list */}
            {programmeSourceTab === "brute" && (
              bruteProgs.length === 0 ? (
                <div className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-10 flex justify-center items-center">
                  <p className="text-[#5E6272] font-semibold text-lg">
                    {progressionFocusTab === "STRENGTH" ? "No strength programmes yet" : "No muscle-building programmes yet"}
                  </p>
                </div>
              ) : (
                <motion.div className="flex flex-col gap-3" variants={stagger} initial="hidden" animate="show">
                  {bruteProgs.map((prog: any) => {
                    const isActive = activeUserProgram?.programmeId === prog.id;
                    return (
                      <motion.div
                        key={prog.id}
                        variants={fadeUp}
                        transition={easeOut}
                        className={`w-full bg-[#1C1F26] rounded-xl px-4 py-3 ${
                          isActive ? "border-2 border-green-500/60" : "border border-[#2F3544]"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-white">{prog.name}</p>
                              {isActive && <CheckCircle className="text-green-500" size={16} />}
                            </div>
                            <p className="text-sm text-[#00FFAD]">{prog.daysPerWeek} days · {prog.weeks} weeks</p>
                            {prog.description && <p className="text-xs text-[#5E6272] mt-1">{prog.description}</p>}
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
                      </motion.div>
                    );
                  })}
                </motion.div>
              )
            )}
          </div>
        )}
      </div>

      {/* Delete Programme Modal */}
      <AnimatePresence>
        {showDeleteModal && programmeToDelete && (
          <motion.div
            className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50"
            variants={modalOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-[#1C1F26] rounded-2xl p-6 w-full max-w-sm border border-[#2F3544]"
              variants={modalPanel}
              transition={spring}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <h2 className="text-white font-bold text-lg">Delete Programme?</h2>
              </div>
              <p className="text-[#A0AEC0] text-sm mb-2">
                <span className="text-white font-medium">{programmeToDelete.name}</span> will be permanently deleted.
              </p>
              <p className="text-[#5E6272] text-xs mb-6">
                Your exercise history is kept — only the programme template is removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setProgrammeToDelete(null); }}
                  className="flex-1 py-3 bg-[#2A2E38] hover:bg-[#3A3E48] text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProgramme(programmeToDelete.id)}
                  disabled={deletingProgramme}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {deletingProgramme ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Modal */}
      <AnimatePresence>
        {showWarningModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            variants={modalOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-[#1C1F26] rounded-2xl p-8 w-full max-w-md border border-[#2F3544] shadow-2xl"
              variants={modalPanel}
              transition={spring}
            >
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
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* End Active Programme Modal */}
      <AnimatePresence>
        {showEndProgrammeModal && activeUserProgram && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            variants={modalOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-[#1C1F26] rounded-2xl p-8 w-full max-w-md border border-[#2F3544] shadow-2xl"
              variants={modalPanel}
              transition={spring}
            >
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
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Programme Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            variants={modalOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-[#1C1F26] border border-[#2F3544] rounded-2xl w-full max-w-md p-6 shadow-2xl"
              variants={modalPanel}
              transition={spring}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[#8EC5FF]" />
                  <h2 className="text-white font-bold text-lg">Generate Programme</h2>
              </div>
              <button onClick={resetGenerateModal} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Step 1: Goal */}
            {generateStep === 1 && (
              <div>
                <p className="text-[#9CA3AF] text-sm mb-4">What is your primary goal?</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { setGenerateGoal("MUSCLE_BUILDING"); setGenerateStep(2); }}
                    className="w-full bg-[#246BFD]/20 border border-[#246BFD]/60 rounded-xl px-4 py-4 text-left hover:bg-[#246BFD]/30 transition-colors"
                  >
                    <div className="text-white font-semibold">Muscle Building</div>
                    <div className="text-[#8EC5FF] text-xs mt-1">Hypertrophy-focused training to build size and mass</div>
                  </button>
                  <button
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-left opacity-50 cursor-not-allowed"
                  >
                    <div className="text-white font-semibold">Strength</div>
                    <div className="text-[#9CA3AF] text-xs mt-1">Coming soon</div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Experience Level */}
            {generateStep === 2 && (
              <div>
                <p className="text-[#9CA3AF] text-sm mb-4">What is your training experience level?</p>
                <div className="flex flex-col gap-3">
                  {[
                    { key: "beginner",     label: "Beginner",     desc: "Under 1 year of consistent training · 8 week programme" },
                    { key: "intermediate", label: "Intermediate",  desc: "1–3 years of consistent training · 12 week programme" },
                    { key: "advanced",     label: "Advanced",      desc: "3+ years of consistent training · 16 week programme" },
                  ].map(({ key, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => { setGenerateLevel(key); setGenerateStep(3); }}
                      className={`w-full border rounded-xl px-4 py-4 text-left transition-colors ${
                        generateLevel === key
                          ? "bg-[#246BFD]/20 border-[#246BFD]/60"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-white font-semibold">{label}</div>
                      <div className="text-[#9CA3AF] text-xs mt-1">{desc}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setGenerateStep(1)} className="mt-4 text-[#9CA3AF] text-sm hover:text-white transition-colors">← Back</button>
              </div>
            )}

            {/* Step 3: Days per week */}
            {generateStep === 3 && (
              <div>
                <p className="text-[#9CA3AF] text-sm mb-4">How many days per week can you train?</p>
                <div className="grid grid-cols-3 gap-3 mb-2">
                  {[2, 3, 4, 5, 6].map((days) => (
                    <button
                      key={days}
                      onClick={() => setGenerateDays(days)}
                      className={`border rounded-xl px-3 py-4 text-center transition-colors ${
                        generateDays === days
                          ? "bg-[#246BFD]/20 border-[#246BFD]/60"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-white font-bold text-xl">{days}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setGenerateStep(4)}
                  className="mt-4 w-full bg-[#246BFD] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Continue
                </button>
                <button onClick={() => setGenerateStep(2)} className="mt-3 text-[#9CA3AF] text-sm hover:text-white transition-colors">← Back</button>
              </div>
            )}

            {/* Step 4: Priority muscle group */}
            {generateStep === 4 && (
              <div>
                <p className="text-[#9CA3AF] text-sm mb-4">Any muscle group you want to prioritise?</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "fullBody",   label: "Full Body",  desc: "Equal focus across all muscles" },
                    { key: "chest",      label: "Chest",      desc: "Extra chest volume each session" },
                    { key: "back",       label: "Back",       desc: "Extra back & lat volume" },
                    { key: "shoulders",  label: "Shoulders",  desc: "Extra shoulder work" },
                    { key: "arms",       label: "Arms",       desc: "Extra biceps & triceps" },
                    { key: "legs",       label: "Legs",       desc: "Extra quad & hamstring volume" },
                    { key: "glutes",     label: "Glutes",     desc: "Extra glute-focused work" },
                  ].map(({ key, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => setGeneratePriorityMuscle(key)}
                      className={`border rounded-xl px-3 py-3 text-left transition-colors ${
                        generatePriorityMuscle === key
                          ? "bg-[#246BFD]/20 border-[#246BFD]/60"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-white font-semibold text-sm">{label}</div>
                      <div className="text-[#9CA3AF] text-xs mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setGenerateStep(5)}
                  className="mt-4 w-full bg-[#246BFD] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Continue
                </button>
                <button onClick={() => setGenerateStep(3)} className="mt-3 text-[#9CA3AF] text-sm hover:text-white transition-colors">← Back</button>
              </div>
            )}

            {/* Step 5: Equipment */}
            {generateStep === 5 && (
              <div>
                <p className="text-[#9CA3AF] text-sm mb-4">What equipment do you have access to?</p>
                <div className="flex flex-col gap-3">
                  {[
                    { key: "fullGym",     label: "Full Gym",           desc: "Barbells, machines, cables, dumbbells" },
                    { key: "barbellRack", label: "Barbell + Rack",     desc: "Barbell, squat rack, cables, basic machines" },
                    { key: "dumbbells",   label: "Dumbbells Only",     desc: "Dumbbell set and bodyweight exercises" },
                    { key: "bodyweight",  label: "Bodyweight",         desc: "No equipment — bodyweight only" },
                  ].map(({ key, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => setGenerateEquipment(key)}
                      className={`w-full border rounded-xl px-4 py-3 text-left transition-colors ${
                        generateEquipment === key
                          ? "bg-[#246BFD]/20 border-[#246BFD]/60"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-white font-semibold">{label}</div>
                      <div className="text-[#9CA3AF] text-xs mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>

                {generateError && (
                  <div className="mt-3 text-red-400 text-sm text-center">{generateError}</div>
                )}

                <button
                  onClick={handleGenerateProgramme}
                  disabled={!generateEquipment || generating}
                  className={`mt-4 w-full font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    !generateEquipment || generating
                      ? "bg-white/10 text-[#9CA3AF] cursor-not-allowed"
                      : "bg-gradient-to-r from-[#246BFD] to-[#BE9EFF] text-white hover:opacity-90"
                  }`}
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate Programme
                    </>
                  )}
                </button>
                <button onClick={() => setGenerateStep(4)} className="mt-3 text-[#9CA3AF] text-sm hover:text-white transition-colors">← Back</button>
              </div>
            )}
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <BottomBar onLogout={handleLogout} />
    </motion.div>
  );
}
