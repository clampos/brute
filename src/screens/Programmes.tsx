import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import icon from "../assets/icon_placeholder.png";
import BottomBar from "../components/BottomBar";
import { CheckCircle, ChevronDown, ChevronRight } from "lucide-react";

export default function Programmes() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("John");
  const [surname, setSurname] = useState("Doe");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:4242/api/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Unauthorized");

        const userData = await res.json();
        setFirstName(userData.firstName);
        setSurname(userData.surname);
        setMessage(userData.message);
        setLoading(false);
      } catch (err) {
        console.error("Auth error:", err);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

  const filterOptions = ["All", "Previous", "BRUTE"];

  const dummyProgrammes = [
    {
      section: "FULL BODY",
      programmes: [
        { name: "Full Body", days: "3 Days a Week" },
        { name: "Full Body", days: "4 Days a Week" },
      ],
    },
    {
      section: "UPPER BODY FOCUSED",
      programmes: [
        { name: "Shoulder & Arm Focus", days: "3 Days a Week" },
        { name: "Chest & Back Builder", days: "4 Days a Week" },
      ],
    },
  ];

  useEffect(() => {
    const initialState: Record<string, boolean> = {};
    dummyProgrammes.forEach((group) => {
      initialState[group.section] = true;
    });
    setOpenSections(initialState);
  }, []);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
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
      <div className="flex justify-between items-center mt-4 px-2">
        <h2
          className="text-white"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: "20px",
          }}
        >
          Programmes
        </h2>
        <img
          src={icon}
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex justify-around mb-5">
        {filterOptions.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full font-medium text-sm transition ${
              activeFilter === filter
                ? "bg-[#246BFD] text-white"
                : "text-[#5E6272]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Create New Custom Programme */}
      <div className="w-full px-2 mb-5">
        <div className="bg-[#1C1F26] border border-[#5E6272] rounded-xl px-4 py-4 flex justify-between items-center cursor-pointer">
          <span className="font-semibold text-base text-white">
            Create New Custom Programme
          </span>
          <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold">
            +
          </div>
        </div>
      </div>

      {/* Current Programme Card */}
      <div className="w-full px-2 mb-5">
        <div className="bg-[#2A2D39] rounded-xl px-4 py-4 flex gap-3 items-center">
          <div className="w-6 h-6 bg-white rounded-full relative">
            <div
              className="absolute top-0 left-0 w-full h-full rounded-full border-[3px]"
              style={{
                borderImage:
                  "linear-gradient(270deg, #C393FF 34.57%, #E42A6C 100%) 1",
                borderStyle: "solid",
              }}
            />
          </div>
          <div>
            <p className="font-semibold text-white">Full Body (Current)</p>
            <p className="text-sm text-[#FBA3FF]">5 Days a Week</p>
          </div>
        </div>
      </div>

      {/* Programme Groups with Expand/Collapse */}
      <div className="flex flex-col gap-6 px-2">
        {dummyProgrammes.map((section, idx) => {
          const isOpen = openSections[section.section];
          return (
            <div key={idx}>
              {/* Section Header */}
              <div
                className="flex items-center gap-2 cursor-pointer mb-2"
                onClick={() => toggleSection(section.section)}
              >
                {isOpen ? (
                  <ChevronDown className="text-green-500 w-4 h-4" />
                ) : (
                  <ChevronRight className="text-green-500 w-4 h-4" />
                )}
                <h3 className="text-xs text-[#5E6272] font-semibold tracking-widest uppercase">
                  {section.section}
                </h3>
              </div>

              {/* Programme Cards */}
              {isOpen && (
                <div className="flex flex-col gap-3">
                  {section.programmes.map((prog, i) => (
                    <div
                      key={i}
                      className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer"
                      onClick={() =>
                        navigate(`/editor/${encodeURIComponent(prog.name)}`)
                      }
                    >
                      <CheckCircle className="text-green-500 w-5 h-5" />
                      <div>
                        <p className="font-semibold text-white">{prog.name}</p>
                        <p className="text-sm text-[#00FFAD]">{prog.days}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
