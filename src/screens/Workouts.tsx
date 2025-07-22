import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import icon from "../assets/icon_placeholder.png";
import BottomBar from "../components/BottomBar";
import { Calendar, ChevronDown, ChevronRight, Clock } from "lucide-react";

export default function Workouts() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("John");
  const [surname, setSurname] = useState("Doe");
  const [loading, setLoading] = useState(true);
  const [workoutsData, setWorkoutsData] = useState<Record<string, any[]>>({});
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

        // For now, we'll simulate workout data
        // In a real app, you'd fetch from: http://localhost:4242/auth/workouts
        const mockWorkouts = [
          {
            id: 1,
            name: "Upper Body Strength",
            date: "2024-07-22",
            duration: 45,
            status: "completed",
            programme: "Push Pull Legs",
          },
          {
            id: 2,
            name: "Lower Body Power",
            date: "2024-07-21",
            duration: 50,
            status: "completed",
            programme: "Push Pull Legs",
          },
          {
            id: 3,
            name: "Cardio Session",
            date: "2024-07-20",
            duration: 30,
            status: "completed",
            programme: "Full Body",
          },
        ];

        // Group by date (you could group by week, month, or programme)
        const grouped: Record<string, any[]> = {};
        mockWorkouts.forEach((workout: any) => {
          const dateKey = new Date(workout.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(workout);
        });

        setWorkoutsData(grouped);

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
        <h2 className="text-white font-semibold text-xl">Workouts</h2>
        <img
          src={icon}
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>

      {/* Start New Workout */}
      <div className="w-full px-2 mb-5 mt-6">
        <div
          className="bg-[#1C1F26] border border-[#5E6272] rounded-xl px-4 py-4 flex justify-between items-center cursor-pointer"
          onClick={() => navigate("/workout/new")}
        >
          <span className="font-semibold text-base text-white">
            Start New Workout
          </span>
          <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold">
            +
          </div>
        </div>
      </div>

      {/* Workout History Sections */}
      <div className="flex flex-col gap-6 px-2">
        {loading ? (
          <div className="text-white">Loading...</div>
        ) : Object.keys(workoutsData).length > 0 ? (
          Object.entries(workoutsData).map(([section, workouts], idx) => {
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
                    {workouts.map((workout: any) => (
                      <div
                        key={workout.id}
                        className="w-full bg-[#1C1F26] border border-[#2F3544] rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer"
                        onClick={() => navigate(`/workout/${workout.id}`)}
                      >
                        <Calendar className="text-green-500 w-5 h-5" />
                        <div className="flex-1">
                          <p className="font-semibold text-white">
                            {workout.name}
                          </p>
                          <p className="text-sm text-[#00FFAD]">
                            {workout.programme} · {workout.duration} min
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[#5E6272]">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">{workout.status}</span>
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
              No workouts yet
            </p>
          </div>
        )}
      </div>

      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
