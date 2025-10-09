import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import BottomBar from "../components/BottomBar";
import {
  Dumbbell,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Edit3,
  Play,
} from "lucide-react";

export default function Programmes() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("John");
  const [surname, setSurname] = useState("Doe");
  const [loading, setLoading] = useState(true);
  const [programmesData, setProgrammesData] = useState<Record<string, any[]>>(
    {}
  );
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [activeUserProgram, setActiveUserProgram] = useState<any>(null);

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

        if (!userRes.ok) throw new Error("Unauthorized");

        const userData = await userRes.json();
        setFirstName(userData.firstName);
        setSurname(userData.surname);

        // Fetch active user program
        const userProgramRes = await fetch(
          "http://localhost:4242/auth/user-programs",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (userProgramRes.ok) {
          const userPrograms = await userProgramRes.json();
          const active = userPrograms.find((up: any) => up.status === "ACTIVE");
          setActiveUserProgram(active);
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
        console.error("Error:", err);
        localStorage.removeItem("token");
        navigate("/login");
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

  const handleEditProgramme = (programmeId: string) => {
    navigate(`/editor/${programmeId}`);
  };

  const handleStartProgramme = async (programmeId: string) => {
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
          }
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

      alert("Programme started! Head to Workouts to begin.");
      navigate("/workouts");
    } catch (error) {
      console.error("Error starting programme:", error);
      alert("Failed to start programme. Please try again.");
    }
  };

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
      <div className="flex justify-between items-center mt-4 px-2 h-10 relative">
        <Dumbbell className="text-white w-6 h-6" />
        <h2 className="absolute left-1/2 transform -translate-x-1/2 text-white font-semibold text-xl">
          Programmes
        </h2>
        <MoreHorizontal className="text-white w-6 h-6" />
      </div>

      {/* Active Programme Banner */}
      {activeUserProgram && (
        <div className="w-full px-2 mb-5 mt-6">
          <div className="bg-gradient-to-br from-[#FFB8E0] via-[#BE9EFF] via-[#88C0FC] to-[#86FF99] rounded-xl px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-black font-semibold text-sm">
                ACTIVE PROGRAMME
              </span>
              <CheckCircle className="text-green-700" size={20} />
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
              Continue Programme
            </button>
          </div>
        </div>
      )}

      {/* Create New Custom Programme */}
      <div className="w-full px-2 mb-5 mt-6">
        <div
          className="bg-[#1C1F26] border border-[#5E6272] rounded-xl px-4 py-4 flex justify-between items-center cursor-pointer"
          onClick={() => navigate("/editor/new")}
        >
          <span className="font-semibold text-base text-white">
            Create New Custom Programme
          </span>
          <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold">
            +
          </div>
        </div>
      </div>

      {/* Programme Sections */}
      <div className="flex flex-col gap-6 px-2">
        {loading ? (
          <div className="text-white">Loading...</div>
        ) : Object.keys(programmesData).length > 0 ? (
          Object.entries(programmesData).map(([section, programmes], idx) => {
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
              No programmes yet
            </p>
          </div>
        )}
      </div>

      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
