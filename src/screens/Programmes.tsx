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
  const [loading, setLoading] = useState(true);
  const [programmesData, setProgrammesData] = useState<Record<string, any[]>>(
    {}
  );
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

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
        <h2 className="text-white font-semibold text-xl">Programmes</h2>
        <img
          src={icon}
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>

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
                    {programmes.map((prog: any) => (
                      <div
                        key={prog.id}
                        className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer"
                        onClick={() => navigate(`/editor/${prog.id}`)}
                      >
                        <CheckCircle className="text-green-500 w-5 h-5" />
                        <div>
                          <p className="font-semibold text-white">
                            {prog.name}
                          </p>
                          <p className="text-sm text-[#00FFAD]">
                            {prog.daysPerWeek} days · {prog.weeks} weeks
                          </p>
                        </div>
                      </div>
                    ))}
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
