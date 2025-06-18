import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import icon from "../assets/icon_placeholder.png";
import InstallPrompt from "../components/InstallPrompt";
import BottomBar from "../components/BottomBar"; // <-- Import BottomBar

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const navItems = ["overview", "performance"];

  const isActive = (tab: string) => activeTab === tab;

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [firstName, setFirstName] = useState("John");
  const [surname, setSurname] = useState("Doe");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://localhost:4242/api/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setFirstName(data.firstName);
        setSurname(data.surname);
        setMessage(data.message);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Auth error:", err);
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  const handleLogout = () => {
    // Clear the token from localStorage
    localStorage.removeItem("token");

    // Optional: Clear any other user data you might have stored
    localStorage.removeItem("installPromptDismissed");

    // Redirect to login page
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-poppins bg-gradient-to-b from-[#001F3F] to-[#000B1A]">
        Loading your dashboard...
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16" // Added bottom padding for bottom bar space
      style={{
        background:
          "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
      }}
    >
      {/* Responsive full-width logo container, centered */}
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
        <img
          src={logo}
          alt="Logo"
          className="
      w-[84.56px] h-[15px] object-contain
      md:w-[100px] md:h-[18px]
    "
        />
      </div>

      {/* Top Bar: Dashboard + User Image */}
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
        <img
          src={icon}
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover"
        />
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
          {/* Gradient Workout Box */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#FFB8E0] via-[#BE9EFF] via-[#88C0FC] to-[#86FF99] text-black relative">
            <h2 className="text-lg font-semibold">Today's Workout</h2>
            <p className="mt-2 text-sm">Workout will appear here</p>
            <button className="absolute bottom-4 right-4 bg-[#246BFD] text-white px-4 py-2 rounded-full text-sm font-medium shadow-md">
              Start Now
            </button>
          </div>

          {/* Quick Action Boxes */}
          {[
            "Update Bodyweight",
            "New Bench Press PR!",
            "Plan Your Next Programme",
          ].map((title, index) => (
            <div
              key={index}
              className="rounded-xl p-4 flex justify-between items-center shadow-sm text-white"
              style={{ background: "#262A34" }}
            >
              <span className="font-medium">{title}</span>
              <ArrowRight size={20} className="text-white" strokeWidth={1.5} />
            </div>
          ))}
        </div>
      )}

      {activeTab === "performance" && (
        <div className="flex flex-col gap-6 mt-4">
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
                {/* Placeholder content */}
                <p className="text-white text-sm">Content goes here...</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Use the new BottomBar component */}
      <BottomBar onLogout={handleLogout} />

      {/* Install Prompt - positioned as overlay */}
      <InstallPrompt />
    </div>
  );
}
